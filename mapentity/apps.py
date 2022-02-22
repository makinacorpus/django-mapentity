from django.apps import AppConfig

from mapentity.serializers.fields import MapentityBooleanField


class MapEntityConfig(AppConfig):
    name = "mapentity"

    def ready(self):
        """
        update Mapentity serializer mappings
        """
        from django.db import models
        from rest_framework.serializers import ModelSerializer

        from .serializers.fields import MapentityDateTimeField

        try:
            # drf 3.0
            field_mapping = ModelSerializer._field_mapping.mapping
        except AttributeError:
            # drf 3.1
            field_mapping = ModelSerializer.serializer_field_mapping

        # map GeoDjango fields to drf-gis GeometryField
        field_mapping.update(
            {
                models.DateTimeField: MapentityDateTimeField,
                models.BooleanField: MapentityBooleanField,
            }
        )
