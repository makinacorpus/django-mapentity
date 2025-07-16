from modeltranslation.translator import TranslationOptions, translator

from test_project.test_app.models import DummyModel, Road


class DummyModelTO(TranslationOptions):
    fields = ("name",)


class RoadModelTO(TranslationOptions):
    fields = ("name",)


translator.register(DummyModel, DummyModelTO)
translator.register(Road, RoadModelTO)
