from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from mapentity.middleware import get_internal_user
from mapentity.tests.factories import SuperUserFactory
from mapentity.tokens import TokenManager

User = get_user_model()


class AutoLoginMiddlewareTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = SuperUserFactory()

    def setUp(self):
        call_command('update_permissions_mapentity')

    def test_user_authenticated_no_token(self):
        self.client.force_login(self.user)
        response = self.client.get('/dummymodel/list/')

        self.assertTrue(response.status_code == 200)
        self.assertEqual(response.wsgi_request.user, self.user)

    def test_user_authenticated_with_valid_token(self):
        self.client.force_login(self.user)
        auth_token = TokenManager.generate_token()
        response = self.client.get(f'/dummymodel/list/?auth_token={auth_token}')

        self.assertTrue(response.status_code == 200)
        self.assertEqual(response.wsgi_request.user, self.user)

    def test_user_authenticated_with_invalid_token(self):
        self.client.force_login(self.user)
        auth_token = 'invalid_token'
        response = self.client.get(f'/dummymodel/list/?auth_token={auth_token}')

        self.assertTrue(response.status_code == 200)
        self.assertEqual(response.wsgi_request.user, self.user)

    def test_user_not_authenticated_no_token(self):
        response = self.client.get('/dummymodel/list/')

        self.assertEqual(response.status_code, 302)
        self.assertIn('/login/', response.url)

    def test_user_not_authenticated_with_invalid_token(self):
        auth_token = 'invalid_token'
        response = self.client.get(f'/dummymodel/list/?auth_token={auth_token}')

        self.assertEqual(response.status_code, 302)
        self.assertIn('/login/', response.url)

    def test_user_not_authenticated_with_valid_token(self):
        auth_token = TokenManager.generate_token()
        response = self.client.get(f'/dummymodel/list/?auth_token={auth_token}')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.wsgi_request.user, get_internal_user())

        # A token can't be used twice
        self.assertFalse(TokenManager.verify_token(auth_token))
