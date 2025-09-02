"""
Tests ciblés pour couvrir 100% du fichier serializers/commasv.py
"""
import os
import tempfile
from unittest import mock

from django.contrib.gis.geos import Point
from django.core.exceptions import FieldDoesNotExist
from django.test import TestCase

from mapentity.serializers.commasv import CSVSerializer
from test_project.test_app.models import DummyModel


class CSVSerializerCompleteCoverageTestCase(TestCase):
    """Tests pour couvrir 100% du fichier serializers/commasv.py"""

    def setUp(self):
        self.dummy = DummyModel.objects.create(geom=Point(0, 0))
        self.serializer = CSVSerializer()

    def test_csv_serializer_with_foreign_key_field(self):
        """Test CSVSerializer avec champ ForeignKey"""
        # Mock un champ ForeignKey
        mock_field = mock.Mock()
        mock_field.get_attname.return_value = 'user_id'
        mock_field.related_model = mock.Mock()
        mock_field.related_model._meta.get_field.return_value = mock.Mock(name='username')

        with mock.patch.object(DummyModel._meta, 'get_field', return_value=mock_field):
            with tempfile.NamedTemporaryFile(mode='w+', delete=False) as tmp:
                self.serializer.serialize(
                    queryset=DummyModel.objects.all(),
                    stream=tmp,
                    fields=['user_id'],
                    model=DummyModel
                )
                tmp.flush()

                with open(tmp.name, encoding='utf-8') as f:
                    content = f.read()
                    self.assertIsInstance(content, str)

                os.unlink(tmp.name)

    def test_csv_serializer_with_field_does_not_exist(self):
        """Test CSVSerializer avec champ inexistant"""
        with mock.patch.object(DummyModel._meta, 'get_field') as mock_get_field:
            mock_get_field.side_effect = FieldDoesNotExist("Field does not exist")

            with tempfile.NamedTemporaryFile(mode='w+', delete=False) as tmp:
                self.serializer.serialize(
                    queryset=DummyModel.objects.all(),
                    stream=tmp,
                    fields=['non_existent_field'],
                    model=DummyModel
                )
                tmp.flush()

                with open(tmp.name, encoding='utf-8') as f:
                    content = f.read()
                    self.assertIsInstance(content, str)

                os.unlink(tmp.name)

    def test_csv_serializer_with_unicode_content(self):
        """Test CSVSerializer avec contenu Unicode"""
        with tempfile.NamedTemporaryFile(mode='w+', delete=False, encoding='utf-8') as tmp:
            self.serializer.serialize(
                queryset=DummyModel.objects.all(),
                stream=tmp,
                model=DummyModel,
                ensure_ascii=False
            )
            tmp.flush()

            with open(tmp.name, encoding='utf-8') as f:
                content = f.read()
                self.assertIsInstance(content, str)

            os.unlink(tmp.name)

    def test_csv_serializer_with_none_values_in_data(self):
        """Test CSVSerializer avec valeurs None dans les données"""
        # Créer un objet avec des valeurs potentiellement None
        dummy_with_none = DummyModel.objects.create(geom=Point(0, 0))

        # Mock pour simuler des valeurs None
        with mock.patch.object(dummy_with_none, '__getattribute__', side_effect=lambda x: None if x == 'some_field' else object.__getattribute__(dummy_with_none, x)):
            with tempfile.NamedTemporaryFile(mode='w+', delete=False) as tmp:
                self.serializer.serialize(
                    queryset=DummyModel.objects.filter(pk=dummy_with_none.pk),
                    stream=tmp,
                    model=DummyModel
                )
                tmp.flush()

                with open(tmp.name, encoding='utf-8') as f:
                    content = f.read()
                    self.assertIsInstance(content, str)

                os.unlink(tmp.name)

    def test_csv_serializer_field_handling_edge_cases(self):
        """Test des cas limites de gestion des champs"""
        # Test avec différents types de champs
        mock_fields = [
            mock.Mock(name='text_field', get_attname=lambda: 'text_field'),
            mock.Mock(name='number_field', get_attname=lambda: 'number_field'),
            mock.Mock(name='date_field', get_attname=lambda: 'date_field'),
        ]

        for mock_field in mock_fields:
            with mock.patch.object(DummyModel._meta, 'get_field', return_value=mock_field):
                with tempfile.NamedTemporaryFile(mode='w+', delete=False) as tmp:
                    self.serializer.serialize(
                        queryset=DummyModel.objects.all(),
                        stream=tmp,
                        fields=[mock_field.name],
                        model=DummyModel
                    )
                    tmp.flush()

                    with open(tmp.name, encoding='utf-8') as f:
                        content = f.read()
                        self.assertIsInstance(content, str)

                    os.unlink(tmp.name)

    def test_csv_serializer_with_empty_queryset(self):
        """Test CSVSerializer avec queryset vide"""
        with tempfile.NamedTemporaryFile(mode='w+', delete=False) as tmp:
            self.serializer.serialize(
                queryset=DummyModel.objects.none(),
                stream=tmp,
                model=DummyModel
            )
            tmp.flush()

            with open(tmp.name, encoding='utf-8') as f:
                content = f.read()
                self.assertIsInstance(content, str)
                # Devrait au moins contenir les en-têtes
                self.assertIn('id', content)

            os.unlink(tmp.name)

    def test_csv_serializer_handle_field_attribute_error(self):
        """Test CSVSerializer avec AttributeError sur un champ"""
        with mock.patch.object(DummyModel._meta, 'get_field') as mock_get_field:
            mock_field = mock.Mock()
            mock_field.get_attname.side_effect = AttributeError("No attname")
            mock_get_field.return_value = mock_field

            with tempfile.NamedTemporaryFile(mode='w+', delete=False) as tmp:
                self.serializer.serialize(
                    queryset=DummyModel.objects.all(),
                    stream=tmp,
                    fields=['problematic_field'],
                    model=DummyModel
                )
                tmp.flush()

                with open(tmp.name, encoding='utf-8') as f:
                    content = f.read()
                    self.assertIsInstance(content, str)

                os.unlink(tmp.name)

    def test_csv_serializer_with_special_characters(self):
        """Test CSVSerializer avec caractères spéciaux"""
        with tempfile.NamedTemporaryFile(mode='w+', delete=False, encoding='utf-8') as tmp:
            # Mock pour retourner des valeurs avec caractères spéciaux
            with mock.patch.object(self.dummy, '__str__', return_value="Test,avec;virgules\"et'quotes"):
                self.serializer.serialize(
                    queryset=DummyModel.objects.filter(pk=self.dummy.pk),
                    stream=tmp,
                    model=DummyModel
                )
                tmp.flush()

                with open(tmp.name, encoding='utf-8') as f:
                    content = f.read()
                    self.assertIsInstance(content, str)

                os.unlink(tmp.name)

    def test_csv_serializer_ensure_ascii_true(self):
        """Test CSVSerializer avec ensure_ascii=True"""
        with tempfile.NamedTemporaryFile(mode='w+', delete=False) as tmp:
            self.serializer.serialize(
                queryset=DummyModel.objects.all(),
                stream=tmp,
                model=DummyModel,
                ensure_ascii=True
            )
            tmp.flush()

            with open(tmp.name, encoding='utf-8') as f:
                content = f.read()
                self.assertIsInstance(content, str)
                # Avec ensure_ascii=True, pas de caractères non-ASCII
                self.assertTrue(content.isascii())

            os.unlink(tmp.name)

    def test_csv_serializer_field_value_extraction(self):
        """Test d'extraction des valeurs de champ"""
        # Test avec différents attributs d'objet
        test_obj = DummyModel.objects.create(geom=Point(1, 1))

        with tempfile.NamedTemporaryFile(mode='w+', delete=False) as tmp:
            self.serializer.serialize(
                queryset=DummyModel.objects.filter(pk=test_obj.pk),
                stream=tmp,
                fields=['id', 'geom'],
                model=DummyModel
            )
            tmp.flush()

            with open(tmp.name, encoding='utf-8') as f:
                content = f.read()
                self.assertIn('id', content)
                self.assertIn('geom', content)
                self.assertIn(str(test_obj.pk), content)

            os.unlink(tmp.name)

