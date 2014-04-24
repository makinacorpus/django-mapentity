from django.contrib.admin.models import ADDITION, CHANGE, DELETION
from django.contrib.auth import get_user_model
from django.test.client import Client
from django.test import TestCase

from ..models import LogEntry
from .models import DummyModel


User = get_user_model()


class TestActionsHistory(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_superuser('test', 'email@corp.com', 'booh')
        self.client.login(username='test', password='booh')

    def test_create_view_logs_addition(self):
        self.client.post('/dummymodel/add/', data={
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
        obj = DummyModel.objects.create()
        self.client.post('/dummymodel/edit/{0}/'.format(obj.pk), data={
            'geom': '{"type": "Point", "coordinates": [0, 0]}',
            'model': 'dummymodel',
        })
        self.assertEqual(LogEntry.objects.count(), 1)
        entry = LogEntry.objects.get()
        self.assertEqual(entry.get_edited_object(), obj)
        self.assertEqual(entry.action_flag, CHANGE)
        self.assertEqual(entry.user, self.user)

    def test_delete_view_logs_deletion(self):
        obj = DummyModel.objects.create()
        self.client.post('/dummymodel/delete/{0}/'.format(obj.pk))
        self.assertEqual(LogEntry.objects.count(), 1)
        entry = LogEntry.objects.get()
        self.assertEqual(entry.object_id, str(obj.pk))
        self.assertEqual(entry.action_flag, DELETION)
        self.assertEqual(entry.user, self.user)
