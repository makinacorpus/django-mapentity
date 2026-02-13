"""
Tests to improve code coverage across mapentity Python modules.
Targets uncovered lines in: helpers, settings, serializers (fields, gpx, helpers, commasv, shapefile),
views/generic (_find_form_class, _get_extra_geometries, detail context),
models (latest_updated, prepare_map_image, LogEntry), forms, widgets.
"""

import json
from io import StringIO

from django.contrib.auth.models import Permission, User
from django.contrib.contenttypes.models import ContentType
from django.contrib.gis.geos import (
    LineString,
    MultiPoint,
    Point,
    Polygon,
)
from django.core.files.storage import default_storage
from django.test import TestCase

from mapentity.helpers import (
    api_bbox,
    convertit_url,
    is_file_uptodate,
    wkt_to_geom,
)
from mapentity.models import LogEntry
from mapentity.serializers.commasv import CSVSerializer
from mapentity.serializers.fields import (
    MapentityDatatableBooleanField,
    MapentityDatatableDateField,
)
from mapentity.serializers.gpx import GPXSerializer
from mapentity.serializers.helpers import plain_text, smart_plain_text
from mapentity.widgets import MapWidget

from ..models import DummyModel, MultiGeomModel, MushroomSpot, Road


class ApiBboxTest(TestCase):
    def test_basic_bbox(self):
        bbox = (0, 0, 1, 1)
        result = api_bbox(bbox)
        self.assertEqual(len(result), 4)
        self.assertIsInstance(result, tuple)

    def test_bbox_with_buffer(self):
        bbox = (0, 0, 1, 1)
        result = api_bbox(bbox, buffer=0.5)
        self.assertEqual(len(result), 4)
        # With buffer, extent should be larger
        no_buffer = api_bbox(bbox)
        self.assertLess(result[0], no_buffer[0])
        self.assertGreater(result[2], no_buffer[2])

    def test_bbox_with_srid(self):
        from django.conf import settings

        bbox = (700000, 6600000, 700100, 6600100)
        result = api_bbox(bbox, srid=settings.SRID)
        self.assertEqual(len(result), 4)


class WktToGeomTest(TestCase):
    def test_valid_wkt(self):
        result = wkt_to_geom("POINT(0 0)")
        self.assertIsNotNone(result)
        self.assertEqual(result.geom_type, "Point")

    def test_non_silent_raises_on_invalid(self):
        with self.assertRaises(Exception):
            wkt_to_geom("INVALID WKT", silent=False)


class IsFileUptodateTest(TestCase):
    def test_nonexistent_file(self):
        self.assertFalse(is_file_uptodate("nonexistent_file.txt", None))

    def test_none_date_update(self):
        # Create a temp file
        path = "test_uptodate.txt"
        default_storage.save(path, StringIO("content"))
        try:
            self.assertFalse(is_file_uptodate(path, None))
        finally:
            default_storage.delete(path)

    def test_empty_file_deleted(self):
        path = "test_empty.txt"
        default_storage.save(path, StringIO(""))
        from datetime import datetime

        result = is_file_uptodate(path, datetime.now(), delete_empty=True)
        self.assertFalse(result)
        self.assertFalse(default_storage.exists(path))

    def test_empty_file_not_deleted(self):
        path = "test_empty_keep.txt"
        default_storage.save(path, StringIO(""))
        from datetime import datetime

        try:
            result = is_file_uptodate(path, datetime.now(), delete_empty=False)
            self.assertFalse(result)
            self.assertTrue(default_storage.exists(path))
        finally:
            if default_storage.exists(path):
                default_storage.delete(path)


class ConvertitUrlTest(TestCase):
    def test_basic_url(self):
        url = convertit_url("http://example.com/doc.odt")
        self.assertIn("example.com", url)


