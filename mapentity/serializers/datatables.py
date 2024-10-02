from django.db import models
from rest_framework.serializers import ModelSerializer

from mapentity.serializers import fields


class MapentityDatatableSerializer(ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # patch mapping fields to use datatables format
        mappings = self.serializer_field_mapping.copy()
        mappings.update({
            models.BooleanField: fields.MapentityDatatableBooleanField,
            models.DateTimeField: fields.MapentityDatatableDateTimeField,
            models.DateField: fields.MapentityDatatableDateField,
        })
        self.serializer_field_mapping = mappings
