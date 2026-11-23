from datetime import datetime, timezone
from unittest import mock

from django.conf import settings
from django.core.cache import caches
from django.core.exceptions import PermissionDenied
from django.test import RequestFactory, TestCase
from django.urls import reverse
from rest_framework.response import Response

from mapentity.decorators import (
    mvt_etag,
    view_cache_response_content,
    view_permission_required,
)
from mapentity.registry import app_settings
from mapentity.settings import app_settings as mapentity_settings


class ViewPermissionRequiredTestCase(TestCase):
    def setUp(self):
        # Fake request and its positional and keywords arguments.
        self.request = RequestFactory().get("/toto/")
        self.request._messages = mock.MagicMock()
        self.request.user = mock.MagicMock()
        type(self.request.user).is_anonymous = mock.PropertyMock(return_value=False)
        self.request_args = ["fake_arg"]
        self.request_kwargs = {"fake": "kwarg"}
        self.mocked_view = mock.MagicMock()

    def run_decorated_view(self, raise_exception=None, login_url=None):
        """Setup, decorate and call view, then return response."""
        decorator = view_permission_required(
            raise_exception=raise_exception, login_url=login_url
        )
        decorated_view = decorator(self.mocked_view)
        # Return response.
        return decorated_view(
            self.mocked_view, self.request, *self.request_args, **self.request_kwargs
        )

    def test_anonymous_are_redirected_to_login(self):
        type(self.request.user).is_anonymous = mock.PropertyMock(return_value=True)
        self.request.user.has_perm.return_value = False
        response = self.run_decorated_view()
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response["Location"].startswith(settings.LOGIN_URL))

    def test_unauthorized_is_rendered_if_missing_perm(self):
        type(self.request.user).is_anonymous = mock.PropertyMock(return_value=False)
        self.request.user.has_perm.return_value = False
        self.assertRaises(PermissionDenied, self.run_decorated_view)

    def test_unauthorized_is_not_rendered_if_login_url_is_provided(self):
        type(self.request.user).is_anonymous = mock.PropertyMock(return_value=False)
        self.request.user.has_perm.return_value = False
        response = self.run_decorated_view(login_url="login")
        self.assertEqual(response.status_code, 302)

    def test_permission_is_taken_from_view(self):
        type(self.request.user).is_anonymous = mock.PropertyMock(return_value=False)
        self.mocked_view.get_view_perm.return_value = "view-perm"
        self.run_decorated_view()
        self.request.user.has_perm.assert_called_once_with("view-perm")

    def test_anonymous_may_be_authorized_from_settings(self):
        type(self.request.user).is_authenticated = mock.PropertyMock(return_value=False)
        self.mocked_view.get_view_perm.return_value = "view-perm"
        app_settings["ANONYMOUS_VIEWS_PERMS"] = ("view-perm",)
        response = self.run_decorated_view()
        self.assertNotEqual(response.status_code, 200)

    def test_a_message_is_show_when_user_is_redirected(self):
        self.request.user.has_perm.return_value = False
        with mock.patch("django.contrib.messages.warning") as patched:
            self.run_decorated_view(raise_exception=False)
            patched.assert_called_once_with(
                self.request,
                "Access to the requested resource is restricted. You have been redirected.",
            )

    def test_it_redirects_to_the_specified_view(self):
        self.request.user.has_perm.return_value = False
        response = self.run_decorated_view(
            raise_exception=False, login_url="test_app:dummymodel_list"
        )
        self.assertEqual(response.status_code, 302)
        dummylist_url = reverse("test_app:dummymodel_list")
        self.assertTrue(dummylist_url in response["Location"])


class MVTEtagAndCacheTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        caches[mapentity_settings["GEOJSON_LAYERS_CACHE_BACKEND"]].clear()

    def _build_mock_view(self, model_cls, raw_request):
        view = mock.MagicMock()
        del view.view_cache_key
        view.model = model_cls
        view.filter_queryset.return_value = mock.MagicMock(model=model_cls)

        drf_request = mock.MagicMock()
        drf_request._request = raw_request
        drf_request.GET = raw_request.GET
        drf_request.LANGUAGE_CODE = "en"
        drf_request.build_absolute_uri.return_value = "http://testserver/mvt/10/512/512"
        view.request = drf_request
        return view

    def test_mvt_etag_populates_request_cache_and_view_cache_reuses_it(self):
        raw_request = self.factory.get("/api/dummymodel/drf/dummymodels/mvt/10/512/512")
        model_cls = mock.MagicMock()
        model_cls._meta.model_name = "dummymodel"
        updated_at = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        model_cls.latest_updated_with_count.return_value = (updated_at, 3)

        view = self._build_mock_view(model_cls, raw_request)
        raw_request.parser_context = {"view": view}

        etag = mvt_etag(raw_request, z="10", x="512", y="512")
        self.assertIsNotNone(etag)
        self.assertEqual(
            raw_request._mvt_latest_cache[(model_cls, "10", "512", "512")],
            (updated_at, 3),
        )

        @view_cache_response_content()
        def mvt_action(self, request, *args, **kwargs):
            return Response(b"tile-bytes")

        response = mvt_action(view, view.request, z="10", x="512", y="512")
        self.assertEqual(response.content, b"tile-bytes")
        # latest_updated_with_count was only called once (by mvt_etag)
        model_cls.latest_updated_with_count.assert_called_once_with(
            z="10", x="512", y="512"
        )

    def test_view_cache_falls_back_when_request_cache_missing(self):
        raw_request = self.factory.get("/api/dummymodel/drf/dummymodels/mvt/10/512/512")
        model_cls = mock.MagicMock()
        model_cls._meta.model_name = "dummymodel"
        updated_at = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        model_cls.latest_updated_with_count.return_value = (updated_at, 1)

        view = self._build_mock_view(model_cls, raw_request)

        @view_cache_response_content()
        def mvt_action(self, request, *args, **kwargs):
            return Response(b"tile-bytes")

        response = mvt_action(view, view.request, z="10", x="512", y="512")
        self.assertEqual(response.content, b"tile-bytes")
        model_cls.latest_updated_with_count.assert_called_once_with(
            z="10", x="512", y="512"
        )
