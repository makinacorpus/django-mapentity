# -*- coding: utf-8 -*-
import os
import md5
import time
import shutil
import StringIO
import csv
import urllib2

from django.conf import settings
from django.utils.http import http_date
from django.utils.translation import ugettext_lazy as _
from django.utils.encoding import force_unicode
from django.test import TestCase, LiveServerTestCase
from django.test.utils import override_settings
from django.test.testcases import to_list
from django.utils import html
from django.contrib.auth.models import User
from mock import patch
import requests

from . import app_settings
from .helpers import smart_urljoin, capture_url, convertit_url
from .forms import MapEntityForm


@override_settings(MEDIA_ROOT='/tmp/mapentity-media')
class MapEntityTest(TestCase):
    model = None
    modelfactory = None
    userfactory = None

    def setUp(self):
        if os.path.exists(settings.MEDIA_ROOT):
            self.tearDown()
        os.makedirs(settings.MEDIA_ROOT)

    def tearDown(self):
        shutil.rmtree(settings.MEDIA_ROOT)

    def login(self):
        user = self.userfactory(password='booh')
        success = self.client.login(username=user.username, password='booh')
        self.assertTrue(success)

    def logout(self):
        self.client.logout()

    def get_bad_data(self):
        return {'topology': 'doh!'}, _(u'Topology is not valid.')

    def get_good_data(self):
        raise NotImplementedError()

    def get_form(self, response):
        form = None
        for c in response.context:
            _form = c.get('form')
            if _form and isinstance(_form, MapEntityForm):
                form = _form
                break

        if not form:
            self.fail(u'Could not find form')
        return form

    def test_status(self):
        if self.model is None:
            return  # Abstract test should not run

        # Make sure database is not empty for this model
        for i in range(30):
            self.modelfactory.create()

        # JSON layers do not require authent
        response = self.client.get(self.model.get_layer_url())
        self.assertEqual(response.status_code, 200)
        response = self.client.get(self.model.get_jsonlist_url())
        self.assertEqual(response.status_code, 200)

        # Document layer either
        obj = self.modelfactory.create()
        # Will have to mock screenshot, though.
        with open(obj.get_map_image_path(), 'w') as f:
            f.write('This is fake PNG file')
        response = self.client.get(obj.get_document_url())
        self.assertEqual(response.status_code, 200)
        os.remove(obj.get_map_image_path())

    def test_bbox_filter(self):
        if self.model is None:
            return  # Abstract test should not run
        params = '?bbox=POLYGON((5+44+0%2C5+45+0%2C6+45+0%2C6+44+0%2C5+44+0))'
        # If no objects exist, should not fail.
        response = self.client.get(self.model.get_jsonlist_url()+params)
        self.assertEqual(response.status_code, 200)
        # If object exists, either :)
        self.modelfactory.create()
        response = self.client.get(self.model.get_jsonlist_url()+params)
        self.assertEqual(response.status_code, 200)
        # If bbox is invalid, it should return all
        allresponse = self.client.get(self.model.get_jsonlist_url())
        params = '?bbox=POLYGON(prout)'
        response = self.client.get(self.model.get_jsonlist_url()+params)
        self.assertEqual(response.status_code, 200)
        response.content = allresponse.content

    def test_basic_format(self):
        if self.model is None:
            return  # Abstract test should not run
        self.login()
        self.modelfactory.create()
        for fmt in ('csv', 'shp', 'gpx'):
            response = self.client.get(self.model.get_format_list_url() + '?format=' + fmt)
            self.assertEqual(response.status_code, 200, u"")

    def test_no_html_in_csv(self):
        if self.model is None:
            return  # Abstract test should not run

        self.login()

        self.modelfactory.create()

        fmt = 'csv'
        response = self.client.get(self.model.get_format_list_url() + '?format=' + fmt)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get('Content-Type'), 'text/csv')

        # Read the csv
        lines = list(csv.reader(StringIO.StringIO(response.content), delimiter=','))

        # There should be one more line in the csv than in the items: this is the header line
        self.assertEqual(len(lines), self.model.objects.all().count() + 1)

        for line in lines:
            for col in line:
                # the col should not contains any html tags
                self.assertEquals(force_unicode(col), html.strip_tags(col))

    def _post_form(self, url):
        # no data
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)

        bad_data, form_error = self.get_bad_data()
        response = self.client.post(url, bad_data)
        self.assertEqual(response.status_code, 200)

        form = self.get_form(response)

        fields_errors = form.errors[bad_data.keys()[0]]
        form_errors = to_list(form_error)
        for err in form_errors:
            self.assertTrue(unicode(err) in fields_errors,
                            "'%s' not in %s" % (unicode(err), fields_errors))

        response = self.client.post(url, self.get_good_data())
        if response.status_code != 302:
            form = self.get_form(response)
            self.assertEqual(form.errors, [])  # this will show form errors

        self.assertEqual(response.status_code, 302)  # success, redirects to detail view

    def _post_add_form(self):
        self._post_form(self.model.get_add_url())

    def _post_update_form(self, obj):
        self._post_form(obj.get_update_url())

    def test_crud_status(self):
        if self.model is None:
            return  # Abstract test should not run

        self.login()

        obj = self.modelfactory()

        response = self.client.get(obj.get_list_url())
        self.assertEqual(response.status_code, 200)

        response = self.client.get(obj.get_detail_url().replace(str(obj.pk), '1234567890'))
        self.assertEqual(response.status_code, 404)

        response = self.client.get(obj.get_detail_url())
        self.assertEqual(response.status_code, 200)

        response = self.client.get(obj.get_update_url())
        self.assertEqual(response.status_code, 200)

        self._post_update_form(obj)

        response = self.client.get(obj.get_delete_url())
        self.assertEqual(response.status_code, 200)

        url = obj.get_detail_url()
        obj.delete()
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

        self._post_add_form()

        # Test to update without login
        self.logout()

        obj = self.modelfactory()

        response = self.client.get(self.model.get_add_url())
        self.assertEqual(response.status_code, 302)
        response = self.client.get(obj.get_update_url())
        self.assertEqual(response.status_code, 302)


