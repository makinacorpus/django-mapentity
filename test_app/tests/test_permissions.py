from django.core.management import call_command
from django.test import TransactionTestCase
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

from mapentity.middleware import get_internal_user
from mapentity.helpers import user_has_perm
from mapentity.factories import UserFactory

from ..models import DummyModel


class ModelPermissionsTest(TransactionTestCase):

    def setUp(self):
        self.ctype = ContentType.objects.get_for_model(DummyModel)

        call_command('update_permissions')

    def test_model_permissions_were_created(self):
        permissions = Permission.objects.filter(content_type=self.ctype)
        all_codenames = permissions.values_list('codename', flat=True)
        self.assertItemsEqual(all_codenames, [u'add_dummymodel',
                                              u'change_dummymodel',
                                              u'delete_dummymodel',
                                              u'export_dummymodel',
                                              u'read_dummymodel'])

    def test_internal_user_has_necessary_permissions(self):
        internal_user = get_internal_user()
        all_codenames = internal_user.user_permissions.all().values_list('codename', flat=True)
        self.assertTrue(u'read_dummymodel' in all_codenames)
        self.assertTrue(u'export_dummymodel' in all_codenames)
        self.assertTrue(u'read_attachment' in all_codenames)

    def test_internal_user_permissions_work_as_others(self):
        internal_user = get_internal_user()
        self.assertTrue(user_has_perm(internal_user, 'test_app.read_dummymodel'))


class NavBarPermissionsTest(TransactionTestCase):
    def setUp(self):
        call_command('update_permissions')

    def test_navbar_permissions(self):
        user = UserFactory.create(password='booh')
        user.user_permissions.add(Permission.objects.get(codename='read_dummymodel'))
        self.client.login(username=user.username, password='booh')
        response = self.client.get('/dummymodel/list/')
        self.assertContains(response, 'href="/dummymodel/add/">+</a>')
        self.assertContains(response, '<a href="/dummymodel/list/" title="')
        self.assertNotContains(response, 'href="/mushroomspot/add/">+</a>')
        self.assertNotContains(response, '<a href="/mushroomspot/list/" title="')
