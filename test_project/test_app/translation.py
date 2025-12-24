from modeltranslation.translator import TranslationOptions, translator

from test_project.test_app.models import DummyModel, GeoPoint, Road


class DummyModelTO(TranslationOptions):
    fields = ("name",)


class RoadModelTO(TranslationOptions):
    fields = ("name",)


class GeoPointModelTO(TranslationOptions):
    fields = ("name", "public")


translator.register(DummyModel, DummyModelTO)
translator.register(Road, RoadModelTO)
translator.register(GeoPoint, GeoPointModelTO)
