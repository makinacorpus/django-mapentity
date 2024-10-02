from rest_framework import serializers


class MapentityDatatableDateTimeField(serializers.DateTimeField):
    def __init__(self, *args, **kwargs):
        """ Set default format """
        kwargs.update({'format': "%d/%m/%Y %H:%M:%S"})
        super().__init__(*args, **kwargs)


class MapentityDatatableDateField(serializers.DateField):
    def __init__(self, *args, **kwargs):
        """ Set default format """
        kwargs.update({'format': "%d/%m/%Y"})
        super().__init__(*args, **kwargs)


class MapentityDatatableBooleanField(serializers.BooleanField):
    """ Set default format """
    def to_representation(self, value):
        if value:
            return '<i class="bi bi-check-circle text-success"></i>'
        elif value is False:
            return '<i class="bi bi-x-circle text-danger"></i>'
        else:
            return '<i class="bi bi-question-circle"></i>'
