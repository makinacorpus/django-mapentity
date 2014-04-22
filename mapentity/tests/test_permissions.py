from django.test import TestCase
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

from mapentity.management import create_mapentity_models_permissions
from mapentity.middleware import get_internal_user

from .models import DummyModel


class ModelPermissionsTest(TestCase):

    def setUp(self):
        create_mapentity_models_permissions(None, model=DummyModel)
        self.ctype = ContentType.objects.get_for_model(DummyModel)

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
        self.assertItemsEqual(all_codenames, [u'read_dummymodel',
                                              u'export_dummymodel',
                                              u'read_attachment'])
