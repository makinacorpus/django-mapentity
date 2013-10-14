import os
import shutil

from django.conf import settings
from django.test import TestCase, RequestFactory
from django.test.utils import override_settings
from django.contrib.auth import get_user_model

from mapentity.models import MapEntityMixin
from mapentity.views.generic import MapEntityList


User = get_user_model()


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


def setup_view(view, request, *args, **kwargs):
       """*args and **kwargs you could pass to ``reverse()``."""
       view.request = request
       view.args = args
       view.kwargs = kwargs
       return view


class FakeModel(MapEntityMixin, User):
        @classmethod
        def get_jsonlist_url(self):
            return ''
        @classmethod
        def get_generic_detail_url(self):
            return ''


class ListViewTest(TestCase):

    def test_list_should_have_can_add_in_context(self):
        view = setup_view(MapEntityList(model=FakeModel),
                          RequestFactory().get('/fake-path'))
        context = view.get_context_data(object_list=[])
        self.assertEqual(context['can_add'], view.can_add())
        self.assertEqual(context['can_export'], view.can_export())
