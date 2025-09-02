"""
Tests ciblés pour couvrir 100% du fichier helpers.py
"""
import os
import tempfile
from datetime import datetime, timedelta
from unittest import mock

import requests
from django.contrib.auth import get_user_model
from django.contrib.gis.gdal.error import GDALException
from django.contrib.gis.geos import GEOSException, Point
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import TestCase, override_settings

from mapentity.helpers import (
    api_bbox, convertit_url, download_content, get_source,
    is_file_uptodate, smart_urljoin, wkt_to_geom
)
from mapentity.settings import API_SRID

User = get_user_model()


class HelpersCompleteCoverageTestCase(TestCase):
    """Tests pour couvrir 100% du fichier helpers.py"""

    def test_api_bbox_with_different_srid_and_buffer(self):
        """Test api_bbox avec SRID différent et buffer - lignes 35-45"""
        bbox = (0, 0, 10, 10)
        
        # Test avec SRID différent de API_SRID
        with override_settings(SRID=4326):
            result = api_bbox(bbox, srid=4326, buffer=0.1)
            self.assertEqual(len(result), 4)
            # Vérifier que le buffer a été appliqué
            self.assertLess(result[0], 0)
            self.assertLess(result[1], 0)
            self.assertGreater(result[2], 10)
            self.assertGreater(result[3], 10)

    def test_api_bbox_with_same_srid_and_buffer(self):
        """Test api_bbox avec même SRID et buffer - lignes 41-45"""
        bbox = (0, 0, 10, 10)
        
        # Test avec buffer > 0
        result = api_bbox(bbox, srid=API_SRID, buffer=0.2)
        self.assertEqual(len(result), 4)
        # Vérifier que le buffer a été appliqué
        self.assertLess(result[0], 0)
        self.assertLess(result[1], 0)
        self.assertGreater(result[2], 10)
        self.assertGreater(result[3], 10)

    def test_wkt_to_geom_with_exception_not_silent(self):
        """Test wkt_to_geom avec exception non silencieuse - ligne 55"""
        invalid_wkt = "INVALID_WKT_STRING"
        
        # Test avec silent=False (par défaut)
        with self.assertRaises(GEOSException):
            wkt_to_geom(invalid_wkt, silent=False)

    def test_is_file_uptodate_date_none(self):
        """Test is_file_uptodate avec date None - ligne 72"""
        # Créer un fichier temporaire
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(b"test content")
            tmp.flush()
            
            # Test avec date None
            result = is_file_uptodate(tmp.name, None)
            self.assertFalse(result)
            
            os.unlink(tmp.name)

    def test_is_file_uptodate_empty_file_with_delete(self):
        """Test is_file_uptodate avec fichier vide et delete_empty=True - lignes 75-77"""
        # Créer un fichier vide
        empty_file = ContentFile(b"")
        path = default_storage.save("test_empty.txt", empty_file)
        
        # Test avec fichier vide et delete_empty=True
        result = is_file_uptodate(path, datetime.now(), delete_empty=True)
        self.assertFalse(result)
        
        # Vérifier que le fichier a été supprimé
        self.assertFalse(default_storage.exists(path))

    def test_is_file_uptodate_empty_file_no_delete(self):
        """Test is_file_uptodate avec fichier vide et delete_empty=False"""
        # Créer un fichier vide
        empty_file = ContentFile(b"")
        path = default_storage.save("test_empty2.txt", empty_file)
        
        # Test avec fichier vide et delete_empty=False
        result = is_file_uptodate(path, datetime.now(), delete_empty=False)
        self.assertFalse(result)
        
        # Vérifier que le fichier existe toujours
        self.assertTrue(default_storage.exists(path))
        
        # Nettoyer
        default_storage.delete(path)

    @mock.patch('mapentity.helpers.time.sleep')
    @mock.patch('mapentity.helpers.get_source')
    def test_download_content_connection_error_retry(self, mock_get_source, mock_sleep):
        """Test download_content avec ConnectionError et retry - lignes 102-104"""
        # Premier appel lève une ConnectionError, deuxième réussit
        mock_get_source.side_effect = [
            requests.exceptions.ConnectionError("Connection failed"),
            b"success content"
        ]
        
        result = download_content("http://example.com")
        
        # Vérifier que sleep a été appelé
        mock_sleep.assert_called_once_with(1)
        # Vérifier que get_source a été appelé deux fois
        self.assertEqual(mock_get_source.call_count, 2)
        # Vérifier le résultat
        self.assertEqual(result, b"success content")

    @mock.patch('mapentity.helpers.time.sleep')
    @mock.patch('mapentity.helpers.get_source')
    def test_download_content_connection_error_silent(self, mock_get_source, mock_sleep):
        """Test download_content avec ConnectionError en mode silencieux"""
        # Les deux appels lèvent une ConnectionError
        mock_get_source.side_effect = requests.exceptions.ConnectionError("Connection failed")
        
        result = download_content("http://example.com", silent=True)
        
        # Vérifier que sleep a été appelé
        mock_sleep.assert_called_once_with(1)
        # Vérifier que get_source a été appelé deux fois
        self.assertEqual(mock_get_source.call_count, 2)
        # Vérifier le résultat
        self.assertIsNone(result)

    @mock.patch('mapentity.helpers.time.sleep')
    @mock.patch('mapentity.helpers.get_source')
    def test_download_content_timeout_error(self, mock_get_source, mock_sleep):
        """Test download_content avec Timeout error"""
        mock_get_source.side_effect = requests.exceptions.Timeout("Timeout")
        
        result = download_content("http://example.com", silent=True)
        
        # Vérifier le résultat
        self.assertIsNone(result)

    @mock.patch('mapentity.helpers.time.sleep')
    @mock.patch('mapentity.helpers.get_source')
    def test_download_content_other_exception(self, mock_get_source, mock_sleep):
        """Test download_content avec autre exception"""
        mock_get_source.side_effect = Exception("Other error")
        
        result = download_content("http://example.com", silent=True)
        
        # Vérifier le résultat
        self.assertIsNone(result)

    def test_smart_urljoin_edge_cases(self):
        """Test smart_urljoin avec différents cas"""
        # Base sans slash final, path avec slash initial
        result = smart_urljoin("http://example.com", "/path")
        self.assertEqual(result, "http://example.com/path")
        
        # Base avec slash final, path sans slash initial
        result = smart_urljoin("http://example.com/", "path")
        self.assertEqual(result, "http://example.com/path")
        
        # Base avec slash final, path avec slash initial
        result = smart_urljoin("http://example.com/", "/path")
        self.assertEqual(result, "http://example.com/path")
        
        # Base sans slash final, path sans slash initial
        result = smart_urljoin("http://example.com", "path")
        self.assertEqual(result, "http://example.com/path")

    def test_convertit_url_variations(self):
        """Test convertit_url avec différentes variations"""
        with override_settings(CONVERTIT_URL="http://convertit.example.com"):
            # Test avec paramètres corrects
            url = convertit_url("http://example.com/file.odt", "odt", "pdf")
            expected = "http://convertit.example.com?url=http%3A//example.com/file.odt&from=odt&to=pdf"
            self.assertEqual(url, expected)
            
            # Test sans paramètre from
            url = convertit_url("http://example.com/file.odt", to="pdf")
            expected = "http://convertit.example.com?url=http%3A//example.com/file.odt&to=pdf"
            self.assertEqual(url, expected)

    def test_get_source_edge_cases(self):
        """Test get_source avec différents cas"""
        with mock.patch('mapentity.helpers.requests.get') as mock_get:
            # Test avec réponse vide
            mock_response = mock.Mock()
            mock_response.status_code = 200
            mock_response.content = b""
            mock_get.return_value = mock_response
            
            with self.assertRaises(AssertionError):
                get_source("http://example.com", {})
            
            # Test avec status code différent de 200
            mock_response.status_code = 404
            mock_response.content = b"Not found"
            mock_get.return_value = mock_response
            
            with self.assertRaises(AssertionError):
                get_source("http://example.com", {})

    def test_file_operations_edge_cases(self):
        """Test des opérations sur fichiers avec cas limites"""
        # Test avec fichier qui n'existe pas
        result = is_file_uptodate("non_existent_file.txt", datetime.now())
        self.assertFalse(result)
        
        # Test avec fichier qui existe et date récente
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(b"test content")
            tmp.flush()
            
            # Date dans le passé
            old_date = datetime.now() - timedelta(days=1)
            result = is_file_uptodate(tmp.name, old_date)
            self.assertTrue(result)
            
            os.unlink(tmp.name)

    def test_geometry_operations_edge_cases(self):
        """Test des opérations géométriques avec cas limites"""
        # Test wkt_to_geom avec géométrie valide
        valid_wkt = "POINT(0 0)"
        geom = wkt_to_geom(valid_wkt, srid_from=4326)
        self.assertIsNotNone(geom)
        self.assertEqual(geom.srid, 4326)
        
        # Test wkt_to_geom avec géométrie invalide en mode silencieux
        invalid_wkt = "INVALID_GEOMETRY"
        geom = wkt_to_geom(invalid_wkt, silent=True)
        self.assertIsNone(geom)

    def test_network_operations_edge_cases(self):
        """Test des opérations réseau avec cas limites"""
        with mock.patch('mapentity.helpers.requests.get') as mock_get:
            # Test avec succès
            mock_response = mock.Mock()
            mock_response.status_code = 200
            mock_response.content = b"success content"
            mock_get.return_value = mock_response
            
            result = download_content("http://example.com")
            self.assertEqual(result, b"success content")
            
            # Test avec headers personnalisés
            headers = {'Authorization': 'Bearer token'}
            result = download_content("http://example.com", headers=headers)
            self.assertEqual(result, b"success content")
            mock_get.assert_called_with("http://example.com", headers=headers)

    def test_bbox_operations_complete_coverage(self):
        """Test complet des opérations bbox"""
        # Test avec bbox normale
        bbox = (0, 0, 10, 10)
        result = api_bbox(bbox)
        self.assertEqual(len(result), 4)
        
        # Test avec bbox et buffer
        result = api_bbox(bbox, buffer=0.1)
        self.assertEqual(len(result), 4)
        
        # Test avec SRID spécifique
        result = api_bbox(bbox, srid=4326)
        self.assertEqual(len(result), 4)
        
        # Test avec SRID et buffer
        result = api_bbox(bbox, srid=4326, buffer=0.1)
        self.assertEqual(len(result), 4)
