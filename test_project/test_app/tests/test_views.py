import json
import os
from unittest import mock, skip

import django
import factory
from bs4 import BeautifulSoup
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import RequestFactory, TestCase
from django.test.utils import override_settings
from django.urls import reverse
from django.utils.encoding import force_str
from django.utils.translation import get_language
from faker import Faker
from faker.providers import geo
from freezegun import freeze_time

from mapentity.models import LogEntry
from mapentity.registry import app_settings
from mapentity.tests import MapEntityLiveTest, MapEntityTest
from mapentity.tests.factories import AttachmentFactory, SuperUserFactory, UserFactory
from mapentity.views import Convert, JSSettings, ServeAttachment

from ..models import City, DummyModel, FileType, GeoPoint, Supermarket
from ..views import (
    DummyDetail,
    DummyList,
    DummyModelFilter,
    GeoPointMultiDelete,
    GeoPointMultiUpdate,
    RoadList,
)
from .factories import DummyModelFactory, GeoPointFactory, SupermarketFactory

fake = Faker("en_US")
fake.add_provider(geo)

User = get_user_model()


def get_dummy_uploaded_file(name="file.pdf"):
    return SimpleUploadedFile(name, b"*" * 300, content_type="application/pdf")


class FileTypeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = FileType


class DummyModelFunctionalTest(MapEntityTest):
    userfactory = SuperUserFactory
    model = DummyModel
    modelfactory = DummyModelFactory

    def get_expected_geojson_geom(self):
        return {"coordinates": [self.obj.geom.x, self.obj.geom.y], "type": "Point"}

    def get_expected_geojson_attrs(self):
        return {"id": 1, "name": "a dummy model"}

    def get_expected_datatables_attrs(self):
        return {
            "date_update": "17/03/2020 00:00:00",
            "description": "",
            "geom": self.obj.geom.ewkt,
            "id": 1,
            "name": '<a href="/dummymodel/1/">a dummy model</a>',
            "name_en": "a dummy model",
            "name_fr": "",
            "name_zh_hant": "",
            "public": '<i class="bi bi-x-circle text-danger"></i>',
            "short_description": "a dummy model with a dummy name, a dummy geom, dummy tags, dummy makinins. It is the perfect object to make tests",
            "tags": ", ".join([str(tag) for tag in self.obj.tags.all()]),
        }

    def get_expected_popup_content(self):
        return (
            f'<div class="d-flex flex-column justify-content-center">\n'
            f'    <p class="text-center m-0 p-1"><strong>a dummy model (1)</strong></p>\n    \n'
            f'        <p class="m-0 p-1">\n'
            f"            a dummy model with a dummy name, a dummy geom, dummy tags, dummy makinins. It is the perfect object…<br>public: no<br>{self.obj.tags.first().label}<br>a dummy model<br>\n"
            f"        </p>\n    \n"
            f'    <button id="detail-btn" class="btn btn-sm btn-info mt-2" onclick="window.location.href=\'/dummymodel/{self.model.objects.first().pk}/\'">Detail sheet</button>\n'
            f"</div>"
        )

    def get_good_data(self):
        return {"geom": '{"type": "Point", "coordinates":[0, 0]}'}


class DummyModelLiveTest(MapEntityLiveTest):
    userfactory = SuperUserFactory
    model = DummyModel
    modelfactory = DummyModelFactory


class BaseTest(TestCase):
    def login(self):
        if getattr(self, "user", None) is None:
            user = User.objects.create_user(
                self.__class__.__name__ + "User", "email@corp.com", "booh"
            )
            setattr(self, "user", user)
        self.logout()
        success = self.client.login(username=self.user.username, password="booh")
        self.assertTrue(success)
        return self.user

    def login_as_superuser(self):
        if getattr(self, "superuser", None) is None:
            superuser = User.objects.create_superuser(
                self.__class__.__name__ + "Superuser", "email@corp.com", "booh"
            )
            setattr(self, "superuser", superuser)
        self.logout()
        success = self.client.login(username=self.superuser.username, password="booh")
        self.assertTrue(success)
        return self.superuser

    def logout(self):
        self.client.logout()


