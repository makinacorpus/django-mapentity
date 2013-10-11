from django.conf import settings
from django.test import TestCase
from django.test.client import RequestFactory

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from .. import middleware
from ..middleware import AutoLoginMiddleware, get_internal_user


User = get_user_model()


class AutoLoginTest(TestCase):
    def setUp(self):
        self.middleware = AutoLoginMiddleware()
        self.request = RequestFactory()
        self.request.user = AnonymousUser()  # usually set by other middleware
        self.request.META = {'REMOTE_ADDR': '6.6.6.6'}
        self.internal_user = get_internal_user()

    def test_internal_user_cannot_login(self):
        success = self.client.login(
            username=self.internal_user.username,
            password=settings.SECRET_KEY)
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
        self.assertEqual(self.request.user, self.internal_user)

    def test_auto_login_for_capture(self):
        middleware.CAPTURE_SERVER_HOST = '4.5.6.7'
        self.request.META['REMOTE_ADDR'] = '4.5.6.7'

        self.assertTrue(self.request.user.is_anonymous())
        self.middleware.process_request(self.request)
        self.assertFalse(self.request.user.is_anonymous())
        self.assertEqual(self.request.user, self.internal_user)

    def test_auto_login_for_conversion_host(self):
        middleware.CONVERSION_SERVER_HOST = 'convertit.makina.com'
        self.request.META['REMOTE_HOST'] = 'convertit.makina.com'

        self.assertTrue(self.request.user.is_anonymous())
        self.middleware.process_request(self.request)
        self.assertFalse(self.request.user.is_anonymous())
        self.assertEqual(self.request.user, self.internal_user)

    def test_auto_login_for_capture_host(self):
        middleware.CAPTURE_SERVER_HOST = 'capture.makina.com'
        self.request.META['REMOTE_HOST'] = 'capture.makina.com'

        self.assertTrue(self.request.user.is_anonymous())
        self.middleware.process_request(self.request)
        self.assertFalse(self.request.user.is_anonymous())
        self.assertEqual(self.request.user, self.internal_user)