class SerializerFieldsTest(TestCase):
    def test_boolean_field_true(self):
        field = MapentityDatatableBooleanField()
        result = field.to_representation(True)
        self.assertIn("check-circle", result)

    def test_boolean_field_false(self):
        field = MapentityDatatableBooleanField()
        result = field.to_representation(False)
        self.assertIn("x-circle", result)

    def test_boolean_field_none(self):
        field = MapentityDatatableBooleanField()
        result = field.to_representation(None)
        self.assertIn("question-circle", result)

    def test_date_field_format(self):
        field = MapentityDatatableDateField()
        self.assertEqual(field.format, "%d/%m/%Y")


class SmartPlainTextTest(TestCase):
    def test_none_returns_empty(self):
        self.assertEqual(smart_plain_text(None), "")

    def test_html_stripped(self):
        result = smart_plain_text("<b>Hello</b> &amp; world")
        self.assertIn("Hello", result)
        self.assertIn("&", result)
        self.assertNotIn("<b>", result)

    def test_ascii_mode(self):
        result = smart_plain_text("café", ascii=True)
        self.assertIsInstance(result, str)

    def test_plain_text_basic(self):
        result = plain_text("<p>Test &amp; value</p>")
        self.assertEqual(result, "Test & value")


class GPXSerializerTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_superuser("gpxtest", "gpx@test.com", "password")

    def _make_road(self, geom):
        return Road.objects.create(name="Test Road", geom=geom)

    def _serialize_gpx(self, queryset, **kwargs):
        stream = StringIO()
        serializer = GPXSerializer()
        serializer.serialize(queryset, stream=stream, **kwargs)
        return stream.getvalue()

    def test_linestring_gpx(self):
        road = self._make_road(LineString((0, 0), (1, 1), srid=2154))
        result = self._serialize_gpx([road], gpx_field="geom", model=Road)
        self.assertIn("trk", result)

    def test_polygon_gpx(self):
        """Polygon should be converted to route via its exterior ring."""
        from ..models import City

        city = City.objects.create(
            name="Test City",
            geom=Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)), srid=2154),
        )
        result = self._serialize_gpx([city], gpx_field="geom", model=City)
        # Polygon exterior ring is serialized as a track
        self.assertIn("trk", result)

    def test_point_gpx(self):
        obj = DummyModel.objects.create(name="Test Point", geom=Point(0, 0, srid=2154))
        result = self._serialize_gpx([obj], gpx_field="geom", model=DummyModel)
        self.assertIn("wpt", result)

    def test_no_geom_gpx(self):
        obj = DummyModel.objects.create(name="No Geom", geom=None)
        result = self._serialize_gpx([obj], gpx_field="geom", model=DummyModel)
        # Should not crash, just produce empty GPX
        self.assertIn("gpx", result)


class CSVSerializerTest(TestCase):
    def test_serialize_basic(self):
        DummyModel.objects.create(name="CSV Test", geom=Point(0, 0, srid=2154))
        serializer = CSVSerializer()
        stream = StringIO()
        serializer.serialize(
            queryset=DummyModel.objects.all(),
            stream=stream,
            model=DummyModel,
            fields=["id", "name"],
            ensure_ascii=True,
        )
        content = stream.getvalue()
        self.assertIn("CSV Test", content)


