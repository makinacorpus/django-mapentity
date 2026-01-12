from django.db import models
from rest_framework import serializers

from mapentity.serializers import fields
from mapentity.serializers.fields import CommaSeparatedRelatedField


class MapentityDatatableSerializer(serializers.ModelSerializer):
    def build_relational_field(self, field_name, relation_info):
        # ForeignKey
        if not relation_info.to_many:
            return serializers.StringRelatedField, {"read_only": True}

        # ManyToMany
        return CommaSeparatedRelatedField, {"read_only": True}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # patch mapping fields to use datatables format
        mappings = self.serializer_field_mapping.copy()
        mappings.update(
            {
                models.BooleanField: fields.MapentityDatatableBooleanField,
                models.DateTimeField: fields.MapentityDatatableDateTimeField,
                models.DateField: fields.MapentityDatatableDateField,
            }
        )
        self.serializer_field_mapping = mappings
