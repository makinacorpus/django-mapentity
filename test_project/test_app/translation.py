from modeltranslation.translator import TranslationOptions, translator

from .models import DummyAptModel, DummyModel, GeoPoint, Road


class DummyModelTO(TranslationOptions):
    fields = ("name",)


class RoadModelTO(TranslationOptions):
    fields = ("name",)


class DummyAptModelTO(TranslationOptions):
    fields = ("name",)


class MushroomSpotTO(TranslationOptions):
    fields = ("name",)


class CityTO(TranslationOptions):
    fields = ("name",)


class GeoPointModelTO(TranslationOptions):
    fields = ("name", "public")


translator.register(DummyModel, DummyModelTO)
translator.register(Road, RoadModelTO)
translator.register(DummyAptModel, DummyAptModelTO)
translator.register(GeoPoint, GeoPointModelTO)
# translator.register(City, CityTO)