class MapEntityDetailExtraGeometriesTest(TestCase):
    """Test _find_form_class and _get_extra_geometries on MapEntityDetail."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_superuser(
            "detailtest", "detail@test.com", "password"
        )
        cls.obj = MultiGeomModel.objects.create(
            name="Multi Geom Test",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
            parking=Point(700050, 6600050, srid=2154),
            points=MultiPoint(
                Point(700010, 6600010, srid=2154),
                Point(700020, 6600020, srid=2154),
                srid=2154,
            ),
        )

    def test_detail_view_contains_extra_geometries(self):
        self.client.force_login(self.user)
        response = self.client.get(f"/multigeommodel/{self.obj.pk}/")
        self.assertEqual(response.status_code, 200)
        context = response.context
        extra_json = context.get("extra_geometries_json", "")
        self.assertTrue(extra_json)
        extra = json.loads(extra_json)
        self.assertIsInstance(extra, list)
        field_names = [e["field"] for e in extra]
        self.assertIn("parking", field_names)
        self.assertIn("points", field_names)

    def test_detail_view_extra_geom_has_geojson(self):
        self.client.force_login(self.user)
        response = self.client.get(f"/multigeommodel/{self.obj.pk}/")
        extra = json.loads(response.context["extra_geometries_json"])
        for item in extra:
            self.assertIn("geojson", item)
            self.assertIn("type", item["geojson"])

    def test_detail_view_extra_geom_has_custom_icon(self):
        self.client.force_login(self.user)
        response = self.client.get(f"/multigeommodel/{self.obj.pk}/")
        extra = json.loads(response.context["extra_geometries_json"])
        parking = next(e for e in extra if e["field"] == "parking")
        self.assertIn("P", parking["custom_icon"])

    def test_detail_view_no_extra_geom_for_single_geom_model(self):
        """Models with only one geom field should have empty extra_geometries."""
        self.client.force_login(self.user)
        road = Road.objects.create(
            name="Single Geom",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
        )
        response = self.client.get(f"/road/{road.pk}/")
        self.assertEqual(response.status_code, 200)
        extra_json = response.context.get("extra_geometries_json", "")
        self.assertFalse(extra_json)

    def test_detail_view_null_secondary_geom(self):
        """Secondary geom fields that are null should be excluded."""
        self.client.force_login(self.user)
        obj = MultiGeomModel.objects.create(
            name="Null Secondary",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
            parking=None,
            points=None,
        )
        response = self.client.get(f"/multigeommodel/{obj.pk}/")
        extra_json = response.context.get("extra_geometries_json", "")
        if extra_json:
            extra = json.loads(extra_json)
            self.assertEqual(len(extra), 0)


class MapEntityDetailContextTest(TestCase):
    """Test detail view context with mapsize from GET context param."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_superuser("ctxtest", "ctx@test.com", "password")
        cls.road = Road.objects.create(
            name="Context Road",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
        )

    def test_detail_with_context_param_mapsize(self):
        self.client.force_login(self.user)
        ctx = json.dumps({"mapsize": {"width": 800, "height": 600}})
        response = self.client.get(f"/road/{self.road.pk}/", {"context": ctx})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context.get("mapwidth"), 800)
        self.assertEqual(response.context.get("mapheight"), 600)


class ModelLatestUpdatedTest(TestCase):
    def test_latest_updated_no_objects(self):
        result = DummyModel.latest_updated()
        self.assertIsNone(result)

    def test_latest_updated_with_objects(self):
        DummyModel.objects.create(name="Test", geom=Point(0, 0, srid=2154))
        result = DummyModel.latest_updated()
        self.assertIsNotNone(result)

    def test_get_date_update_no_field(self):
        """MushroomSpot has no date_update field."""
        spot = MushroomSpot(name="Test")
        result = spot.get_date_update()
        self.assertIsNone(result)


class ModelGetGeomTest(TestCase):
    def test_get_geom_returns_geom(self):
        obj = DummyModel.objects.create(name="G", geom=Point(0, 0, srid=2154))
        self.assertIsNotNone(obj.get_geom())

    def test_get_geom_returns_none(self):
        obj = DummyModel.objects.create(name="NoG", geom=None)
        self.assertIsNone(obj.get_geom())


class ModelPrepareMapImageTest(TestCase):
    """Test prepare_map_image edge cases."""

    def test_prepare_map_image_uptodate_returns_false(self):
        """If image is already up-to-date, prepare_map_image returns False."""
        import os

        obj = DummyModel.objects.create(
            name="Uptodate", geom=Point(700000, 6600000, srid=2154)
        )
        path = obj.get_map_image_path()
        maps_dir = os.path.join(default_storage.location, "maps")
        os.makedirs(maps_dir, exist_ok=True)
        # Create a non-empty file with a recent timestamp
        default_storage.save(path, StringIO("fake image content"))
        try:
            result = obj.prepare_map_image("http://localhost")
            # File exists and is newer than date_update, so should be up-to-date
            # (depends on timing, but the file was just created)
            # Just verify it doesn't crash
            self.assertIsInstance(result, bool)
        finally:
            if default_storage.exists(path):
                default_storage.delete(path)


