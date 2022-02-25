from django.db import models
from rest_framework.serializers import ModelSerializer

from mapentity.serializers import fields


class MapentityModelSerializer(ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # patch mapping fields to use datatables format
        self.serializer_field_mapping.update({
            models.BooleanField: fields.MapentityBooleanField,
            models.DateTimeField: fields.MapentityDateTimeField,
        })
