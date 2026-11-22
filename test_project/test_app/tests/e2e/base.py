import atexit
import contextlib
import io
import json
import os
import re
import threading
import time
from pathlib import Path

with contextlib.suppress(ImportError):
    import shapely.geometry  # noqa: F401

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.core.cache import caches
from django.core.management import call_command
from django.core.servers.basehttp import WSGIServer
from django.test import override_settings, tag
from django.test.testcases import LiveServerThread
from playwright.sync_api import sync_playwright

from test_project.test_app.models import (
    City,
    ComplexModel,
    DummyModel,
    Road,
    Sector,
    Tag,
)

os.environ.setdefault("DJANGO_ALLOW_ASYNC_UNSAFE", "true")

FIXTURES_IMAGES_DIR = Path(__file__).parent / "fixtures" / "images"
VIDEOS_DIR = Path(
    os.environ.get(
        "PLAYWRIGHT_VIDEO_DIR",
        Path(settings.BASE_DIR) / "test-results" / "videos",
    )
)

_PLAYWRIGHT = None
_BROWSER = None


def _cleanup_playwright():
    global _PLAYWRIGHT, _BROWSER
    if _BROWSER is not None:
        try:
            _BROWSER.close()
        except Exception:
            pass
        _BROWSER = None
    if _PLAYWRIGHT is not None:
        try:
            _PLAYWRIGHT.stop()
        except Exception:
            pass
        _PLAYWRIGHT = None


def _reset_playwright_in_child():
    global _PLAYWRIGHT, _BROWSER
    _PLAYWRIGHT = None
    _BROWSER = None


if hasattr(os, "register_at_fork"):
    os.register_at_fork(after_in_child=_reset_playwright_in_child)


atexit.register(_cleanup_playwright)


def get_shared_browser():
    global _PLAYWRIGHT, _BROWSER
    if _PLAYWRIGHT is None:
        _PLAYWRIGHT = sync_playwright().start()
    if _BROWSER is None or not _BROWSER.is_connected():
        browser_name = os.environ.get("PLAYWRIGHT_BROWSER", "chromium").lower()
        headless = os.environ.get("PLAYWRIGHT_HEADLESS", "true").lower() not in (
            "0",
            "false",
            "no",
        )
        if os.environ.get("PWDEBUG") == "1":
            headless = False
        slow_mo = int(os.environ.get("PLAYWRIGHT_SLOW_MO", "0") or "0")
        launch_kwargs = {"headless": headless}
        if slow_mo > 0:
            launch_kwargs["slow_mo"] = slow_mo
        if browser_name == "chromium":
            launch_kwargs["args"] = [
                "--ignore-gpu-blocklist",
                "--enable-webgl",
                "--enable-webgl2",
                "--use-gl=angle",
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
                "--disable-dev-shm-usage",
                "--ignore-certificate-errors",
                "--no-sandbox",
            ]
        elif browser_name == "firefox":
            launch_kwargs["firefox_user_prefs"] = {
                "webgl.disabled": False,
                "webgl.force-enabled": True,
            }
        browser_launcher = getattr(_PLAYWRIGHT, browser_name)
        _BROWSER = browser_launcher.launch(**launch_kwargs)
    return _BROWSER


_DB_LOCK = threading.RLock()