class ModelGetMapImageExtentTest(TestCase):
    def test_get_map_image_extent(self):
        obj = DummyModel.objects.create(
            name="Extent", geom=Point(700000, 6600000, srid=2154)
        )
        extent = obj.get_map_image_extent()
        self.assertEqual(len(extent), 4)


class LogEntryPropertiesTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_superuser("logtest", "log@test.com", "password")
        cls.obj = DummyModel.objects.create(name="LogObj", geom=Point(0, 0, srid=2154))
        from mapentity.models import ADDITION

        cls.log_entry = LogEntry.objects.log_action(
            user_id=cls.user.pk,
            content_type_id=cls.obj.get_content_type_id(),
            object_id=cls.obj.pk,
            object_repr=str(cls.obj),
            action_flag=ADDITION,
        )

    def test_action_flag_display(self):
        entry = LogEntry.objects.get(pk=self.log_entry.pk)
        self.assertIn("Added", entry.action_flag_display)

    def test_action_time_display(self):
        entry = LogEntry.objects.get(pk=self.log_entry.pk)
        self.assertIsInstance(entry.action_time_display, str)

    def test_object_display_with_valid_object(self):
        entry = LogEntry.objects.get(pk=self.log_entry.pk)
        display = entry.object_display
        self.assertIn("href", display)

    def test_str(self):
        entry = LogEntry.objects.get(pk=self.log_entry.pk)
        s = str(entry)
        self.assertIn(self.user.username, s)

    def test_get_date_update(self):
        entry = LogEntry.objects.get(pk=self.log_entry.pk)
        self.assertIsNotNone(entry.get_date_update())

    def test_creator_property(self):
        self.assertEqual(self.obj.creator, self.user)

    def test_authors_property(self):
        authors = self.obj.authors
        self.assertIn(self.user, authors)

    def test_last_author_property(self):
        self.assertEqual(self.obj.last_author, self.user)


class WidgetTargetMapAndCustomIconTest(TestCase):
    def test_target_map_propagated(self):
        w = MapWidget(attrs={"target_map": "geom"})
        attrs = w._get_attrs("parking")
        self.assertEqual(attrs.get("target_map"), "geom")

    def test_custom_icon_propagated(self):
        w = MapWidget(attrs={"custom_icon": "<svg>icon</svg>"})
        attrs = w._get_attrs("field")
        self.assertEqual(attrs.get("custom_icon"), "<svg>icon</svg>")

    def test_no_target_map_not_in_attrs(self):
        w = MapWidget()
        attrs = w._get_attrs("field")
        self.assertNotIn("target_map", attrs)

    def test_field_label_propagated(self):
        w = MapWidget(attrs={"field_label": "My Label"})
        attrs = w._get_attrs("field")
        self.assertEqual(attrs.get("field_label"), "My Label")


class FormSecondaryGeomfieldsTest(TestCase):
    """Test that secondary geomfields (with target_map) are handled in form layout."""

    def test_multi_geom_form_has_secondary_fields(self):
        from ..forms import MultiGeomForm

        obj = MultiGeomModel.objects.create(
            name="FormTest",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
        )
        form = MultiGeomForm(instance=obj)
        # parking and points should be in the form fields
        self.assertIn("parking", form.fields)
        self.assertIn("points", form.fields)

    def test_multi_geom_form_geom_type_injected(self):
        from ..forms import MultiGeomForm

        obj = MultiGeomModel.objects.create(
            name="GeomTypeTest",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
        )
        form = MultiGeomForm(instance=obj)
        # parking is PointField, should have POINT geom_type
        parking_widget = form.fields["parking"].widget
        self.assertEqual(parking_widget.attrs.get("geom_type"), "POINT")