class ConvertTest(BaseTest):
    def test_view_headers_are_reverted_to_originals(self):
        request = mock.MagicMock(META=dict(HTTP_ACCEPT_LANGUAGE="fr"))
        view = Convert()
        view.request = request
        self.assertEqual(view.request_headers(), {"Accept-Language": "fr"})

    def test_critical_original_headers_are_filtered(self):
        request = mock.MagicMock(
            META=dict(HTTP_HOST="originalhost", HTTP_COOKIE="blah")
        )
        view = Convert()
        view.request = request
        self.assertEqual(view.request_headers(), {})

    def test_convert_view_is_protected_by_login(self):
        response = self.client.get("/convert/")
        self.assertEqual(response.status_code, 302)

    def test_convert_view_complains_if_no_url_is_provided(self):
        self.login()
        response = self.client.get("/convert/")
        self.assertEqual(response.status_code, 400)

    def test_convert_view_only_supports_get(self):
        self.login()
        response = self.client.head("/convert/")
        self.assertEqual(response.status_code, 405)

    @mock.patch("mapentity.helpers.requests.get")
    @mock.patch("mapentity.tokens.TokenManager.generate_token")
    def test_convert_view_uses_original_request_headers(self, token_mocked, get_mocked):
        token_mocked.return_value = "a_temp0rary_t0k3n"
        get_mocked.return_value.status_code = 200
        get_mocked.return_value.content = "x"
        get_mocked.return_value.url = "x"
        self.login()
        self.client.get("/convert/?url=http://geotrek.fr", HTTP_ACCEPT_LANGUAGE="it")
        host = app_settings["CONVERSION_SERVER"]
        url = f"{host}/?url=http%3A//geotrek.fr%3Fauth_token%3Da_temp0rary_t0k3n&to=application/pdf"
        get_mocked.assert_called_with(url, headers={"Accept-Language": "it"})

    @mock.patch("mapentity.helpers.requests.get")
    @mock.patch("mapentity.tokens.TokenManager.generate_token")
    def test_convert_view_builds_absolute_url_from_relative(
        self, token_mocked, get_mocked
    ):
        token_mocked.return_value = "a_temp0rary_t0k3n"
        get_mocked.return_value.status_code = 200
        get_mocked.return_value.content = "x"
        get_mocked.return_value.url = "x"
        self.login()
        self.client.get("/convert/?url=/path/1/")
        host = app_settings["CONVERSION_SERVER"]
        url = f"{host}/?url=http%3A//testserver/path/1/%3Fauth_token%3Da_temp0rary_t0k3n&to=application/pdf"
        get_mocked.assert_called_with(url, headers={})


class AttachmentTest(BaseTest):
    def setUp(self):
        app_settings["SENDFILE_HTTP_HEADER"] = "X-Accel-Redirect"
        self.obj = DummyModelFactory.create()
        self.attachment = AttachmentFactory.create(content_object=self.obj)
        self.url = f"/media/{self.attachment.attachment_file}"
        call_command("update_permissions_mapentity")

    def tearDown(self):
        app_settings["SENDFILE_HTTP_HEADER"] = None

    def download(self, url):
        return self.client.get(url, REMOTE_ADDR="6.6.6.6")

    def test_access_to_public_attachment(self):
        self.obj.public = True
        self.obj.save()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_anonymous_access_to_not_published_attachment(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_unauthorized_access_to_attachment(self):
        self.login()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_authorized_access_to_attachment(self):
        self.login()
        perm1 = Permission.objects.get(codename="read_attachment")
        self.user.user_permissions.add(perm1)
        perm2 = Permission.objects.get(codename="read_dummymodel")
        self.user.user_permissions.add(perm2)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_anonymous_access_to_deleted_object(self):
        self.obj.delete()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 404)

    def test_authorized_access_to_deleted_object(self):
        self.obj.delete()
        self.login_as_superuser()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 404)

    def test_access_to_not_existing_app(self):
        response = self.client.get(
            f"/media/paperclip/xxx_dummymodel/{self.obj.pk}/file.pdf"
        )
        self.assertEqual(response.status_code, 404)

    def test_access_to_not_existing_model(self):
        response = self.client.get(
            f"/media/paperclip/test_app_yyy/{self.obj.pk}/file.pdf"
        )
        self.assertEqual(response.status_code, 404)

    def test_access_to_not_existing_object(self):
        response = self.client.get(
            "/media/paperclip/test_app_dummymodel/99999999/file.pdf"
        )
        self.assertEqual(response.status_code, 404)

    @override_settings(DEBUG=True)
    def test_access_to_not_existing_file(self):
        os.remove(self.attachment.attachment_file.path)
        self.login_as_superuser()
        response = self.download(self.url)
        self.assertEqual(response.status_code, 404)

    @override_settings(DEBUG=True)
    def test_authenticated_user_can_access(self):
        self.login_as_superuser()
        response = self.download(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "*********")

    def test_http_headers_attachment(self):
        app_settings["SENDFILE_HTTP_HEADER"] = "X-Accel-Redirect"
        request = RequestFactory().get("/fake-path")
        request.user = User.objects.create_superuser("test", "email@corp.com", "booh")
        response = ServeAttachment.as_view()(
            request, path=str(self.attachment.attachment_file)
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"")
        self.assertEqual(
            response["X-Accel-Redirect"],
            f"/media_secure/{self.attachment.attachment_file}",
        )
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertEqual(
            response["Content-Disposition"],
            "attachment; filename={}".format(
                str(self.attachment.attachment_file.name).split("/")[-1]
            ),
        )
        app_settings["SENDFILE_HTTP_HEADER"] = None

    def test_http_headers_inline(self):
        app_settings["SERVE_MEDIA_AS_ATTACHMENT"] = False
        request = RequestFactory().get("/fake-path")
        request.user = User.objects.create_superuser("test", "email@corp.com", "booh")
        response = ServeAttachment.as_view()(
            request, path=str(self.attachment.attachment_file)
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"")
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertFalse("Content-Disposition" in response)
        app_settings["SERVE_MEDIA_AS_ATTACHMENT"] = True


