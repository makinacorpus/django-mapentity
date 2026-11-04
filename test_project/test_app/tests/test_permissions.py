from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase

from mapentity.helpers import user_has_perm
from mapentity.registry import migrate_permissions_to_view
from mapentity.tests.factories import UserFactory
from mapentity.utils import get_internal_user

from ..models import DummyModel


class ModelPermissionsTest(TestCase):
    def setUp(self):
        self.ctype = ContentType.objects.get_for_model(DummyModel)

        call_command("update_permissions_mapentity")

    def test_model_permissions_were_created(self):
        permissions = Permission.objects.filter(content_type=self.ctype)
        all_codenames = permissions.values_list("codename", flat=True)
        self.assertListEqual(
            sorted(list(all_codenames)),
            [
                "add_dummymodel",
                "change_dummymodel",
                "change_geom_dummymodel",
                "delete_dummymodel",
                "export_dummymodel",
                "publish_dummymodel",
                "view_dummymodel",
            ],
            all_codenames,
        )

    def test_internal_user_has_necessary_permissions(self):
        internal_user = get_internal_user()
        all_codenames = internal_user.user_permissions.all().values_list(
            "codename", flat=True
        )
        self.assertTrue("view_dummymodel" in all_codenames)
        self.assertTrue("export_dummymodel" in all_codenames)
        self.assertTrue("read_attachment" in all_codenames)

    def test_internal_user_permissions_work_as_others(self):
        internal_user = get_internal_user()
        self.assertTrue(user_has_perm(internal_user, "test_app.view_dummymodel"))


class NavBarPermissionsTest(TestCase):
    def setUp(self):
        call_command("update_permissions_mapentity")

    def test_navbar_permissions(self):
        user = UserFactory()
        user.user_permissions.add(Permission.objects.get(codename="view_dummymodel"))
        self.client.force_login(user)
        response = self.client.get("/dummymodel/list/")
        self.assertContains(response, 'href="/dummymodel/add/"')
        self.assertContains(response, 'href="/dummymodel/list/"')
        self.assertNotContains(response, 'href="/mushroomspot/add/"')
        self.assertNotContains(response, 'href="/mushroomspot/list/"')


class MigratePermissionsTest(TestCase):
    def setUp(self):
        call_command("update_permissions_mapentity")
        self.ctype = ContentType.objects.get_for_model(DummyModel)

    def test_migrate_permissions_to_view_reassigns_users_and_groups_and_deletes_read(
        self,
    ):
        # Create a legacy read permission for DummyModel
        read_perm, _ = Permission.objects.get_or_create(
            codename="read_dummymodel",
            content_type=self.ctype,
            defaults={"name": "Can read dummy model"},
        )
        view_perm = Permission.objects.get(
            codename="view_dummymodel", content_type=self.ctype
        )

        user = UserFactory()
        user.user_permissions.add(read_perm)

        group = Group.objects.create(name="Inspectors")
        group.permissions.add(read_perm)

        self.assertTrue(user.has_perm("test_app.read_dummymodel"))
        self.assertFalse(user.has_perm("test_app.view_dummymodel"))
        self.assertIn(read_perm, group.permissions.all())
        self.assertNotIn(view_perm, group.permissions.all())

        # Run migration function
        migrate_permissions_to_view()

        # Refresh from database
        user = UserFactory._meta.model.objects.get(pk=user.pk)
        group.refresh_from_db()

        # Legacy permission deleted
        self.assertFalse(
            Permission.objects.filter(
                codename="read_dummymodel", content_type=self.ctype
            ).exists()
        )

        # User and group now have view permission
        self.assertFalse(user.has_perm("test_app.read_dummymodel"))
        self.assertTrue(user.has_perm("test_app.view_dummymodel"))
        self.assertIn(view_perm, group.permissions.all())

    def test_migrate_permissions_keeps_non_mapentity_read_permissions(self):
        # read_attachment should remain untouched
        self.assertTrue(Permission.objects.filter(codename="read_attachment").exists())
        migrate_permissions_to_view()
        self.assertTrue(Permission.objects.filter(codename="read_attachment").exists())

    def test_migration_0003_forward_and_backward(self):
        executor = MigrationExecutor(connection)
        # Migrate forward to 0003
        executor.migrate([("mapentity", "0003_replace_read_permissions_with_view")])

        # Create a read permission and associate to user and group
        read_perm, _ = Permission.objects.get_or_create(
            codename="read_dummymodel",
            content_type=self.ctype,
            defaults={"name": "Can read dummy model"},
        )
        view_perm = Permission.objects.get(
            codename="view_dummymodel", content_type=self.ctype
        )
        user = UserFactory()
        user.user_permissions.add(read_perm)
        group = Group.objects.create(name="MigGroup")
        group.permissions.add(read_perm)

        # Re-run migration forward
        from importlib import import_module

        mig_0003 = import_module(
            "mapentity.migrations.0003_replace_read_permissions_with_view"
        )
        replace_read_permissions_with_view = mig_0003.replace_read_permissions_with_view
        reverse_replace_read_permissions_with_view = (
            mig_0003.reverse_replace_read_permissions_with_view
        )

        class FakeSchemaEditor:
            connection = connection

        replace_read_permissions_with_view(
            executor.loader.project_state().apps, FakeSchemaEditor()
        )

        user = UserFactory._meta.model.objects.get(pk=user.pk)
        self.assertFalse(
            Permission.objects.filter(
                codename="read_dummymodel", content_type=self.ctype
            ).exists()
        )
        self.assertTrue(user.has_perm("test_app.view_dummymodel"))
        self.assertIn(view_perm, group.permissions.all())

        # Test backward
        reverse_replace_read_permissions_with_view(
            executor.loader.project_state().apps, FakeSchemaEditor()
        )
        self.assertTrue(
            Permission.objects.filter(
                codename="read_dummymodel", content_type=self.ctype
            ).exists()
        )
        read_perm = Permission.objects.get(
            codename="read_dummymodel", content_type=self.ctype
        )
        user = UserFactory._meta.model.objects.get(pk=user.pk)
        self.assertTrue(user.has_perm("test_app.read_dummymodel"))
        self.assertIn(read_perm, user.user_permissions.all())
        self.assertIn(read_perm, group.permissions.all())
