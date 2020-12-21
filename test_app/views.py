from mapentity import views as mapentity_views

from .models import DummyModel, ComplexModel, Event


class DummyList(mapentity_views.MapEntityList):
    model = DummyModel


class DummyLayer(mapentity_views.MapEntityLayer):
    model = DummyModel


class DummyJsonList(mapentity_views.MapEntityJsonList, DummyList):
    pass


class DummyFormat(mapentity_views.MapEntityFormat):
    model = DummyModel


class DummyDocumentOdt(mapentity_views.MapEntityDocumentOdt):
    model = DummyModel


class DummyDocumentWeasyprint(mapentity_views.MapEntityDocumentWeasyprint):
    model = DummyModel


class DummyDocumentPublicWeasyprint(mapentity_views.MapEntityDocumentWeasyprint):
    model = DummyModel


class DummyDetail(mapentity_views.MapEntityDetail):
    model = DummyModel


class DummyCreate(mapentity_views.MapEntityCreate):
    model = DummyModel


class DummyUpdate(mapentity_views.MapEntityUpdate):
    model = DummyModel


class DummyDelete(mapentity_views.MapEntityDelete):
    model = DummyModel


class ComplexList(mapentity_views.MapEntityList):
    model = ComplexModel


class ComplexLayer(mapentity_views.MapEntityLayer):
    model = ComplexModel


class ComplexJsonList(mapentity_views.MapEntityJsonList, ComplexList):
    pass


class ComplexFormat(mapentity_views.MapEntityFormat):
    model = ComplexModel


class ComplexDocumentOdt(mapentity_views.MapEntityDocumentOdt):
    model = ComplexModel


class ComplexDocumentWeasyprint(mapentity_views.MapEntityDocumentWeasyprint):
    model = ComplexModel


class ComplexDocumentPublicWeasyprint(mapentity_views.MapEntityDocumentWeasyprint):
    model = ComplexModel


class ComplexDetail(mapentity_views.MapEntityDetail):
    model = ComplexModel


class ComplexCreate(mapentity_views.MapEntityCreate):
    model = ComplexModel


class ComplexUpdate(mapentity_views.MapEntityUpdate):
    model = ComplexModel


class ComplexDelete(mapentity_views.MapEntityDelete):
    model = ComplexModel


class EventList(mapentity_views.MapEntityList):
    model = Event


class EventLayer(mapentity_views.MapEntityLayer):
    model = Event


class EventJsonList(mapentity_views.MapEntityJsonList, EventList):
    pass


class EventFormat(mapentity_views.MapEntityFormat):
    model = Event


class EventDocumentOdt(mapentity_views.MapEntityDocumentOdt):
    model = Event


class EventDocumentWeasyprint(mapentity_views.MapEntityDocumentWeasyprint):
    model = Event


class EventDocumentPublicWeasyprint(mapentity_views.MapEntityDocumentWeasyprint):
    model = Event


class EventDetail(mapentity_views.MapEntityDetail):
    model = Event


class EventCreate(mapentity_views.MapEntityCreate):
    model = Event


class EventUpdate(mapentity_views.MapEntityUpdate):
    model = Event


class EventDelete(mapentity_views.MapEntityDelete):
    model = Event