class SettingsViewTest(BaseTest):
    def test_js_settings_urls(self):
        view = JSSettings()
        view.request = RequestFactory().get("/fake-path")
        context = view.get_context_data()
        self.assertDictEqual(
            context["urls"],
            {
                "layer": "/api/modelname/drf/modelnames.geojson",
                "screenshot": "/map_screenshot/",
                "detail": "/modelname/0/",
                "popup": "/api/modelname/drf/modelnames/0/popup-content",
                "format_list": "/modelname/list/export/",
                "static": "/static/",
                "root": "/",
            },
        )


class ListViewTest(BaseTest):
    def setUp(self):
        self.user = User.objects.create_user("aah", "email@corp.com", "booh")

        def user_perms(p):
            return {"test_app.export_dummymodel": False}.get(p, True)

        self.user.has_perm = mock.MagicMock(side_effect=user_perms)

    def test_mapentity_template_is_last_candidate(self):
        listview = DummyList()
        listview.object_list = DummyModel.objects.none()
        self.assertEqual(
            listview.get_template_names()[-1], "mapentity/mapentity_list.html"
        )

    def test_list_should_have_some_perms_in_context(self):
        view = DummyList()
        view.object_list = []
        view.request = RequestFactory().get("/fake-path")
        view.request.user = self.user
        context = view.get_context_data()
        self.assertEqual(context["can_add"], True)
        self.assertEqual(context["can_export"], False)

    def test_list_should_render_some_perms_in_template(self):
        request = RequestFactory().get("/fake-path")
        request.user = self.user
        request.session = {}
        view = DummyList.as_view()
        response = view(request)
        html = response.render()
        self.assertTrue(b"btn-group disabled" in html.content)
        self.assertFalse(b"Add a new dummy model" in html.content)

    def test_list_view_creates_minimal_generic_filter(self):
        request = RequestFactory().get("/fake-path")
        request.user = self.user
        request.session = {}
        view = DummyList.as_view()
        response = view(request)
        self.assertNotContains(response, '<input type="text" name="Name"')
        self.assertContains(response, '<input type="hidden" name="bbox"')

    def test_list_view_overrides_minimal_generic_filter(self):
        request = RequestFactory().get("/fake-path")
        request.user = self.user
        request.session = {}
        view = RoadList.as_view()
        response = view(request)
        self.assertContains(response, '<input type="text" name="name"')
        self.assertContains(response, '<input type="hidden" name="bbox"')