class SequentialWSGIServer(WSGIServer):
    """Single-threaded WSGI server to avoid concurrent access to shared in-memory SQLite connection."""

    def __init__(self, *args, connections_override=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.connections_override = connections_override

    def process_request(self, request, client_address):
        with _DB_LOCK:
            return super().process_request(request, client_address)


class SequentialLiveServerThread(LiveServerThread):
    server_class = SequentialWSGIServer


@tag("e2e")
@override_settings(INTERNAL_IPS=[])
class PlaywrightE2ETestCase(StaticLiveServerTestCase):
    server_thread_class = SequentialLiveServerThread
    reset_sequences = False
    create_default_data = False
    install_layers = True

    @classmethod
    def setUpClass(cls):
        os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
        super().setUpClass()
        cls.browser = get_shared_browser()

    @classmethod
    def _pre_setup(cls):
        with _DB_LOCK:
            return super()._pre_setup()

    def setUp(self):
        with _DB_LOCK:
            super().setUp()
            for cache_name in settings.CACHES:
                caches[cache_name].clear()

            User = get_user_model()
            self.admin_user, _ = User.objects.get_or_create(
                username="admin",
                defaults={
                    "email": "admin@test.com",
                    "is_superuser": True,
                    "is_staff": True,
                },
            )
            self.admin_user.set_password("admin")
            self.admin_user.save()

            if self.install_layers:
                self.install_base_layers()

            if self.create_default_data:
                self.setup_default_test_data()

        self.tile_requests = {"osm": [], "otm": [], "overlay": []}
        self._in_flight_requests = set()
        record_video = os.environ.get(
            "PLAYWRIGHT_RECORD_VIDEO", "true"
        ).lower() not in (
            "0",
            "false",
            "no",
        )
        context_kwargs = {
            "viewport": {"width": 1280, "height": 720},
            "ignore_https_errors": True,
        }
        if record_video:
            VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
            context_kwargs["record_video_dir"] = str(VIDEOS_DIR)
            context_kwargs["record_video_size"] = {"width": 1280, "height": 720}
        self.context = self.browser.new_context(**context_kwargs)

        def _on_request(req):
            if req.url.startswith(self.live_server_url):
                self._in_flight_requests.add(req)

        def _on_request_done(req):
            self._in_flight_requests.discard(req)

        self.context.on("request", _on_request)
        self.context.on("requestfinished", _on_request_done)
        self.context.on("requestfailed", _on_request_done)

        self.context.add_init_script(
            """
            window.addEventListener('load', () => {
                if (document && document.head) {
                    const style = document.createElement('style');
                    style.innerHTML = '#djDebug, #djDebugToolbar, #djDebugToolbarHandle, #djDebugRoot, dj-debug-root { display: none !important; pointer-events: none !important; } .custom-popup, .custom-popup * { pointer-events: none !important; }';
                    document.head.appendChild(style);
                }
            });
            """
        )
        self.page = self.context.new_page()
        self.page.set_default_timeout(15000)

    def _has_test_failed(self):
        outcome = getattr(self, "_outcome", None)
        if outcome is None:
            return False
        if hasattr(outcome, "errors"):
            return any(exc_info is not None for _, exc_info in outcome.errors)
        result = getattr(outcome, "result", None)
        if result is not None:
            events = getattr(result, "events", None)
            if events is not None:
                test_index = getattr(result, "test_index", None)
                return any(
                    ev[0] in ("addFailure", "addError") and ev[1] == test_index
                    for ev in events
                )
            for collection in (
                getattr(result, "failures", ()),
                getattr(result, "errors", ()),
            ):
                if hasattr(collection, "__iter__"):
                    for test_case, _ in collection:
                        if (
                            test_case is self
                            or getattr(test_case, "test_case", None) is self
                        ):
                            return True
        return False

    def tearDown(self):
        test_failed = self._has_test_failed()
        video = None
        if hasattr(self, "page") and self.page is not None:
            try:
                video = self.page.video
                deadline = time.monotonic() + 5.0
                while self._in_flight_requests and time.monotonic() < deadline:
                    self.page.wait_for_timeout(50)
            except Exception:
                pass
        if hasattr(self, "context") and self.context is not None:
            try:
                self.context.close()
            except Exception:
                pass
        if video is not None:
            try:
                if test_failed:
                    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
                    target_path = (
                        VIDEOS_DIR
                        / f"{self.__class__.__name__}.{self._testMethodName}.webm"
                    )
                    video.save_as(str(target_path))
                video.delete()
            except Exception:
                pass
        with _DB_LOCK:
            for cache_name in settings.CACHES:
                caches[cache_name].clear()
            super().tearDown()

    def _post_teardown(self):
        with _DB_LOCK:
            return super()._post_teardown()

    def install_base_layers(self):
        out = io.StringIO()
        call_command("install_layer", "osm", order=0, verbosity=0, stdout=out)
        call_command("install_layer", "opentopomap", order=1, verbosity=0, stdout=out)
        call_command(
            "install_layer",
            "ign",
            "cadastre",
            order=0,
            overlay=True,
            verbosity=0,
            stdout=out,
        )

    def setup_default_test_data(self):
        out = io.StringIO()
        call_command(
            "create_test_data",
            dummies=20,
            cities=5,
            roads=10,
            geopoints=10,
            verbosity=0,
            stdout=out,
        )
        self.tags = list(Tag.objects.order_by("pk"))
        self.cities = list(City.objects.order_by("pk"))
        self.roads = list(Road.objects.order_by("pk"))
        self.sectors = list(Sector.objects.order_by("pk"))
        self.dummies = list(DummyModel.objects.order_by("pk"))
        self.complex_models = list(ComplexModel.objects.order_by("pk"))

    def url(self, path):
        if path.startswith(("http://", "https://")):
            return path
        if not path.startswith("/"):
            path = f"/{path}"
        return f"{self.live_server_url}{path}"

    def visit(self, path, **kwargs):
        return self.page.goto(self.url(path), **kwargs)

    def login(self, username="admin", password="admin"):
        logged_in = self.client.login(username=username, password=password)
        if logged_in and settings.SESSION_COOKIE_NAME in self.client.cookies:
            session_cookie = self.client.cookies[settings.SESSION_COOKIE_NAME]
            self.context.add_cookies(
                [
                    {
                        "name": settings.SESSION_COOKIE_NAME,
                        "value": session_cookie.value,
                        "url": self.live_server_url,
                    }
                ]
            )
            return
        self.visit("/login/")
        self.page.locator('input[name="username"]').fill(username)
        self.page.locator('input[name="password"]').fill(password)
        self.page.locator("form").locator(
            'button[type="submit"], input[type="submit"]'
        ).first.click()
        self.page.wait_for_url(lambda url: "/login/" not in url)

    def mock_tiles(self):
        def _handle_osm(route):
            self.tile_requests["osm"].append(route.request.url)
            route.fulfill(
                path=str(FIXTURES_IMAGES_DIR / "tile_osm.png"),
                content_type="image/png",
            )

        def _handle_otm(route):
            self.tile_requests["otm"].append(route.request.url)
            route.fulfill(
                path=str(FIXTURES_IMAGES_DIR / "tile_otm.png"),
                content_type="image/png",
            )

        def _handle_overlay(route):
            self.tile_requests["overlay"].append(route.request.url)
            route.fulfill(
                path=str(FIXTURES_IMAGES_DIR / "tile_overlay.png"),
                content_type="image/png",
            )

        self.page.route("https://*.openstreetmap.org/*/*/*.png", _handle_osm)
        self.page.route("https://*.tile.opentopomap.org/*/*/*.png", _handle_otm)
        self.page.route(
            re.compile(r"data\.geopf\.fr/wmts\?LAYER=CADASTRALPARCELS"),
            _handle_overlay,
        )

    def wait_for_tile(self, tile_key, timeout=15000):
        deadline = time.monotonic() + (timeout / 1000.0)
        while time.monotonic() < deadline:
            if len(self.tile_requests.get(tile_key, [])) > 0:
                return self.tile_requests[tile_key]
            self.page.wait_for_timeout(100)
        self.fail(f"Timed out waiting for tile request '{tile_key}'")

    def wait_for_map(self, timeout=15000):
        self.page.locator(
            ".maplibre-map, #mainmap, #detailmap, .map-panel"
        ).first.wait_for(state="visible", timeout=timeout)

    def open_user_menu(self):
        self.page.locator("#navbarDropdownUsermenuLink").first.click()

    def wait_for_dropdown_menu(self, timeout=5000):
        self.page.locator(
            ".dropdown-menu.show, .dropdown.show .dropdown-menu"
        ).first.wait_for(state="visible", timeout=timeout)

    def set_tinymce_content(self, tinymce_id, content):
        self.page.evaluate(
            """([id, text]) => {
                if (window.tinymce) {
                    const editor = window.tinymce.get(id);
                    if (editor) {
                        editor.setContent(text);
                        editor.save();
                        return;
                    }
                }
                const el = document.getElementById(id);
                if (el) {
                    el.value = text;
                }
            }""",
            [tinymce_id, content],
        )

    def get_tinymce_content(self, tinymce_id):
        return self.page.evaluate(
            """(id) => {
                if (window.tinymce) {
                    const editor = window.tinymce.get(id);
                    if (editor) {
                        return editor.getContent();
                    }
                }
                const el = document.getElementById(id);
                return el ? el.value : '';
            }""",
            tinymce_id,
        )

    def wait_for_geoman(self, timeout=15000):
        self.page.wait_for_function(
            """() => {
                if (!window.gm || !window.gm.loaded || !window.gm.features) {
                    return false;
                }
                const geomInput = document.getElementById("id_geom");
                const hasInitialGeom = Boolean(
                    geomInput && geomInput.value && geomInput.value.trim().length > 0
                );
                if (document.body && document.body.dataset && document.body.dataset.pk && hasInitialGeom) {
                    const exported = window.gm.features.exportGeoJsonFromSource("gm_main");
                    if (!exported || !exported.features || exported.features.length === 0) {
                        return false;
                    }
                    if (!window.__e2eGmEditLoadedAt) {
                        window.__e2eGmEditLoadedAt = performance.now();
                        return false;
                    }
                    return (performance.now() - window.__e2eGmEditLoadedAt) >= 950;
                }
                return true;
            }""",
            timeout=timeout,
        )

    def assert_geoman_features_count(self, expected_count, timeout=10000):
        deadline = time.monotonic() + (timeout / 1000.0)
        last_count = None
        while True:
            try:
                last_count = self.page.evaluate(
                    """() => {
                        if (!window.gm || !window.gm.features) return null;
                        return window.gm.features.exportGeoJsonFromSource("gm_main").features.length;
                    }"""
                )
                if last_count == expected_count:
                    return
            except Exception:
                pass
            if time.monotonic() >= deadline:
                self.assertEqual(last_count, expected_count)
            self.page.wait_for_timeout(100)

    def assert_geom_field_value(self, assertions_fn=None, timeout=10000):
        deadline = time.monotonic() + (timeout / 1000.0)
        last_error = None
        while True:
            val = self.page.locator("#id_geom").input_value(timeout=timeout)
            try:
                self.assertTrue(val, "id_geom value should not be empty")
                data = json.loads(val)
                if assertions_fn is not None:
                    try:
                        assertions_fn(data, val)
                    except TypeError:
                        assertions_fn(data)
                return data
            except (AssertionError, json.JSONDecodeError) as err:
                last_error = err
                if time.monotonic() >= deadline:
                    raise last_error
                self.page.wait_for_timeout(100)

    def click_canvas(self, x, y, force=True):
        self.page.locator(".maplibregl-canvas").first.click(
            position={"x": x, "y": y},
            force=force,
        )
        self.page.wait_for_timeout(60)

    def wait_for_context_saved(
        self, expected_value=None, key_substring="context", timeout=10000
    ):
        self.page.wait_for_function(
            """([sub, expected]) => {
                window.dispatchEvent(new Event('visibilitychange'));
                const keys = Object.keys(window.localStorage).filter(k => k.includes(sub));
                if (keys.length === 0) return false;
                if (!expected) return true;
                const expectedList = Array.isArray(expected) ? expected : [expected];
                return keys.some(k => {
                    const raw = window.localStorage.getItem(k) || "";
                    return expectedList.every(val => raw.includes(val));
                });
            }""",
            arg=[key_substring, expected_value],
            timeout=timeout,
        )
