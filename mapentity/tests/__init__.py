import csv
import hashlib
import logging
import time
from io import StringIO
from unittest.mock import patch
from urllib.parse import quote

from bs4 import BeautifulSoup
from django.contrib import messages
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.files.storage import default_storage
from django.test import LiveServerTestCase, TestCase
from django.test.testcases import to_list
from django.urls import reverse
from django.utils import html
from django.utils.encoding import force_str
from django.utils.http import http_date
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _
from freezegun import freeze_time
from paperclip.settings import get_attachment_model

from ..forms import MapEntityForm
from ..helpers import smart_urljoin
from ..models import ENTITY_MARKUP
from ..settings import app_settings
from .factories import AttachmentFactory, SuperUserFactory, UserFactory


class AdjustDebugLevel:
    def __init__(self, name, level):
        self.logger = logging.getLogger(name)
        self.old_level = self.logger.level
        self.new_level = level

    def __enter__(self):
        self.logger.setLevel(self.new_level)

    def __exit__(self, exc_type, exc_value, traceback):
        self.logger.setLevel(self.old_level)


class MapEntityTest(TestCase):
    model = None
    modelfactory = None
    userfactory = None
    maxDiff = None
    user = None

    def get_expected_geojson_geom(self):
        return {}

    def get_expected_geojson_attrs(self):
        return {}

    def get_expected_datatables_attrs(self):
        return {}

    def setUp(self):
        if self.user:
            self.client.force_login(user=self.user)

    @classmethod
    def setUpTestData(cls):
        if cls.userfactory:
            cls.user = cls.userfactory(password='booh')

    def logout(self):
        self.client.logout()

    def get_bad_data(self):
        return {'geom': 'doh!'}, _('Invalid geometry value.')

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
            self.fail('Could not find form')
        return form

    def test_status(self):
        if self.model is None:
            return  # Abstract test should not run

        # Make sure database is not empty for this model
        self.modelfactory.create_batch(30)

        response = self.client.get(self.model.get_layer_list_url())
        self.assertEqual(response.status_code, 200)
        response = self.client.get(self.model.get_datatablelist_url())
        self.assertEqual(response.status_code, 200)

    @patch('mapentity.helpers.requests')
    def test_document_export(self, mock_requests):
        if self.model is None:
            return  # Abstract test should not run

        mock_requests.get.return_value.status_code = 200
        mock_requests.get.return_value.content = b'<p id="properties">Mock</p>'

        obj = self.modelfactory.create()
        response = self.client.get(obj.get_document_url())
        self.assertEqual(response.status_code, 200)

    @patch('mapentity.helpers.requests')
    def test_document_markup(self, mock_requests):
        if self.model is None:
            return  # Abstract test should not run

        mock_requests.get.return_value.status_code = 200
        mock_requests.get.return_value.content = b'<p id="properties">Mock</p>'

        obj = self.modelfactory.create()
        response = self.client.get(reverse(obj._entity.url_name(ENTITY_MARKUP), args=[obj.pk]))
        self.assertEqual(response.status_code, 200)

    def test_bbox_filter(self):
        if self.model is None:
            return  # Abstract test should not run
        params = '?bbox=POLYGON((5+44+0%2C5+45+0%2C6+45+0%2C6+44+0%2C5+44+0))'
        # If no objects exist, should not fail.
        response = self.client.get(self.model.get_datatablelist_url() + params)
        self.assertEqual(response.status_code, 200)
        # If object exists, either :)
        self.modelfactory.create()
        response = self.client.get(self.model.get_datatablelist_url() + params)
        self.assertEqual(response.status_code, 200)
        # If bbox is invalid, it should return all
        allresponse = self.client.get(self.model.get_datatablelist_url())
        params = '?bbox=POLYGON(prout)'
        with AdjustDebugLevel('django.contrib.gis', logging.CRITICAL):
            response = self.client.get(self.model.get_datatablelist_url() + params)
        self.assertEqual(response.status_code, 200)
        response.content = allresponse.content

    def test_basic_format(self):
        if self.model is None:
            return  # Abstract test should not run
        self.modelfactory.create()
        for fmt in ('csv', 'shp', 'gpx'):
            response = self.client.get(self.model.get_format_list_url() + '?format=' + fmt)
            self.assertEqual(response.status_code, 200)

    def test_gpx_elevation(self):
        if self.model is None:
            return  # Abstract test should not run
        obj = self.modelfactory.create()
        response = self.client.get(self.model.get_format_list_url() + '?format=gpx')
        parsed = BeautifulSoup(response.content, features='xml')
        if hasattr(obj, 'geom_3d'):
            self.assertGreater(len(parsed.findAll('ele')), 0)
        else:
            self.assertEqual(len(parsed.findAll('ele')), 0)

    def test_no_basic_format_fail(self):
        if self.model is None:
            return  # Abstract test should not run
        self.modelfactory.create()

        response = self.client.get(self.model.get_format_list_url() + '?format=')
        self.assertEqual(response.status_code, 400)

    def test_no_html_in_csv(self):
        if self.model is None:
            return  # Abstract test should not run

        self.modelfactory.create()

        fmt = 'csv'
        response = self.client.get(self.model.get_format_list_url() + '?format=' + fmt)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get('Content-Type'), 'text/csv')

        # Read the csv
        lines = list(csv.reader(StringIO(response.content.decode("utf-8")), delimiter=','))

        # There should be one more line in the csv than in the items: this is the header line
        self.assertEqual(len(lines), self.model.objects.all().count() + 1)

        for line in lines:
            for col in line:
                # the col should not contains any html tags
                self.assertEqual(force_str(col), html.strip_tags(force_str(col)))

    def _post_form(self, url):
        # no data
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)

        bad_data, form_error = self.get_bad_data()
        with AdjustDebugLevel('django.contrib.gis', logging.CRITICAL):
            response = self.client.post(url, bad_data)
        self.assertEqual(response.status_code, 200)

        form = self.get_form(response)

        fields_errors = form.errors[list(bad_data.keys())[0]]
        form_errors = to_list(form_error)
        for err in form_errors:
            self.assertTrue("{}".format(err) in fields_errors,
                            "'%s' not in %s" % (err, fields_errors))

        response = self.client.post(url, self.get_good_data())
        if response.status_code != 302:
            form = self.get_form(response)
            self.assertEqual(form.errors, [])  # this will show form errors

        self.assertEqual(response.status_code, 302)  # success, redirects to detail view

    def _get_add_url(self):
        return self.model.get_add_url()

    def _post_add_form(self):
        self._post_form(self._get_add_url())

    def _post_update_form(self, obj):
        self._post_form(obj.get_update_url())

    def _check_update_geom_permission(self, response):
        if self.user.has_perm('{app}.change_geom_{model}'.format(app=self.model._meta.app_label,
                                                                 model=self.model._meta.model_name)):
            self.assertIn(b'.modifiable = true;', response.content)
        else:
            self.assertIn(b'.modifiable = false;', response.content)

    def test_duplicate(self):
        if self.model is None or not self.model.can_duplicate:
            return  # Abstract test should not run
        user = UserFactory()
        obj = self.modelfactory.create()
        for perm in Permission.objects.exclude(codename=f'add_{obj._meta.model_name}'):
            user.user_permissions.add(perm)
        self.client.force_login(user=user)

        AttachmentFactory.create(content_object=obj, title='attachment')

        self.assertEqual(obj._meta.model.objects.count(), 1)
        self.assertEqual(get_attachment_model().objects.count(), 1)

        response = self.client.post(obj.get_duplicate_url())
        self.assertEqual(response.status_code, 403)
        self.assertEqual(obj._meta.model.objects.count(), 1)
        self.assertEqual(get_attachment_model().objects.count(), 1)

        user.user_permissions.add(Permission.objects.get(codename=f'add_{obj._meta.model_name}'))
        self.client.force_login(user=user)

        response = self.client.post(obj.get_duplicate_url())
        self.assertEqual(response.status_code, 302)
        self.assertEqual(obj._meta.model.objects.count(), 2)
        self.assertEqual(get_attachment_model().objects.count(), 2)

        msg = [str(message) for message in messages.get_messages(response.wsgi_request)]
        self.assertIn(f"{self.model._meta.verbose_name} has been duplicated successfully", msg)

        with patch('mapentity.models.DuplicateMixin.duplicate') as mocked:
            mocked.side_effect = Exception('Error')
            response = self.client.post(obj.get_duplicate_url())

        self.assertEqual(response.status_code, 302)
        self.assertEqual(obj._meta.model.objects.count(), 2)
        self.assertEqual(get_attachment_model().objects.count(), 2)

        msg = [str(message) for message in messages.get_messages(response.wsgi_request)]
        self.assertIn("An error occurred during duplication", msg)

        with patch('mapentity.models.DuplicateMixin.duplicate') as mocked:
            mocked.return_value = None
            response = self.client.post(obj.get_duplicate_url())

        self.assertEqual(response.status_code, 302)
        self.assertEqual(obj._meta.model.objects.count(), 2)
        self.assertEqual(get_attachment_model().objects.count(), 2)

        msg = [str(message) for message in messages.get_messages(response.wsgi_request)]
        self.assertIn("An error occurred during duplication", msg)

    def test_crud_status(self):
        if self.model is None:
            return  # Abstract test should not run

        obj = self.modelfactory()

        response = self.client.get(obj.get_list_url())
        self.assertEqual(response.status_code, 200)

        response = self.client.get(obj.get_layer_list_url())
        self.assertEqual(response.status_code, 200)

        response = self.client.get(obj.get_detail_url().replace(str(obj.pk), '1234567890'))
        self.assertEqual(response.status_code, 404)

        response = self.client.get(obj.get_detail_url())
        self.assertEqual(response.status_code, 200)

        response = self.client.get(obj.get_layer_detail_url())
        self.assertEqual(response.status_code, 200)

        response = self.client.get(obj.get_update_url())
        self.assertEqual(response.status_code, 200)
        self._post_update_form(obj)
        self._check_update_geom_permission(response)

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

    def test_formfilter_in_list_context(self):
        if self.model is None:
            return  # Abstract test should not run
        response = self.client.get(self.model.get_list_url())
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context['filterform'] is not None)

    # REST API tests

    @freeze_time("2020-03-17")
    def test_api_datatables_list_for_model(self):
        if self.model is None:
            return  # Abstract test should not run

        self.obj = self.modelfactory.create()
        list_url = '/api/{modelname}/drf/{modelname}s.datatables'.format(modelname=self.model._meta.model_name)
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, 200, f"{list_url} not found")
        content_json = response.json()

        self.assertEqual(content_json, {'data': [self.get_expected_datatables_attrs()],
                                        'draw': 1,
                                        'recordsFiltered': 1,
                                        'recordsTotal': 1})

    @freeze_time("2020-03-17")
    def test_api_no_format_list_for_model(self):
        if self.model is None:
            return  # Abstract test should not run

        self.obj = self.modelfactory.create()
        list_url = '/api/{modelname}/drf/{modelname}s'.format(modelname=self.model._meta.model_name)
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, 200, f"{list_url} not found")
        content_json = response.json()
        self.assertEqual(content_json, {'data': [self.get_expected_datatables_attrs()],
                                        'draw': 1,
                                        'recordsFiltered': 1,
                                        'recordsTotal': 1})

    @freeze_time("2020-03-17")
    def test_api_geojson_detail_for_model(self):
        if self.get_expected_geojson_attrs is None:
            return
        if self.model is None:
            return  # Abstract test should not run

        self.obj = self.modelfactory.create()
        detail_url = '/api/{modelname}/drf/{modelname}s/{id}.geojson'.format(modelname=self.model._meta.model_name,
                                                                             id=self.obj.pk)
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, 200, f"{detail_url} not found")
        content_json = response.json()
        self.assertEqual(content_json, {
            'type': 'Feature',
            'geometry': self.get_expected_geojson_geom(),
            'properties': self.get_expected_geojson_attrs(),
        })

    @freeze_time("2020-03-17")
    def test_api_geojson_list_for_model(self):
        if self.get_expected_geojson_attrs is None:
            return
        if self.model is None:
            return  # Abstract test should not run

        self.obj = self.modelfactory.create()
        list_url = '/api/{modelname}/drf/{modelname}s.geojson'.format(modelname=self.model._meta.model_name)
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, 200, f"{list_url} not found")
        content_json = response.json()
        self.assertEqual(content_json, {
            'type': 'FeatureCollection',
            'model': f'{self.obj._meta.app_label}.{self.obj._meta.model_name}',
            'features': [{
                'type': 'Feature',
                'geometry': self.get_expected_geojson_geom(),
                'properties': self.get_expected_geojson_attrs(),
            }],
        })