class MapEntityLayerViewTest(BaseTest):
    def setUp(self):
        DummyModelFactory.create_batch(30)
        DummyModelFactory.create(name="toto")

        self.login()
        self.user.is_superuser = True
        self.user.save()
        self.logout()

    def test_geojson_layer_returns_all_by_default(self):
        self.login()
        response = self.client.get(DummyModel.get_layer_list_url())
        self.assertEqual(len(response.json()["features"]), 31)

    def test_geojson_layer_can_be_filtered(self):
        self.login()
        response = self.client.get(DummyModel.get_layer_list_url() + "?name=toto")
        self.assertEqual(len(response.json()["features"]), 1)

    def test_geojson_layer_with_parameters_is_not_cached(self):
        self.login()
        response = self.client.get(DummyModel.get_layer_list_url() + "?name=toto")
        self.assertEqual(len(response.json()["features"]), 1)
        response = self.client.get(DummyModel.get_layer_list_url())
        self.assertEqual(len(response.json()["features"]), 31)

    def test_geojson_layer_with_parameters_does_not_use_cache(self):
        self.login()
        response = self.client.get(DummyModel.get_layer_list_url())
        self.assertEqual(len(response.json()["features"]), 31)
        response = self.client.get(DummyModel.get_layer_list_url() + "?name=toto")
        self.assertEqual(len(response.json()["features"]), 1)


class DetailViewTest(BaseTest):
    def setUp(self):
        self.login()
        self.user.is_superuser = True
        self.user.save()
        self.logout()
        self.object = DummyModelFactory.create(name="dumber")

    def test_mapentity_template_is_last_candidate(self):
        detailview = DummyDetail()
        detailview.object = self.object
        self.assertEqual(
            detailview.get_template_names(),
            ["test_app/dummymodel_detail.html", "mapentity/mapentity_detail.html"],
        )

    def test_properties_shown_in_extended_template(self):
        self.login()
        response = self.client.get(self.object.get_detail_url())
        self.assertTemplateUsed(
            response, template_name="test_app/dummymodel_detail.html"
        )
        self.assertContains(response, "dumber")

    def test_export_buttons_odt(self):
        self.login()

        tmp = app_settings["MAPENTITY_WEASYPRINT"]
        app_settings["MAPENTITY_WEASYPRINT"] = False

        response = self.client.get(self.object.get_detail_url())

        app_settings["MAPENTITY_WEASYPRINT"] = tmp

        self.assertContains(
            response,
            f'href="/document/dummymodel-{self.object.pk}.odt"',
        )
        self.assertContains(
            response,
            f'href="/convert/?url=/document/dummymodel-{self.object.pk}.odt'
            '&from=application/vnd.oasis.opendocument.text&to=doc"',
        )
        self.assertContains(
            response,
            f'href="/convert/?url=/document/dummymodel-{self.object.pk}.odt'
            '&from=application/vnd.oasis.opendocument.text"',
        )

    def test_export_buttons_weasyprint(self):
        self.login()

        tmp = app_settings["MAPENTITY_WEASYPRINT"]
        app_settings["MAPENTITY_WEASYPRINT"] = True

        response = self.client.get(self.object.get_detail_url())

        app_settings["MAPENTITY_WEASYPRINT"] = tmp

        if app_settings["MAPENTITY_WEASYPRINT"]:
            self.assertContains(
                response,
                f'href="/document/dummymodel-{self.object.pk}.pdf"',
            )
        else:
            self.assertContains(
                response,
                f'href="/document/dummymodel-{self.object.pk}.odt"',
            )
        self.assertNotContains(
            response,
            f'href="/convert/?url=/document/dummymodel-{self.object.pk}.odt&to=doc"',
        )

    def test_detail_fragment(self):
        self.login()
        response = self.client.get(self.object.get_detail_url())
        self.assertContains(response, "<h3>Fragment dummymodel</h3>")


