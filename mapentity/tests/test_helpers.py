import os

import mock
from django.test import TestCase

from .. import app_settings
from ..helpers import (
    capture_url,
    convertit_url,
    user_has_perm,
    download_to_stream
)


class MapEntityCaptureHelpersTest(TestCase):

    def test_capture_url_uses_setting(self):
        app_settings['CAPTURE_SERVER'] = 'https://vlan'
        url = capture_url('')
        self.assertTrue(url.startswith('https://vlan'))

    def test_capture_url_is_escaped(self):
        url = capture_url('http://geotrek.fr')
        self.assertIn('http%3A//geotrek.fr', url)

    def test_capture_url_with_no_params(self):
        url = capture_url('http://geotrek.fr')
        self.assertNotIn('width', url)
        self.assertNotIn('height', url)
        self.assertNotIn('selector', url)

    def test_capture_url_with_width_params(self):
        url = capture_url('http://geotrek.fr', width=800)
        self.assertIn('width=800', url)

    def test_capture_url_with_selector_params(self):
        url = capture_url('http://geotrek.fr', selector="#bazinga")
        self.assertIn('%23bazinga', url)


class MapEntityConvertHelpersTest(TestCase):

    def test_convert_url_uses_setting(self):
        app_settings['CONVERSION_SERVER'] = 'https://vlan'
        url = convertit_url('')
        self.assertTrue(url.startswith('https://vlan'))

    def test_convert_url_is_escaped(self):
        url = convertit_url('http://geotrek.fr')
        self.assertIn('http%3A//geotrek.fr', url)

    def test_convert_url_default_is_pdf(self):
        url = convertit_url('')
        self.assertIn('to=application/pdf', url)
        url = convertit_url('', to_type=None)
        self.assertIn('to=application/pdf', url)

    def test_convert_url_default_no_from(self):
        url = convertit_url('')
        self.assertNotIn('from=', url)

    def test_convert_url_format_extension_becomes_mimetype(self):
        url = convertit_url('', to_type="doc")
        self.assertIn('to=application/msword', url)

    def test_convert_url_from_is_escaped(self):
        url = convertit_url('', from_type="application/#bb")
        self.assertIn('from=application/%23bb', url)


class UserHasPermTest(TestCase):
    def setUp(self):
        self.user = mock.MagicMock()

    def test_return_true_if_anonymous_has_perm(self):
        app_settings['ANONYMOUS_VIEWS_PERMS'] = ('view-perm',)
        self.assertTrue(user_has_perm(self.user, 'view-perm'))


class DownloadStreamTest(TestCase):

    @mock.patch('mapentity.helpers.requests.get')
    def test_headers_can_be_specified_for_download(self, get_mocked):
        # Required to specified language for example
        download_to_stream('http://google.com', open(os.devnull), silent=True, headers={'Accept-language': 'fr'})
        get_mocked.assert_called_with('http://google.com', headers={'Accept-language': 'fr'})
