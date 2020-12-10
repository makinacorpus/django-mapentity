import factory
from factory.django import DjangoModelFactory
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.gis.geos import Point, LineString, Polygon
from test_app import models as test_models
from mapentity.factories import UserFactory


def get_dummy_uploaded_file(name='file.pdf'):
    return SimpleUploadedFile(name, b'*' * 300, content_type='application/pdf')


class FileTypeFactory(factory.django.DjangoModelFactory):

    class Meta:
        model = test_models.FileType


class AttachmentFactory(DjangoModelFactory):
    """
    Create an attachment. You must provide an 'obj' keywords,
    the object (saved in db) to which the attachment will be bound.
    """

    class Meta:
        model = test_models.Attachment

    attachment_file = get_dummy_uploaded_file()
    filetype = factory.SubFactory(FileTypeFactory)

    creator = factory.SubFactory(UserFactory)
    title = factory.Sequence(u"Title {0}".format)
    legend = factory.Sequence(u"Legend {0}".format)


class DummyModelFactory(DjangoModelFactory):
    class Meta:
        model = test_models.DummyModel

    name = "Dummy object"
    geom = 'POINT(0 0)'
    public = True


class PathFactory(DjangoModelFactory):
    class Meta:
        model = test_models.Path

    geom = LineString(Point(700000, 6600000), Point(700100, 6600100))


class AnyGeomModelFactory(DjangoModelFactory):
    class Meta:
        model = test_models.AnyGeomModel

    name = "Mushroom spot"
    geom = 'POINT(0 0)'


class TagFactory(DjangoModelFactory):
    class Meta:
        model = test_models.Tag

    label = "Easy"


class ThemeFactory(DjangoModelFactory):
    class Meta:
        model = test_models.Theme

    label = "Forest"


class MushroomSpotFactory(DjangoModelFactory):
    class Meta:
        model = test_models.MushroomSpot

    name = "Mushroom spot"
    geom = 'POINT(0 0)'

    @factory.post_generation
    def tags(obj, create, extracted=None, **kwargs):
        if create:
            obj.tags.add(TagFactory.create().pk)


class EventFactory(DjangoModelFactory):
    class Meta:
        model = test_models.Event

    name = "Touristic event"
    geom = 'POINT(0 0)'
    public = True
    begin_date = '2002-02-20'
    end_date = '2202-02-22'


class CityFactory(DjangoModelFactory):
    class Meta:
        model = test_models.City

    code = factory.Sequence(lambda n: "#%s" % n)  # id (!) with max_length=6
    name = factory.Sequence(lambda n: "City name %s" % n)
    geom = factory.Sequence(lambda _: MultiPolygon(Polygon.from_bbox(next(geom_city_iter)), srid=settings.SRID))