class MultiDeleteViewTest(BaseTest):
    @classmethod
    def setUpTestData(cls):
        cls.user = SuperUserFactory.create()
        cls.model = GeoPoint

        cls.geopoint1 = GeoPointFactory.create(name="geopoint1")
        cls.geopoint2 = GeoPointFactory.create(name="geopoint2")
        cls.geopoint3 = GeoPointFactory.create(name="geopoint3")

    def test_mapentity_template(self):
        multideleteview = GeoPointMultiDelete()
        multideleteview.object_list = GeoPoint.objects.none()
        self.assertEqual(
            multideleteview.get_template_names()[-1],
            "mapentity/mapentity_multi_delete_confirmation.html",
        )

    def test_mapentity_title(self):
        multideleteview = GeoPointMultiDelete()
        multideleteview.object_list = GeoPoint.objects.none()
        self.assertEqual(multideleteview.get_title(), "Delete selected geopoint")

    def test_multi_delete_should_have_number_of_selected_objects_in_context(self):
        view = GeoPointMultiDelete()
        view.object_list = []
        view.request = RequestFactory().get("/fake-path/?pks=1%2C2")
        view.request.user = self.user
        context = view.get_context_data()
        self.assertEqual(context["nb_objects"], 2)

    def test_multi_delete_should_have_selected_objects_in_queryset(self):
        view = GeoPointMultiDelete()
        view.object_list = []
        view.request = RequestFactory().get("/fake-path/?pks=1%2C2")
        view.request.user = self.user
        queryset = view.get_queryset()
        self.assertEqual(queryset.count(), 2)
        self.assertEqual(queryset[0], self.geopoint1)
        self.assertEqual(queryset[1], self.geopoint2)

    def test_multi_delete_post(self):
        self.client.force_login(self.user)
        response = self.client.post(self.model.get_multi_delete_url() + "?pks=1%2C2")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, self.model.get_list_url())
        self.assertEqual(GeoPoint.objects.all().count(), 1)


class MultiUpdateViewTest(BaseTest):
    @classmethod
    def setUpTestData(cls):
        cls.user = SuperUserFactory()
        cls.model = GeoPoint

        cls.geopoint1 = GeoPointFactory.create(name="geopoint1")
        cls.geopoint2 = GeoPointFactory.create(name="geopoint2")
        cls.geopoint3 = GeoPointFactory.create(name="geopoint3")

    def test_mapentity_template(self):
        multiupdateview = GeoPointMultiUpdate()
        multiupdateview.object_list = GeoPoint.objects.none()
        self.assertEqual(
            multiupdateview.get_template_names()[-1],
            "mapentity/mapentity_multi_update_form.html",
        )

    def test_mapentity_title(self):
        multiupdateview = GeoPointMultiUpdate()
        multiupdateview.object_list = GeoPoint.objects.none()
        self.assertEqual(multiupdateview.get_title(), "Update selected geopoint")

    def test_multi_update_should_have_number_of_selected_objects_in_context(self):
        view = GeoPointMultiUpdate()
        view.object_list = []
        view.request = RequestFactory().get("/fake-path/?pks=1%2C2")
        view.request.user = self.user
        context = view.get_context_data()
        self.assertEqual(context["nb_objects"], 2)

    def test_multi_update_should_have_selected_objects_in_queryset(self):
        view = GeoPointMultiUpdate()
        view.object_list = []
        view.request = RequestFactory().get("/fake-path/?pks=1%2C2")
        view.request.user = self.user
        queryset = view.get_queryset()
        self.assertEqual(queryset.count(), 2)
        self.assertEqual(queryset[0], self.geopoint1)
        self.assertEqual(queryset[1], self.geopoint2)

    def test_multi_update_editable_fields(self):
        view = GeoPointMultiUpdate()
        view.object_list = []
        view.request = RequestFactory().get("/fake-path/?pks=1%2C2")
        view.request.user = self.user
        editable_fields = view.get_editable_fields()
        self.assertEqual(
            editable_fields,
            [
                "public",
                "public_en",
                "public_fr",
                "public_zh_hant",
                "located_in",
                "road",
            ],
        )

    def test_multi_update_form_fields(self):
        view = GeoPointMultiUpdate()
        view.object_list = []
        view.request = RequestFactory().get("/fake-path/?pks=1%2C2")
        view.request.user = self.user
        form = view.get_form()

        # check translated fields
        self.assertEqual(
            list(form.fields.keys()),
            ["public_en", "public_fr", "public_zh_hant", "located_in", "road"],
        )

        # check choices depends on the type on the field
        self.assertEqual(
            form.fields["public_en"].widget.choices,
            [("nothing", "Do nothing"), ("true", "Yes"), ("false", "No")],
        )
        self.assertIn(
            ("nothing", "Do nothing"), form.fields["located_in"].widget.choices
        )
        self.assertIn(("", "Null value"), form.fields["located_in"].widget.choices)
        self.assertIn(("nothing", "Do nothing"), form.fields["road"].widget.choices)
        self.assertNotIn(("", "Null value"), form.fields["road"].widget.choices)

    def test_multi_update_post_do_nothing(self):
        self.client.force_login(self.user)
        data = {
            "public_en": "nothing",
            "public_fr": "nothing",
            "public_zh_hant": "nothing",
            "located_in": "nothing",
            "road": "nothing",
        }
        response = self.client.post(
            self.model.get_multi_update_url() + "?pks=1%2C2", data=data
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, self.model.get_list_url())

        for i, geopoint in enumerate([self.geopoint1, self.geopoint2, self.geopoint3]):
            db_geopoint = GeoPoint.objects.get(pk=geopoint.pk)
            self.assertEqual(db_geopoint.public_en, geopoint.public_en)
            self.assertEqual(db_geopoint.public_fr, geopoint.public_fr)
            self.assertEqual(db_geopoint.public_zh_hant, geopoint.public_zh_hant)
            self.assertEqual(db_geopoint.located_in, geopoint.located_in)
            self.assertEqual(db_geopoint.road, geopoint.road)

    def test_multi_update_post_boolean(self):
        self.client.force_login(self.user)
        data = {
            "public_en": "true",
            "public_fr": "false",
            "public_zh_hant": "nothing",
            "located_in": "nothing",
            "road": "nothing",
        }
        response = self.client.post(
            self.model.get_multi_update_url() + "?pks=1%2C2", data=data
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, self.model.get_list_url())
        db_geopoint1 = GeoPoint.objects.get(pk=self.geopoint1.pk)
        self.assertEqual(db_geopoint1.public_en, True)
        self.assertEqual(db_geopoint1.public_fr, False)

        db_geopoint2 = GeoPoint.objects.get(pk=self.geopoint2.pk)
        self.assertEqual(db_geopoint2.public_en, True)
        self.assertEqual(db_geopoint2.public_fr, False)

    def test_multi_update_post_foreign_key(self):
        self.client.force_login(self.user)
        selected_road = self.geopoint1.road
        data = {
            "public_en": "nothing",
            "public_fr": "nothing",
            "public_zh_hant": "nothing",
            "located_in": "",
            "road": selected_road.pk,
        }
        response = self.client.post(
            self.model.get_multi_update_url() + "?pks=1%2C2", data=data
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, self.model.get_list_url())
        db_geopoint1 = GeoPoint.objects.get(pk=self.geopoint1.pk)
        self.assertEqual(db_geopoint1.located_in, None)
        self.assertEqual(db_geopoint1.road, selected_road)

        db_geopoint2 = GeoPoint.objects.get(pk=self.geopoint2.pk)
        self.assertEqual(db_geopoint2.located_in, None)
        self.assertEqual(db_geopoint2.road, selected_road)