class MapEntityLiveTest(LiveServerTestCase):
    model = None
    userfactory = None
    modelfactory = None
    geom = 'POINT(0 0)'

    def setUp(self):
        app_settings['SENDFILE_HTTP_HEADER'] = None

    def _pre_setup(self):
        # Workaround https://code.djangoproject.com/ticket/10827
        ContentType.objects.clear_cache()
        return super()._pre_setup()

    def url_for(self, path):
        return smart_urljoin(self.live_server_url, path)

    def login(self):
        user = self.userfactory(password='booh')
        login_url = self.url_for('/login/')
        response = self.client.get(login_url,
                                   allow_redirects=False)
        csrftoken = response.cookies['csrftoken']
        response = self.client.post(login_url,
                                    {'username': user.username,
                                     'password': 'booh',
                                     'csrfmiddlewaretoken': csrftoken},
                                    allow_redirects=False)
        self.assertEqual(response.status_code, 302)

    @patch('mapentity.models.MapEntityMixin.latest_updated')
    def test_geojson_cache(self, latest_updated):
        if self.model is None:
            return  # Abstract test should not run

        self.login()
        self.modelfactory.create()
        latest_updated.return_value = now()

        latest = self.model.latest_updated()
        geojson_layer_url = self.url_for(self.model.get_layer_list_url())

        response_1 = self.client.get(geojson_layer_url, allow_redirects=False)
        self.assertEqual(response_1.status_code, 200)

        # Without headers to cache
        lastmodified = response_1.get('Last-Modified')
        cachecontrol = response_1.get('Cache-control')
        hasher = hashlib.md5()
        hasher.update(response_1.content)
        md5sum = hasher.digest()
        self.assertNotEqual(lastmodified, None)
        self.assertCountEqual(cachecontrol.split(', '), ('must-revalidate', 'max-age=0'))

        # Try again, check that nothing changed
        time.sleep(1.1)
        self.assertEqual(latest, self.model.latest_updated())
        response = self.client.get(geojson_layer_url)
        self.assertEqual(lastmodified, response.get('Last-Modified'))
        new_hasher = hashlib.md5()
        new_hasher.update(response.content)
        self.assertEqual(md5sum, new_hasher.digest())

        # Create a new object
        time.sleep(1.1)  # wait some time, last-modified has precision in seconds
        self.modelfactory.create()
        latest_updated.return_value = now()

        self.assertNotEqual(latest, self.model.latest_updated())
        response = self.client.get(geojson_layer_url)
        # Check that last modified and content changed
        self.assertNotEqual(lastmodified, response.get('Last-Modified'))
        new_hasher = hashlib.md5()
        new_hasher.update(response.content)
        self.assertNotEqual(md5sum, new_hasher.digest())

        # Ask again with headers, and expect a 304 status (not changed)
        lastmodified = response.get('Last-Modified')
        response = self.client.get(geojson_layer_url, HTTP_IF_MODIFIED_SINCE=lastmodified)
        self.assertEqual(response.status_code, 304)

        # Ask again with headers in the past, and expect a 200
        response = self.client.get(geojson_layer_url, HTTP_IF_MODIFIED_SINCE=http_date(1000))
        self.assertEqual(response.status_code, 200)
        new_hasher = hashlib.md5()
        new_hasher.update(response.content)
        self.assertNotEqual(md5sum, new_hasher.digest())

    @patch('mapentity.helpers.requests')
    def test_map_image(self, mock_requests):
        if self.model is None:
            return  # Abstract test should not run

        SuperUserFactory.create(username='Superuser', password='booh')
        self.client.login(username='Superuser', password='booh')

        obj = self.modelfactory.create(geom=self.geom)

        # Initially, map image does not exists
        image_path = obj.get_map_image_path()
        if default_storage.exists(image_path):
            default_storage.delete(image_path)
        self.assertFalse(default_storage.exists(image_path))

        # Mock Screenshot response
        mock_requests.get.return_value.status_code = 200
        mock_requests.get.return_value.content = b'*' * 100

        response = self.client.get(obj.map_image_url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(default_storage.exists(image_path))

        mapimage_url = '%s%s?context' % (self.live_server_url, obj.get_detail_url())
        screenshot_url = 'http://0.0.0.0:8001/?url=%s' % quote(mapimage_url)
        url_called = mock_requests.get.call_args_list[0]
        self.assertTrue(url_called.startswith(screenshot_url))

    @patch('mapentity.helpers.requests')
    def test_map_image_as_anonymous_user(self, mock_requests):
        if self.model is None:
            return  # Abstract test should not run

        obj = self.modelfactory.create(geom=self.geom)

        # Mock Screenshot response
        mock_requests.get.return_value.status_code = 200
        mock_requests.get.return_value.content = b'*' * 100

        response = self.client.get(obj.map_image_url)
        self.assertEqual(response.status_code, 200 if obj.is_public() else 403)

    def tearDown(self):
        app_settings['SENDFILE_HTTP_HEADER'] = None