class MapEntityLiveTest(LiveServerTestCase):
    model = None
    userfactory = None
    session = None

    def url_for(self, path):
        return smart_urljoin(self.live_server_url, path)

    def login(self):
        user = self.userfactory(password='booh')
        self.session = requests.Session()
        response = self.session.get(self.live_server_url)
        csrftoken = response.cookies.get('csrftoken', '')
        response = self.session.post(self.url_for('/login/'), 
                                    {'username': user.username,
                                     'password': 'booh',
                                     'csrfmiddlewaretoken': csrftoken})

    def test_geojson_cache(self):
        if self.model is None:
            return  # Abstract test should not run
        self.login()
        obj = self.modelfactory()
        response = self.session.get(self.url_for(obj.get_layer_url()))
        self.assertEqual(response.status_code, 200)
        # Without headers to cache
        latest = obj.latest_updated()
        lastmodified = response.headers.get('Last-Modified')
        md5sum = md5.new(response.content).digest()
        self.assertNotEqual(lastmodified, None)

        # Try again, check that nothing changed
        response = self.session.get(self.url_for(obj.get_layer_url()))
        self.assertEqual(lastmodified, response.headers.get('Last-Modified'))
        self.assertEqual(md5sum, md5.new(response.content).digest())

        # Create a new object
        time.sleep(1)  # wait some time, last-modified has precision in seconds
        self.modelfactory()
        self.assertNotEqual(latest, obj.latest_updated())
        response = self.session.get(self.url_for(obj.get_layer_url()))
        # Check that last modified and content changed
        self.assertNotEqual(lastmodified, response.headers.get('Last-Modified'))
        self.assertNotEqual(md5sum, md5.new(response.content).digest())

        # Ask again with headers, and expect a 304 status (not changed)
        lastmodified = response.headers.get('Last-Modified')
        response = self.session.get(self.url_for(obj.get_layer_url()),
                                    headers={'if-modified-since': lastmodified})
        self.assertEqual(response.status_code, 304)

        # Ask again with headers in the past, and expect a 200
        response = self.session.get(self.url_for(obj.get_layer_url()),
                                    headers={'if-modified-since': http_date(1000)})
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(md5sum, md5.new(response.content).digest())

    @patch('mapentity.helpers.requests')
    def test_map_image(self, mock_requests):
        if self.model is None:
            return  # Abstract test should not run

        obj = self.modelfactory.create()

        # Initially, map image does not exists
        image_path = obj.get_map_image_path()
        if os.path.exists(image_path):
            os.remove(image_path)
        self.assertFalse(os.path.exists(image_path))

        # Move Screenshot response
        mock_requests.get.return_value.status_code = 200
        mock_requests.get.return_value.content = '*' * 100

        obj.prepare_map_image(self.live_server_url)
        self.assertTrue(os.path.exists(image_path))

        mapimage_url = '%s%s?context' % (self.live_server_url, obj.get_detail_url())
        screenshot_url = 'http://0.0.0.0:8001/?url=%s' % urllib2.quote(mapimage_url)
        url_called = mock_requests.get.call_args_list[0]
        self.assertTrue(url_called.startswith(screenshot_url))


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