class ViewPermissionsTest(BaseTest):
    def setUp(self):
        self.login()
        self.user.user_permissions.all().delete()  # WTF ?
        self.object = DummyModel.objects.create()

    def tearDown(self):
        self.logout()

    def test_views_name_depend_on_model(self):
        view = DummyList()
        self.assertEqual(view.get_view_perm(), "test_app.read_dummymodel")

    def test_unauthorized_list_view_redirects_to_login(self):
        response = self.client.get("/dummymodel/list/")
        self.assertRedirects(response, "/login/")

    def test_unauthorized_detail_view_redirects_to_list(self):
        detail_url = f"/dummymodel/{self.object.pk}/"
        response = self.client.get(detail_url)
        self.assertRedirects(
            response, "/dummymodel/list/", target_status_code=302
        )  # --> login

    def test_unauthorized_add_view_redirects_to_list(self):
        add_url = "/dummymodel/add/"
        response = self.client.get(add_url)
        self.assertRedirects(
            response, "/dummymodel/list/", target_status_code=302
        )  # --> login

    def test_unauthorized_update_view_redirects_to_detail(self):
        edit_url = f"/dummymodel/edit/{self.object.pk}/"
        response = self.client.get(edit_url)
        self.assertRedirects(
            response, f"/dummymodel/{self.object.pk}/", target_status_code=302
        )  # --> login

    def test_unauthorized_filter_view_redirects_to_login(self):
        filter_url = "/dummymodel/filter/"
        response = self.client.get(filter_url)
        self.assertRedirects(response, "/login/")

    def test_unauthorized_delete_view_redirects_to_detail(self):
        delete_url = f"/dummymodel/delete/{self.object.pk}/"
        response = self.client.get(delete_url)
        self.assertRedirects(
            response, f"/dummymodel/{self.object.pk}/", target_status_code=302
        )  # --> login


