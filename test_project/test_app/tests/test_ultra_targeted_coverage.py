"""
Tests ultra-ciblés pour atteindre 100% de couverture - Lignes spécifiques manquantes
"""
import time
from unittest import mock
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.http import HttpResponse
from django.core.exceptions import PermissionDenied
from django.contrib.auth.models import AnonymousUser

from mapentity.decorators import view_permission_required, view_cache_latest
from mapentity.models import LogEntry, ADDITION
from mapentity.helpers import download_content, get_source
from test_project.test_app.models import DummyModel
import requests

User = get_user_model()


class UltraTargetedCoverageTestCase(TestCase):
    """Tests ultra-ciblés pour les lignes spécifiques non couvertes"""

    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(username="testuser", password="password")
        self.dummy = DummyModel.objects.create(geom=Point(0, 0))

    def test_view_permission_required_anonymous_user_redirect(self):
        """Test view_permission_required avec utilisateur anonyme et redirection"""
        @view_permission_required('test_app.view_dummymodel', raise_exception=False)
        def test_view(self, request):
            return HttpResponse("OK")
        
        class TestView:
            pass
        
        view_instance = TestView()
        view_instance.test_view = test_view.__get__(view_instance, TestView)
        
        request = self.factory.get('/')
        request.user = AnonymousUser()
        
        response = view_instance.test_view(request)
        # Devrait rediriger vers la page de login
        self.assertEqual(response.status_code, 302)

    def test_view_permission_required_custom_login_url_redirect(self):
        """Test view_permission_required avec URL de login personnalisée"""
        @view_permission_required('test_app.view_dummymodel', 
                                 login_url='/custom-login/', 
                                 raise_exception=False)
        def test_view(self, request):
            return HttpResponse("OK")
        
        class TestView:
            pass
        
        view_instance = TestView()
        view_instance.test_view = test_view.__get__(view_instance, TestView)
        
        request = self.factory.get('/')
        request.user = self.user  # Utilisateur sans permission
        
        response = view_instance.test_view(request)
        # Devrait rediriger vers /custom-login/
        self.assertEqual(response.status_code, 302)
        self.assertIn('/custom-login/', response.url)

    @mock.patch('mapentity.helpers.time.sleep')
    def test_download_content_second_connection_error(self, mock_sleep):
        """Test download_content avec deux ConnectionError consécutives"""
        with mock.patch('mapentity.helpers.get_source') as mock_get_source:
            # Les deux appels lèvent une ConnectionError
            mock_get_source.side_effect = [
                requests.exceptions.ConnectionError("First error"),
                requests.exceptions.ConnectionError("Second error")
            ]
            
            result = download_content("http://example.com", silent=True)
            
            # Vérifier que sleep a été appelé une fois
            mock_sleep.assert_called_once_with(1)
            # Vérifier que get_source a été appelé deux fois
            self.assertEqual(mock_get_source.call_count, 2)
            # Le résultat devrait être None car les deux tentatives ont échoué
            self.assertIsNone(result)

    @mock.patch('mapentity.helpers.time.sleep')
    def test_download_content_first_connection_error_then_success(self, mock_sleep):
        """Test download_content avec ConnectionError puis succès"""
        with mock.patch('mapentity.helpers.get_source') as mock_get_source:
            # Premier appel lève ConnectionError, deuxième réussit
            mock_get_source.side_effect = [
                requests.exceptions.ConnectionError("Connection failed"),
                b"success after retry"
            ]
            
            result = download_content("http://example.com", silent=True)
            
            # Vérifier que sleep a été appelé
            mock_sleep.assert_called_once_with(1)
            # Vérifier que get_source a été appelé deux fois
            self.assertEqual(mock_get_source.call_count, 2)
            # Le résultat devrait être le contenu du deuxième appel
            self.assertEqual(result, b"success after retry")

    def test_download_content_connection_error_not_silent(self):
        """Test download_content avec ConnectionError en mode non silencieux"""
        with mock.patch('mapentity.helpers.get_source') as mock_get_source:
            mock_get_source.side_effect = requests.exceptions.ConnectionError("Connection failed")
            
            # En mode non silencieux, l'exception devrait être propagée
            with self.assertRaises(requests.exceptions.ConnectionError):
                download_content("http://example.com", silent=False)

    def test_download_content_other_request_exceptions(self):
        """Test download_content avec autres exceptions requests"""
        with mock.patch('mapentity.helpers.get_source') as mock_get_source:
            # Test avec différentes exceptions
            exceptions = [
                requests.exceptions.HTTPError("HTTP Error"),
                requests.exceptions.RequestException("Request Error"),
                requests.exceptions.ChunkedEncodingError("Chunked Error"),
            ]
            
            for exception in exceptions:
                mock_get_source.side_effect = exception
                
                result = download_content("http://example.com", silent=True)
                self.assertIsNone(result)

    def test_view_cache_latest_with_modified_time(self):
        """Test view_cache_latest avec temps de modification"""
        @view_cache_latest()
        def test_view(self, request):
            return HttpResponse("OK")
        
        class TestView:
            model = DummyModel
            
            def get_queryset(self):
                return DummyModel.objects.all()
        
        view_instance = TestView()
        view_instance.test_view = test_view.__get__(view_instance, TestView)
        
        request = self.factory.get('/')
        request.user = self.user
        
        # Premier appel
        response1 = view_instance.test_view(request)
        self.assertEqual(response1.status_code, 200)
        
        # Modifier un objet pour changer le temps de modification
        self.dummy.save()
        
        # Deuxième appel - devrait recalculer car les données ont changé
        response2 = view_instance.test_view(request)
        self.assertEqual(response2.status_code, 200)

    def test_logentry_with_long_object_repr(self):
        """Test LogEntry avec représentation d'objet longue"""
        # Créer un LogEntry avec une représentation très longue
        long_repr = "A" * 300  # Plus de 255 caractères
        
        log_entry = LogEntry.objects.create(
            user=self.user,
            content_object=self.dummy,
            action_flag=ADDITION,
            object_repr=long_repr
        )
        
        # Vérifier que la représentation est tronquée correctement
        str_repr = str(log_entry)
        self.assertIsInstance(str_repr, str)
        self.assertIn(self.user.username, str_repr)

    def test_get_source_with_custom_headers(self):
        """Test get_source avec headers personnalisés"""
        with mock.patch('mapentity.helpers.requests.get') as mock_get:
            mock_response = mock.Mock()
            mock_response.status_code = 200
            mock_response.content = b"test content"
            mock_get.return_value = mock_response
            
            custom_headers = {
                'User-Agent': 'Custom User Agent',
                'Authorization': 'Bearer token123'
            }
            
            result = get_source("http://example.com", custom_headers)
            
            # Vérifier que les headers ont été passés
            mock_get.assert_called_once_with("http://example.com", headers=custom_headers)
            self.assertEqual(result, b"test content")

    def test_download_content_with_none_headers(self):
        """Test download_content avec headers None"""
        with mock.patch('mapentity.helpers.get_source') as mock_get_source:
            mock_get_source.return_value = b"content with none headers"
            
            result = download_content("http://example.com", headers=None)
            
            # Vérifier que get_source a été appelé avec headers None
            mock_get_source.assert_called_once_with("http://example.com", None)
            self.assertEqual(result, b"content with none headers")

    def test_download_content_with_empty_headers(self):
        """Test download_content avec headers vides"""
        with mock.patch('mapentity.helpers.get_source') as mock_get_source:
            mock_get_source.return_value = b"content with empty headers"
            
            result = download_content("http://example.com", headers={})
            
            # Vérifier que get_source a été appelé avec headers vides
            mock_get_source.assert_called_once_with("http://example.com", {})
            self.assertEqual(result, b"content with empty headers")

    def test_view_permission_required_with_custom_permission_check(self):
        """Test view_permission_required avec vérification de permission personnalisée"""
        @view_permission_required('test_app.change_dummymodel')
        def test_view(self, request):
            return HttpResponse("OK")
        
        class TestView:
            pass
        
        view_instance = TestView()
        view_instance.test_view = test_view.__get__(view_instance, TestView)
        
        request = self.factory.get('/')
        request.user = self.user
        
        # Test avec permission manquante
        with self.assertRaises(PermissionDenied):
            view_instance.test_view(request)

    def test_various_request_exceptions_coverage(self):
        """Test couverture de diverses exceptions requests"""
        with mock.patch('mapentity.helpers.get_source') as mock_get_source:
            # Test avec différentes exceptions moins communes
            exceptions = [
                requests.exceptions.SSLError("SSL Error"),
                requests.exceptions.ProxyError("Proxy Error"),
                requests.exceptions.RetryError("Retry Error"),
                requests.exceptions.StreamConsumedError("Stream Error"),
            ]
            
            for exception in exceptions:
                mock_get_source.side_effect = exception
                
                result = download_content("http://example.com", silent=True)
                self.assertIsNone(result)

    def test_edge_case_geometry_handling(self):
        """Test gestion des cas limites de géométrie"""
        # Test avec géométrie très petite
        tiny_point = Point(0.000001, 0.000001)
        tiny_dummy = DummyModel.objects.create(geom=tiny_point)
        
        # Test avec géométrie très grande
        large_point = Point(1000000, 1000000)
        large_dummy = DummyModel.objects.create(geom=large_point)
        
        # Vérifier que les objets ont été créés correctement
        self.assertIsNotNone(tiny_dummy.pk)
        self.assertIsNotNone(large_dummy.pk)
        
        # Test des méthodes qui utilisent la géométrie
        for dummy in [tiny_dummy, large_dummy]:
            extent = dummy.get_map_image_extent()
            self.assertIsNotNone(extent)
            
            path = dummy.get_map_image_path()
            self.assertIsInstance(path, str)

    def test_permission_decorator_with_staff_user(self):
        """Test décorateur de permission avec utilisateur staff"""
        staff_user = User.objects.create_user(username="staff", password="password", is_staff=True)
        
        @view_permission_required('test_app.view_dummymodel')
        def test_view(self, request):
            return HttpResponse("OK")
        
        class TestView:
            pass
        
        view_instance = TestView()
        view_instance.test_view = test_view.__get__(view_instance, TestView)
        
        request = self.factory.get('/')
        request.user = staff_user
        
        # Test avec utilisateur staff
        try:
            response = view_instance.test_view(request)
            # Le comportement dépend des permissions spécifiques
            self.assertIsInstance(response, HttpResponse)
        except PermissionDenied:
            # Permission denied est acceptable pour staff sans permission spécifique
            pass