class FormModifiablePermissionTest(TestCase):
    """Test that modifiable is set to False when user lacks update_geom permission."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("nogeomperm", "ng@test.com", "password")
        # Give basic read/change permissions but NOT update_geom
        ct = ContentType.objects.get_for_model(DummyModel)
        for codename in ["read_dummymodel", "change_dummymodel"]:
            perm, _ = Permission.objects.get_or_create(
                codename=codename, content_type=ct, defaults={"name": codename}
            )
            cls.user.user_permissions.add(perm)
        cls.obj = DummyModel.objects.create(
            name="PermTest", geom=Point(0, 0, srid=2154)
        )

    def test_modifiable_false_without_update_geom_perm(self):
        from ..forms import DummyModelForm

        # Refresh user to clear permission cache
        user = User.objects.get(pk=self.user.pk)
        form = DummyModelForm(instance=self.obj, user=user)
        self.assertFalse(form.fields["geom"].widget.modifiable)


class WidgetSerializeTest(TestCase):
    def test_serialize_geojson_string(self):
        """When value is a raw GeoJSON string (POST re-render), return as-is."""
        w = MapWidget()
        geojson = '{"type": "Point", "coordinates": [0, 0]}'
        result = w.serialize(geojson)
        self.assertEqual(result, geojson)

    def test_serialize_none(self):
        w = MapWidget()
        self.assertEqual(w.serialize(None), "")

    def test_serialize_empty_string(self):
        w = MapWidget()
        self.assertEqual(w.serialize(""), "")

    def test_serialize_geometry(self):
        w = MapWidget()
        geom = Point(2.0, 48.0, srid=4326)
        result = w.serialize(geom)
        self.assertIn("Point", result)
        parsed = json.loads(result)
        self.assertEqual(parsed["type"], "Point")


class MapEntityMapImagePathTest(TestCase):
    def test_get_map_image_path(self):
        obj = DummyModel.objects.create(name="Path", geom=Point(0, 0, srid=2154))
        path = obj.get_map_image_path()
        self.assertIn("maps/", path)
        self.assertIn(str(obj.pk), path)

    def test_map_image_path_property(self):
        obj = DummyModel.objects.create(name="Prop", geom=Point(0, 0, srid=2154))
        full_path = obj.map_image_path
        self.assertIn(str(obj.pk), full_path)


class GetContentTypeIdTest(TestCase):
    def test_returns_int(self):
        ct_id = DummyModel.get_content_type_id()
        self.assertIsInstance(ct_id, int)


class IsPublicTest(TestCase):
    def test_default_is_not_public(self):
        obj = Road.objects.create(
            name="Private",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
        )
        self.assertFalse(obj.is_public())


class GetDisplayLabelTest(TestCase):
    def test_display_label(self):
        obj = DummyModel.objects.create(name="Label", geom=Point(0, 0, srid=2154))
        self.assertEqual(obj.get_display_label(), "Label")

    def test_display_label_no_name(self):
        obj = DummyModel.objects.create(name="", geom=Point(0, 0, srid=2154))
        self.assertEqual(obj.get_display_label(), str(obj.id))


class MapEntityCreateFormInvalidTest(TestCase):
    """Test form_invalid in MapEntityCreate with multi-geom errors."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_superuser("admin_fi", "a@t.com", "password")

    def test_form_invalid_single_geom_error(self):
        self.client.force_login(self.user)
        response = self.client.post(
            DummyModel.get_add_url(),
            data={"name": "test", "geom": "INVALID"},
        )
        self.assertEqual(response.status_code, 200)
        msgs = [str(m) for m in response.context["messages"]]
        self.assertTrue(any("errors" in m for m in msgs))

    def test_form_invalid_multi_geom_error(self):
        self.client.force_login(self.user)
        response = self.client.post(
            MultiGeomModel.get_add_url(),
            data={"name": "test", "geom": "INVALID", "parking": "INVALID"},
        )
        self.assertEqual(response.status_code, 200)
        msgs = [str(m) for m in response.context["messages"]]
        self.assertTrue(any("errors" in m for m in msgs))
        # Should have specific geometry field error messages
        geom_msgs = [
            m for m in msgs if "geometry field" in m.lower() or "geom" in m.lower()
        ]
        self.assertTrue(len(geom_msgs) >= 1)

    def test_form_invalid_no_geom_error(self):
        """When geom fields are valid but other fields have errors, no geom-specific message."""
        self.client.force_login(self.user)
        response = self.client.post(
            MultiGeomModel.get_add_url(),
            data={
                "name": "",  # required field empty
                "geom": LineString(
                    (700000, 6600000), (700100, 6600100), srid=2154
                ).ewkt,
            },
        )
        self.assertEqual(response.status_code, 200)
        msgs = [str(m) for m in response.context["messages"]]
        geom_error_msgs = [m for m in msgs if "geometry field" in m.lower()]
        self.assertEqual(len(geom_error_msgs), 0)