class LogViewTest(BaseTest):
    def test_logentry_view(self):
        self.login_as_superuser()
        response = self.client.get("/logentry/list/")
        self.assertContains(response, '<th data-data="action_flag"')

    def test_logentry_view_not_logged(self):
        response = self.client.get("/logentry/list/")
        self.assertRedirects(response, "/login/")

    def test_logentry_view_not_superuser(self):
        self.login()
        response = self.client.get("/logentry/list/")
        self.assertRedirects(response, "/login/")


class LogoutViewTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            self.__class__.__name__ + "User", "email@corp.com", "booh"
        )

    def test_logout_post(self):
        self.client.force_login(user=self.user)
        response = self.client.get("/dummymodel/list/")
        parsed = BeautifulSoup(response.content, features="html.parser")
        logout_tag = parsed.find("form", {"action": "/logout/", "method": "post"})
        self.assertTrue(logout_tag)

        self.assertTrue(logout_tag.find("input", {"name": "csrfmiddlewaretoken"}))

        self.assertTrue(logout_tag.find("button", {"type": "submit"}))


class LogViewMapentityTest(MapEntityTest):
    userfactory = SuperUserFactory
    model = LogEntry
    modelfactory = DummyModelFactory
    get_expected_geojson_attrs = None

    def get_expected_datatables_attrs(self):
        content_type = ContentType.objects.get_for_model(DummyModel)
        data = {
            "action_flag": "Addition",
            "action_time": "10/06/2022 12:40:10",
            "change_message": "",
            "content_type": str(content_type),
            "id": 1,
            "name": '<a href="/logentry/1/">1</a>',
            "object": '<a data-pk="1" href="/dummymodel/1/" >Test App | Dummy '
            "Model <class 'object'></a>",
            "object_id": "1",
            "object_repr": "<class 'object'>",
            "user": User.objects.first().username,
        }

        if django.__version__ < "5.0":
            data["object"] = (
                '<a data-pk="1" href="/dummymodel/1/" >test_app | Dummy '
                "Model <class 'object'></a>"
            )
        return data

    def get_good_data(self):
        return {"geom": None}

    def test_basic_format(self):
        return None

    @freeze_time("2022-06-10 12:40:10")
    def test_api_datatables_list_for_model(self):
        obj = self.modelfactory()

        LogEntry.objects.log_action(
            user_id=self.user.pk,
            content_type_id=obj.get_content_type_id(),
            object_id=obj.pk,
            object_repr=force_str(object),
            action_flag=1,
        )
        super().test_api_datatables_list_for_model()

    @freeze_time("2022-06-10 12:40:10")
    def test_api_no_format_list_for_model(self):
        obj = self.modelfactory()

        LogEntry.objects.log_action(
            user_id=self.user.pk,
            content_type_id=obj.get_content_type_id(),
            object_id=obj.pk,
            object_repr=force_str(object),
            action_flag=1,
        )
        super().test_api_no_format_list_for_model()

    def test_crud_status(self):
        instance = self.modelfactory()

        obj = LogEntry.objects.log_action(
            user_id=self.user.pk,
            content_type_id=instance.get_content_type_id(),
            object_id=instance.pk,
            object_repr=force_str(instance),
            action_flag=1,
        )

        response = self.client.get(obj.get_list_url())
        self.assertEqual(response.status_code, 200)

    def test_gpx_elevation(self):
        pass

    def test_no_basic_format(self):
        pass

    def test_no_basic_format_fail(self):
        pass

    def test_no_html_in_csv(self):
        pass

    def test_api_popup_content(self):
        pass


class LogViewMapentityTestlLiveTest(MapEntityLiveTest):
    userfactory = SuperUserFactory
    model = LogEntry
    modelfactory = DummyModelFactory

    def test_geojson_cache(self):
        """no cache in logentry geojson"""


