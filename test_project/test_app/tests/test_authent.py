from django.test import TestCase

from mapentity.tests import UserFactory


class UserProfileTest(TestCase):
    def test_link_to_admin_site_visible_to_staff(self):
        user_staff = UserFactory(is_staff=True)
        self.client.force_login(user_staff)
        response = self.client.get("/", follow=True)
        self.assertContains(response, '<a class="dropdown-item" href="/admin/">')

    def test_link_to_admin_site_not_visible_to_others(self):
        user = UserFactory()
        self.client.force_login(user)
        response = self.client.get("/", follow=True)
        self.assertNotContains(response, 'href="/admin/"')
