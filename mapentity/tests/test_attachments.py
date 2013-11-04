from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.files.uploadedfile import SimpleUploadedFile

from paperclip.models import Attachment, FileType
from paperclip.views import add_url_for_obj

from mapentity.views.generic import MapEntityDetail
from .models import DummyModel


User = get_user_model()


class EntityAttachmentTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('howard', 'h@w.com', 'booh')
        self.object = DummyModel.objects.create()

    def createAttachment(self, obj):
        uploaded = SimpleUploadedFile('file.odt',
                                      '*' * 128,
                                      content_type='application/vnd.oasis.opendocument.text')
        kwargs = {
            'content_type': ContentType.objects.get_for_model(obj),
            'object_id': obj.pk,
            'filetype': FileType.objects.create(),
            'creator': self.user,
            'title': "Attachment title",
            'legend': "Attachment legend",
            'attachment_file': uploaded
        }
        return Attachment.objects.create(**kwargs)

    def test_list_attachments_in_details(self):
        self.createAttachment(self.object)

        request = RequestFactory().get('/dummy')
        request.session = {}
        request.user = self.user
        view = MapEntityDetail.as_view(model=DummyModel,
                                       template_name="mapentity/entity_detail.html")
        response = view(request, pk=self.object.pk)
        html = unicode(response.render())
        self.assertTemplateUsed(response, template_name='paperclip/details.html')

        self.assertEqual(1, len(Attachment.objects.attachments_for_object(self.object)))

        for attachment in Attachment.objects.attachments_for_object(self.object):
            self.assertTrue(attachment.legend in html)
            self.assertTrue(attachment.title in html)
            self.assertTrue(attachment.attachment_file.url in html)
            self.assertTrue('paperclip/fileicons/odt.png')
