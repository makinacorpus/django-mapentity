from django.test import TestCase

from mapentity.helpers import clone_attachment
from mapentity.tests.factories import AttachmentFactory

from ..models import Attachment, DummyModel, ManikinModel, Road, Sector
from .factories import DummyModelFactory, SectorFactory


class MapEntityDuplicateMixinTest(TestCase):
    def test_cant_duplicate(self):
        sample_object = Road.objects.create()
        sample_object.duplicate()
        self.assertEqual(1, Road.objects.count())

    def test_can_duplicate(self):
        sample_object = DummyModel.objects.create()
        sample_object.duplicate()
        self.assertEqual(2, DummyModel.objects.count())

    def test_duplicate_change_field_callable(self):
        sample_object = DummyModelFactory.create()

        def upper_name(lower_name):
            return lower_name.upper()

        sample_object.duplicate(name=upper_name)
        self.assertEqual(2, DummyModel.objects.count())
        self.assertIn(
            "A DUMMY MODEL", list(DummyModel.objects.values_list("name", flat=True))
        )

    def test_duplicate_change_field_not_callable(self):
        sample_object = DummyModelFactory.create()

        sample_object.duplicate(name="test")
        self.assertEqual(2, DummyModel.objects.count())
        self.assertIn("test", list(DummyModel.objects.values_list("name", flat=True)))

    def test_duplicate_change_attachments_callable(self):
        sample_object = DummyModelFactory.create()
        AttachmentFactory.create(content_object=sample_object, title="attachment")

        def upper_title(lower_title):
            return lower_title.upper()

        sample_object.duplicate(attachments={"title": upper_title})

        self.assertEqual(2, DummyModel.objects.count())
        self.assertIn(
            "ATTACHMENT", list(Attachment.objects.values_list("title", flat=True))
        )

    def test_duplicate_change_attachments_not_callable(self):
        sample_object = DummyModelFactory.create()
        AttachmentFactory.create(content_object=sample_object, title="attachment")

        sample_object.duplicate(attachments={"title": "test"})
        self.assertEqual(2, DummyModel.objects.count())
        self.assertIn("test", list(Attachment.objects.values_list("title", flat=True)))

    def test_duplicate_rollback_error_attachments(self):
        sample_object = DummyModelFactory.create()
        AttachmentFactory.create(content_object=sample_object, title="attachment")

        def raise_error(title):
            msg = f"This is an exception : {title}"
            raise Exception(msg)

        with self.assertRaisesRegex(Exception, "This is an exception : attachment"):
            sample_object.duplicate(attachments={"title": raise_error})
        self.assertEqual(1, DummyModel.objects.count())

    def test_duplicate_attachments(self):
        sample_object = DummyModelFactory.create()
        attachment = AttachmentFactory.create(
            content_object=sample_object, title="attachment"
        )
        clone_attachment(attachment, "attachment_file")
        self.assertEqual(2, Attachment.objects.count())

    def test_duplicate_different_autofield(self):
        sample_object = SectorFactory.create()
        sample_object.duplicate(skip_attachments=True)
        self.assertEqual(2, Sector.objects.count())

    def test_cant_duplicate_no_url(self):
        dm = DummyModelFactory.create()
        mk = ManikinModel.objects.create(dummy=dm)
        self.assertIsNone(ManikinModel.get_duplicate_url(mk))