@override_settings(MEDIA_ROOT='/tmp/mapentity-media', DEBUG=True)
class MediaTest(TestCase):

    def setUp(self):
        if os.path.exists(settings.MEDIA_ROOT):
            self.tearDown()
        os.makedirs(settings.MEDIA_ROOT)
        self.file = os.path.join(settings.MEDIA_ROOT, 'file.pdf')
        self.url = '/media/file.pdf'
        open(self.file, 'wb').write('*' * 300)

    def tearDown(self):
        shutil.rmtree(settings.MEDIA_ROOT)

    def login(self):
        user = User.objects.create_user('aah', 'email@corp.com', 'booh')
        success = self.client.login(username=user.username, password='booh')
        self.assertTrue(success)

    def download(self, url):
        return self.client.get(url, REMOTE_ADDR="6.6.6.6")

    def test_media_are_protected(self):
        self.client.logout()
        response = self.download(self.url)
        self.assertEqual(response.status_code, 302)

    def test_authenticated_user_can_access(self):
        self.login()
        response = self.download(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('*********', response.content)

    def test_404_if_file_is_missing(self):
        os.remove(self.file)
        self.login()
        response = self.download(self.url)
        self.assertEqual(response.status_code, 404)

    def test_nginx_accel_if_not_debug(self):
        settings.DEBUG = False
        self.login()
        response = self.download(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '')
        self.assertEqual(response['X-Accel-Redirect'], '%s%s' % (settings.MEDIA_URL_SECURE, 'file.pdf'))


from . import middleware
from .middleware import AutoLoginMiddleware, internal_user
from django.test.client import RequestFactory

from django.contrib.auth.models import AnonymousUser


class AutoLoginTest(TestCase):
    def setUp(self):
        self.middleware = AutoLoginMiddleware()
        self.request = RequestFactory()
        self.request.user = AnonymousUser()  # usually set by other middleware
        self.request.META = {'REMOTE_ADDR': '6.6.6.6'}

    def test_internal_user_cannot_login(self):
        success = self.client.login(username=internal_user.username, password=settings.SECRET_KEY)
        self.assertFalse(success)

    def test_login_still_required_works(self):
        middleware.CONVERSION_SERVER_HOST = '1.2.3.4'
        response = self.client.get('/media/file.pdf', REMOTE_ADDR='1.2.3.5')
        self.assertEqual(302, response.status_code)
        response = self.client.get('/media/file.pdf', REMOTE_ADDR='1.2.3.4')
        self.assertEqual(200, response.status_code)

    def test_auto_login_do_not_change_current_user(self):
        user = User.objects.create_user('aah', 'email@corp.com', 'booh')
        self.request.user = user
        self.middleware.process_request(self.request)
        self.assertEqual(self.request.user, user)

    def test_auto_login_do_not_log_whoever(self):
        self.middleware.process_request(self.request)
        self.assertTrue(self.request.user.is_anonymous())

    def test_auto_login_for_conversion(self):
        middleware.CONVERSION_SERVER_HOST = '1.2.3.4'
        self.request.META['REMOTE_ADDR'] = '1.2.3.4'

        self.assertTrue(self.request.user.is_anonymous())
        self.middleware.process_request(self.request)
        self.assertFalse(self.request.user.is_anonymous())
        self.assertEqual(self.request.user, internal_user)

    def test_auto_login_for_capture(self):
        middleware.CAPTURE_SERVER_HOST = '4.5.6.7'
        self.request.META['REMOTE_ADDR'] = '4.5.6.7'

        self.assertTrue(self.request.user.is_anonymous())
        self.middleware.process_request(self.request)
        self.assertFalse(self.request.user.is_anonymous())
        self.assertEqual(self.request.user, internal_user)

    def test_auto_login_for_conversion_host(self):
        middleware.CONVERSION_SERVER_HOST = 'convertit.makina.com'
        self.request.META['REMOTE_HOST'] = 'convertit.makina.com'

        self.assertTrue(self.request.user.is_anonymous())
        self.middleware.process_request(self.request)
        self.assertFalse(self.request.user.is_anonymous())
        self.assertEqual(self.request.user, internal_user)

    def test_auto_login_for_capture_host(self):
        middleware.CAPTURE_SERVER_HOST = 'capture.makina.com'
        self.request.META['REMOTE_HOST'] = 'capture.makina.com'

        self.assertTrue(self.request.user.is_anonymous())
        self.middleware.process_request(self.request)
        self.assertFalse(self.request.user.is_anonymous())
        self.assertEqual(self.request.user, internal_user)
