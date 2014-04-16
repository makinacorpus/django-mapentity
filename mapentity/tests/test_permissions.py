from django.test import TestCase
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

from mapentity.management import create_mapentity_models_permissions
from mapentity import models as mapentity_models
from mapentity import registry

from .models import DummyModel


class ModelPermissionsTest(TestCase):

    def setUp(self):
        registry.registry[DummyModel] = 'foo'
        create_mapentity_models_permissions(None, app=mapentity_models)
        self.ctype = ContentType.objects.get_for_model(DummyModel)

    def tearDown(self):
        del registry.registry[DummyModel]

    def test_model_permissions_were_created(self):
        permissions = Permission.objects.filter(content_type=self.ctype)
        all_codenames = permissions.values_list('codename', flat=True)
        self.assertItemsEqual(all_codenames, [u'add_dummymodel',
                                              u'change_dummymodel',
                                              u'delete_dummymodel',
                                              u'export_dummymodel',
                                              u'read_dummymodel'])
