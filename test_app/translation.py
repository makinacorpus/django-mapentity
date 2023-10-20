from modeltranslation.translator import TranslationOptions, translator

from test_app.models import Road


class RoadTO(TranslationOptions):
    fields = ('name', )


translator.register(Road, RoadTO)
