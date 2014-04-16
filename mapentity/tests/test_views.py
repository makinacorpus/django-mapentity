import os
import shutil

import mock
from django.conf import settings
from django.test import TestCase, RequestFactory
from django.test.utils import override_settings
from django.contrib.auth import get_user_model

from mapentity.views.generic import MapEntityList
from .models import DummyModel


User = get_user_model()


class BaseTest(TestCase):
    def login(self):
        user = User.objects.create_user('aah', 'email@corp.com', 'booh')
        success = self.client.login(username=user.username, password='booh')
        self.assertTrue(success)
        return user


@override_settings(MEDIA_ROOT='/tmp/mapentity-media', DEBUG=True)
class MediaTest(BaseTest):

    def setUp(self):
        if os.path.exists(settings.MEDIA_ROOT):
            self.tearDown()
        os.makedirs(settings.MEDIA_ROOT)
        self.file = os.path.join(settings.MEDIA_ROOT, 'file.pdf')
        self.url = '/media/file.pdf'
        open(self.file, 'wb').write('*' * 300)

    def tearDown(self):
        shutil.rmtree(settings.MEDIA_ROOT)

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
        self.assertContains(response, '*********')

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


def setup_view(view, request, *args, **kwargs):
    """*args and **kwargs you could pass to ``reverse()``."""
    view.request = request
    view.args = args
    view.kwargs = kwargs
    return view


class DummyFilterForm(object):
    def __init__(self, params, queryset):
        self.qs = queryset


class DummyList(MapEntityList):
    model = DummyModel
    filterform = DummyFilterForm
    template_name = 'mapentity/entity_list.html'


class ListViewTest(BaseTest):

    def setUp(self):
        self.user = User.objects.create_user('aah', 'email@corp.com', 'booh')

        def user_perms(p):
            return {'tests.export_dummymodel': False}.get(p, True)

        self.user.has_perm = mock.MagicMock(side_effect=user_perms)

    def test_list_should_have_some_perms_in_context(self):
        view = DummyList()
        view.object_list = []
        view.request = RequestFactory().get('/fake-path')
        view.request.user = self.user
        context = view.get_context_data()
        self.assertEqual(context['can_add'], True)
        self.assertEqual(context['can_export'], False)

    def test_list_should_render_some_perms_in_template(self):
        request = RequestFactory().get('/fake-path')
        request.user = self.user
        request.session = {}
        view = DummyList.as_view()
        response = view(request)
        html = unicode(response.render())

        self.assertTrue('btn-group disabled' in html)
        self.assertTrue('Add</a>' in html)


class ViewPermissionsTest(TestCase):
    def test_views_name_depend_on_model(self):
        view = DummyList()
        self.assertEqual(view.get_view_perm(), 'tests.read_dummymodel')
