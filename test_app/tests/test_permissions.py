from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.test import TestCase

from mapentity.helpers import user_has_perm
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
                "read_dummymodel",
                "view_dummymodel",
            ],
            all_codenames,
        )

    def test_internal_user_has_necessary_permissions(self):
        internal_user = get_internal_user()
        all_codenames = internal_user.user_permissions.all().values_list(
            "codename", flat=True
        )
        self.assertTrue("read_dummymodel" in all_codenames)
        self.assertTrue("export_dummymodel" in all_codenames)
        self.assertTrue("read_attachment" in all_codenames)

    def test_internal_user_permissions_work_as_others(self):
        internal_user = get_internal_user()
        self.assertTrue(user_has_perm(internal_user, "test_app.read_dummymodel"))


class NavBarPermissionsTest(TestCase):
    def setUp(self):
        call_command("update_permissions_mapentity")

    def test_navbar_permissions(self):
        user = UserFactory()
        user.user_permissions.add(Permission.objects.get(codename="read_dummymodel"))
        self.client.force_login(user)
        response = self.client.get("/dummymodel/list/")
        self.assertContains(response, 'href="/dummymodel/add/"')
        self.assertContains(response, 'href="/dummymodel/list/"')
        self.assertNotContains(response, 'href="/mushroomspot/add/"')
        self.assertNotContains(response, 'href="/mushroomspot/list/"')
