from django.test import TestCase
from rest_framework.serializers import ModelSerializer
from rest_framework.test import APIRequestFactory

from mapentity.serializers.datatables import MapentityDatatableSerializer
from mapentity.views.api import MapEntityViewSet
from test_project.test_app.models import DummyModel
from test_project.test_app.tests.factories import DummyModelFactory


class MapEntityViewSetQuerysetPropertyTestCase(TestCase):
    def test_queryset_property_returns_all_objects(self):
        """The queryset property should return model.objects.all()"""
        DummyModelFactory.create()
        DummyModelFactory.create()

        viewset = MapEntityViewSet()
        viewset.model = DummyModel
        qs = viewset.queryset
        self.assertEqual(qs.count(), 2)
        self.assertEqual(list(qs), list(DummyModel.objects.all()))


class DatatablesSerializerFieldMergingTestCase(TestCase):
    def test_fields_all_stays_all(self):
        """When serializer uses fields='__all__', DatatablesSerializer should keep '__all__'"""

        class AllFieldsSerializer(ModelSerializer):
            class Meta:
                model = DummyModel
                fields = "__all__"

        viewset = MapEntityViewSet()
        viewset.model = DummyModel
        viewset.serializer_class = AllFieldsSerializer

        factory = APIRequestFactory()
        request = factory.get("/", HTTP_ACCEPT="application/json", format="datatables")
        viewset.request = request
        viewset.format_kwarg = "datatables"

        serializer_class = viewset.get_serializer_class()
        self.assertEqual(serializer_class.Meta.fields, "__all__")

    def test_explicit_fields_are_merged(self):
        """When serializer uses explicit fields, they should be merged with MapentityDatatableSerializer fields"""

        class ExplicitFieldsSerializer(ModelSerializer):
            class Meta:
                model = DummyModel
                fields = ["id", "name"]

        viewset = MapEntityViewSet()
        viewset.model = DummyModel
        viewset.serializer_class = ExplicitFieldsSerializer

        factory = APIRequestFactory()
        request = factory.get("/", HTTP_ACCEPT="application/json", format="datatables")
        viewset.request = request
        viewset.format_kwarg = "datatables"

        serializer_class = viewset.get_serializer_class()
        # Should contain both MapentityDatatableSerializer fields and explicit fields
        for field in MapentityDatatableSerializer.Meta.fields:
            self.assertIn(field, serializer_class.Meta.fields)
        self.assertIn("name", serializer_class.Meta.fields)

    def test_no_duplicate_fields(self):
        """Merged fields should not contain duplicates"""
        datatable_fields = MapentityDatatableSerializer.Meta.fields

        class OverlappingSerializer(ModelSerializer):
            class Meta:
                model = DummyModel
                fields = ["id"] + list(datatable_fields)

        viewset = MapEntityViewSet()
        viewset.model = DummyModel
        viewset.serializer_class = OverlappingSerializer

        factory = APIRequestFactory()
        request = factory.get("/", HTTP_ACCEPT="application/json", format="datatables")
        viewset.request = request
        viewset.format_kwarg = "datatables"

        serializer_class = viewset.get_serializer_class()
        # No duplicates
        self.assertEqual(
            len(serializer_class.Meta.fields), len(set(serializer_class.Meta.fields))
        )


class FilterInfosResponseTestCase(TestCase):
    def test_filter_infos_has_no_attributes_key(self):
        """filter_infos response should not contain 'attributes' key"""
        from django.contrib.auth.models import User

        user = User.objects.create_superuser("testadmin", "test@test.com", "testadmin")
        self.client.force_login(user)
        DummyModelFactory.create()

        response = self.client.get("/api/dummymodel/drf/dummymodels/filter_infos.json")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # Response may be wrapped in a 'data' key by DRF datatables
        self.assertIn("pk_list", data)
        self.assertIn("count", data)
        self.assertNotIn("attributes", data)
