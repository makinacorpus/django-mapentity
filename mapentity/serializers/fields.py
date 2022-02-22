from rest_framework import serializers


class MapentityDateTimeField(serializers.DateTimeField):
    def __init__(self, format="%d/%m/%Y %H:%M:%S", input_formats=None, default_timezone=None, **kwargs):
        """ Set default format """
        super().__init__(format=format, input_formats=input_formats, default_timezone=default_timezone, **kwargs)


class MapentityBooleanField(serializers.BooleanField):
    """ Set default format """
    def to_representation(self, value):
        if value:
            return '<i class="bi bi-check-circle text-success"></i>'
        elif value is False:
            return '<i class="bi bi-x-circle text-danger"></i>'
        else:
            return '<i class="bi bi-question-circle"></i>'
