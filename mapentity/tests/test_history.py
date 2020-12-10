from django.contrib.admin.models import ADDITION, CHANGE, DELETION
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.http import HttpRequest
from django.test.client import Client
from django.test import TestCase

from mapentity.models import LogEntry
from mapentity.registry import app_settings
from mapentity.views.generic import log_action

from mapentity.tests.factories import DummyModelFactory
from test_app.models import DummyModel


User = get_user_model()


class TestActionsHistory(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_superuser('test', 'email@corp.com', 'booh')
        self.client.login(username='test', password='booh')

    def test_create_view_logs_addition(self):
        self.client.post('/dummymodel/add/', data={
            'name': 'test',
            'geom': '{"type": "Point", "coordinates": [0, 0]}',
            'model': 'dummymodel',
        })
        self.assertEqual(LogEntry.objects.count(), 1)
        entry = LogEntry.objects.get()
        obj = DummyModel.objects.get()
        self.assertEqual(entry.get_edited_object(), obj)
        self.assertEqual(entry.action_flag, ADDITION)
        self.assertEqual(entry.user, self.user)

    def test_update_view_logs_change(self):
        obj = DummyModelFactory.create()
        self.client.post('/dummymodel/edit/{0}/'.format(obj.pk), data={
            'name': 'test',
            'geom': '{"type": "Point", "coordinates": [0, 0]}',
            'model': 'dummymodel',
        })
        self.assertEqual(LogEntry.objects.count(), 1)
        entry = LogEntry.objects.get()
        self.assertEqual(entry.get_edited_object(), obj)
        self.assertEqual(entry.action_flag, CHANGE)
        self.assertEqual(entry.user, self.user)

    def test_delete_view_logs_deletion(self):
        obj = DummyModelFactory.create()
        self.client.post('/dummymodel/delete/{0}/'.format(obj.pk))
        self.assertEqual(LogEntry.objects.count(), 1)
        entry = LogEntry.objects.get()
        self.assertEqual(entry.object_id, str(obj.pk))
        self.assertEqual(entry.action_flag, DELETION)
        self.assertEqual(entry.user, self.user)

    def test_anonymous_action(self):
        self.client.logout()
        self.client.post('/dummymodel/add/', data={
            'name': 'test',
            'geom': '{"type": "Point", "coordinates": [0, 0]}',
            'model': 'dummymodel',
        })
        self.assertEqual(LogEntry.objects.count(), 0)


class TestCreator(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser('test', 'email@corp.com', 'booh')
        self.request = HttpRequest()
        self.request.user = self.user
        self.obj = DummyModelFactory.create()

    def test_no_creator(self):
        """No crash if no creator in history table"""
        self.assertIsNone(self.obj.creator)

    def test_creator(self):
        log_action(self.request, self.obj, ADDITION)
        self.assertEqual(self.obj.creator, self.user)

    def test_not_authenticated(self):
        self.request.user = AnonymousUser()
        log_action(self.request, self.obj, ADDITION)
        self.assertIsNone(self.obj.creator)

    def test_action_history_not_enabled(self):
        app_settings["ACTION_HISTORY_ENABLED"] = False
        log_action(self.request, self.obj, ADDITION)
        self.assertIsNone(self.obj.creator)
        app_settings["ACTION_HISTORY_ENABLED"] = True

    def test_multiple_creators(self):
        """No crash if multiple creators in history table"""
        log_action(self.request, self.obj, ADDITION)
        user2 = User.objects.create_superuser('test2', 'email2@corp.com', 'booh2')
        self.request.user = user2
        log_action(self.request, self.obj, ADDITION)
        self.assertEqual(self.obj.creator, user2)