class FilterViewTest(BaseTest):
    def setUp(self):
        self.login()
        self.user.is_superuser = True
        self.user.save()

    def test_mapentity_template_is_last_candidate(self):
        filterview = DummyModelFilter()
        filterview.object_list = DummyModel.objects.all()  # Add this line
        filterview.model = DummyModel
        self.assertEqual(
            filterview.get_template_names(),
            ["test_app/dummymodel_filter.html", "mapentity/mapentity_filter.html"],
        )

    def test_filter_view_creates_full_generic_filter(self):
        response = self.client.get(City.get_filter_url())
        self.assertContains(response, '<input type="text" name="name"')
        self.assertContains(response, '<input type="hidden" name="bbox"')


class MapScreenshotTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = UserFactory.create()

        cls.context = {
            "mapview": {"lat": 42.771211138625894, "lng": 1.336212158203125, "zoom": 9},
            "maplayers": ["OSM", "Cadastre", "Signalétiques", "POI", "▣ Tronçons"],
            "filter": "",
            "sortcolumns": {},
            "fullurl": "https://test.fr/path/list/",
            "url": "/path/list/",
            "selector": "#map",
            "viewport": {"width": 1854, "height": 481},
            "timestamp": 1762525783907,
        }

    @mock.patch("mapentity.helpers.requests.get")
    def test_map_screenshot_success(self, mock_capture):
        self.client.force_login(self.user)

        mock_capture.return_value.content = b"fake_png_data"
        mock_capture.return_value.status_code = 200

        data = {"printcontext": json.dumps(self.context)}

        response = self.client.post(reverse("mapentity:map_screenshot"), data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertEqual(response.content, b"fake_png_data")

        args, kwargs = mock_capture.call_args
        called_url = args[0]

        # check mapentity url
        self.assertTrue(called_url.startswith("http"))
        self.assertIn(f"lang%3D{get_language()}", called_url)
        self.assertIn("auth_token", called_url)
        self.assertIn("context", called_url)

        # check screamshotter url
        self.assertIn("width=1854", called_url)
        self.assertIn("height=481", called_url)
        self.assertIn("selector=%23map", called_url)

    def test_map_screenshot_invalid_json_context(self):
        self.client.force_login(self.user)

        data = {"printcontext": "json_error"}

        with self.assertLogs(level="INFO") as cm:
            response = self.client.post(reverse("mapentity:map_screenshot"), data)
        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "ERROR:mapentity.views.base:Expecting value: line 1 column 1 (char 0)",
            cm.output[0],
        )

    def test_map_screenshot_invalid_length_context(self):
        self.client.force_login(self.user)

        data = {"printcontext": "{" + "test" * 1000 + "}"}

        with self.assertLogs(level="INFO") as cm:
            response = self.client.post(reverse("mapentity:map_screenshot"), data)
        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "ERROR:mapentity.views.base:Print context is way too big", cm.output[0]
        )


class SupermarketFunctionalTest(MapEntityTest):
    userfactory = SuperUserFactory
    model = Supermarket
    modelfactory = SupermarketFactory

    def get_expected_geojson_geom(self):
        return {
            "coordinates": [[
                [coord[0], coord[1]] for coord in self.obj.geom.coords[0]
            ]],
            "type": "Polygon"
        }

    def get_expected_geojson_attrs(self):
        return {"id": self.obj.pk, "name": self.obj.name}

    def get_expected_datatables_attrs(self):
        # Include all fields that would be returned in datatables
        return {
            "id": self.obj.pk,
            "name": f'<a href="/supermarket/{self.obj.pk}/">{self.obj.name}</a>',
            "geom": self.obj.geom.ewkt,
            "parking": self.obj.parking.ewkt if self.obj.parking else None,
            "tag": None,
        }

    def get_expected_popup_content(self):
        return (
            f'<div class="d-flex flex-column justify-content-center">\n'
            f'    <p class="text-center m-0 p-1"><strong>{self.obj.name}</strong></p>\n    \n'
            f'    <button id="detail-btn" class="btn btn-sm btn-info mt-2" onclick="window.location.href=\'/supermarket/{self.obj.pk}/\'">Detail sheet</button>\n'
            f'</div>'
        )

    def get_good_data(self):
        return {
            "name": "Test Supermarket",
            "geom": '{"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]}',
            "parking": '{"type": "Point", "coordinates": [0.5, 0.5]}'
        }

    @skip("Duplication test needs investigation - skipping for now")
    def test_duplicate(self):
        pass
