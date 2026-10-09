from modeltranslation.translator import TranslationOptions, translator

from .models import ComplexModel, DummyModel, Road


class DummyModelTO(TranslationOptions):
    fields = ("name",)


class RoadModelTO(TranslationOptions):
    fields = ("name",)


class MushroomSpotTO(TranslationOptions):
    fields = ("name",)


class CityTO(TranslationOptions):
    fields = ("name",)


class ComplexModelModelTO(TranslationOptions):
    fields = ("name", "public")


translator.register(DummyModel, DummyModelTO)
translator.register(Road, RoadModelTO)
translator.register(ComplexModel, ComplexModelModelTO)
