from modeltranslation.translator import TranslationOptions, translator

from test_app.models import DummyModel, Road, DummyAptModel, City


class DummyModelTO(TranslationOptions):
    fields = ('name', )


class RoadModelTO(TranslationOptions):
    fields = ('name', )

class DummyAptModelTO(TranslationOptions):
    fields = ('name', )

class MushroomSpotTO(TranslationOptions):
    fields = ('name', )

class CityTO(TranslationOptions):
    fields = ('name', )


translator.register(DummyModel, DummyModelTO)
translator.register(Road, RoadModelTO)
translator.register(DummyAptModel, DummyAptModelTO)
# translator.register(City, CityTO)