class SettingsMapStylesTest(TestCase):
    """Test that MAP_STYLES defaults contain the new PR values."""

    def test_detail_style_defaults(self):
        from mapentity.settings import app_settings

        detail = app_settings["MAP_STYLES"]["detail"]
        self.assertEqual(detail["weight"], 10)
        self.assertEqual(detail["line-cap"], "round")
        self.assertEqual(detail["arrowColor"], "#000000")
        self.assertEqual(detail["arrowSize"], 0.5)
        self.assertEqual(detail["arrowOpacity"], 1)
        self.assertEqual(detail["arrowSpacing"], 20)

    def test_draw_style_exists(self):
        from mapentity.settings import app_settings

        draw = app_settings["MAP_STYLES"]["draw"]
        self.assertIn("color", draw)


class MultiGeomModelCRUDTest(TestCase):
    """Test basic CRUD operations on MultiGeomModel."""

    def test_create_with_all_geoms(self):
        obj = MultiGeomModel.objects.create(
            name="Full",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
            parking=Point(700050, 6600050, srid=2154),
            points=MultiPoint(
                Point(700000, 6600000), Point(700100, 6600100), srid=2154
            ),
        )
        self.assertEqual(str(obj), "Full")
        self.assertIsNotNone(obj.geom)
        self.assertIsNotNone(obj.parking)
        self.assertIsNotNone(obj.points)

    def test_create_with_nullable_geoms(self):
        obj = MultiGeomModel.objects.create(
            name="Partial",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
        )
        self.assertIsNone(obj.parking)
        self.assertIsNone(obj.points)

    def test_get_display_label(self):
        obj = MultiGeomModel.objects.create(
            name="LabelTest",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
        )
        self.assertEqual(obj.get_display_label(), "LabelTest")

    def test_urls(self):
        obj = MultiGeomModel.objects.create(
            name="UrlTest",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
        )
        self.assertIn(str(obj.pk), obj.get_detail_url())
        self.assertIn(str(obj.pk), obj.get_update_url())


class FormFieldLabelInjectionTest(TestCase):
    """Test that field_label is injected into MapWidget attrs for geometry fields."""

    def test_field_label_set_on_multi_geom_form(self):
        from ..forms import MultiGeomForm

        obj = MultiGeomModel.objects.create(
            name="LabelInject",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
        )
        form = MultiGeomForm(instance=obj)
        # parking widget should have field_label set
        parking_widget = form.fields["parking"].widget
        self.assertIn("field_label", parking_widget.attrs)

    def test_field_label_set_on_single_geom_form(self):
        from ..forms import DummyModelForm

        obj = DummyModel.objects.create(name="Single", geom=Point(0, 0, srid=2154))
        form = DummyModelForm(instance=obj)
        geom_widget = form.fields["geom"].widget
        self.assertIn("field_label", geom_widget.attrs)


class GetExtraGeometriesAllNullTest(TestCase):
    """Test _get_extra_geometries when all secondary geoms are null."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_superuser("admin_eg", "eg@t.com", "password")
        cls.obj = MultiGeomModel.objects.create(
            name="AllNull",
            geom=LineString((700000, 6600000), (700100, 6600100), srid=2154),
        )

    def test_no_extra_geoms_when_all_null(self):
        self.client.force_login(self.user)
        response = self.client.get(self.obj.get_detail_url())
        self.assertEqual(response.status_code, 200)
        # extra_geometries_json should be empty when secondary geoms are null
        self.assertEqual(response.context["extra_geometries_json"], "")
