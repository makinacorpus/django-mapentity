from modeltranslation.translator import TranslationOptions, translator
import reversion
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


# On récupère les vrais champs de base de données générés (ex: name_fr, name_en...)
# et on EXCLUT les champs virtuels non traduits ('name', 'description')
translated_virtual_fields = {'name', 'description'}

concrete_fields = tuple(
    f.name
    for f in DummyModel._meta.concrete_fields
    if f.name not in translated_virtual_fields
)

if reversion.is_registered(DummyModel):
  reversion.unregister(DummyModel)

reversion.register(DummyModel, fields=concrete_fields)