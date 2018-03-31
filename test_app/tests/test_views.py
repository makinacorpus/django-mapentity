import os
import shutil
import json

import mock
import factory
from django.conf import settings
from django.core.management import call_command
from django.test import TransactionTestCase, RequestFactory
from django.test.utils import override_settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission

from mapentity.factories import SuperUserFactory

from mapentity.registry import app_settings
from mapentity.tests import MapEntityTest, MapEntityLiveTest
from mapentity.views import serve_attachment, Convert, JSSettings

from ..models import DummyModel
from ..views import DummyList, DummyDetail


User = get_user_model()


class DummyModelFactory(factory.DjangoModelFactory):
    name = ''

    class Meta:
        model = DummyModel


class DummyModelFunctionalTest(MapEntityTest):
    userfactory = SuperUserFactory
    model = DummyModel
    modelfactory = DummyModelFactory

    def get_good_data(self):
        return {'geom': '{"type": "Point", "coordinates":[0, 0]}'}


class DummyModelLiveTest(MapEntityLiveTest):
    userfactory = SuperUserFactory
    model = DummyModel
    modelfactory = DummyModelFactory


class BaseTest(TransactionTestCase):
    def login(self):
        if getattr(self, 'user', None) is None:
            user = User.objects.create_user(self.__class__.__name__ + 'User',
                                            'email@corp.com', 'booh')
            setattr(self, 'user', user)
        self.logout()
        success = self.client.login(username=self.user.username, password='booh')
        self.assertTrue(success)
        return self.user

    def login_as_superuser(self):
        if getattr(self, 'superuser', None) is None:
            superuser = User.objects.create_superuser(self.__class__.__name__ + 'Superuser',
                                                      'email@corp.com', 'booh')
            setattr(self, 'superuser', superuser)
        self.logout()
        success = self.client.login(username=self.superuser.username, password='booh')
        self.assertTrue(success)
        return self.superuser

    def logout(self):
        self.client.logout()


class ConvertTest(BaseTest):
    def test_view_headers_are_reverted_to_originals(self):
        request = mock.MagicMock(META=dict(HTTP_ACCEPT_LANGUAGE='fr'))
        view = Convert()
        view.request = request
        self.assertEqual(view.request_headers(), {'Accept-Language': 'fr'})

    def test_critical_original_headers_are_filtered(self):
        request = mock.MagicMock(META=dict(HTTP_HOST='originalhost',
                                           HTTP_COOKIE='blah'))
        view = Convert()
        view.request = request
        self.assertEqual(view.request_headers(), {})

    def test_convert_view_is_protected_by_login(self):
        response = self.client.get('/convert/')
        self.assertEqual(response.status_code, 302)

    def test_convert_view_complains_if_no_url_is_provided(self):
        self.login()
        response = self.client.get('/convert/')
        self.assertEqual(response.status_code, 400)

    def test_convert_view_only_supports_get(self):
        self.login()
        response = self.client.head('/convert/')
        self.assertEqual(response.status_code, 405)

    @mock.patch('mapentity.helpers.requests.get')
    def test_convert_view_uses_original_request_headers(self, get_mocked):
        get_mocked.return_value.status_code = 200
        get_mocked.return_value.content = 'x'
        self.login()
        self.client.get('/convert/?url=http://geotrek.fr',
                        HTTP_ACCEPT_LANGUAGE='it')
        get_mocked.assert_called_with('http://convertit//?url=http%3A//geotrek.fr&to=application/pdf',
                                      headers={'Accept-Language': 'it'})

    @mock.patch('mapentity.helpers.requests.get')
    def test_convert_view_builds_absolute_url_from_relative(self, get_mocked):
        get_mocked.return_value.status_code = 200
        get_mocked.return_value.content = 'x'
        self.login()
        self.client.get('/convert/?url=/path/1/')
        get_mocked.assert_called_with('http://convertit//?url=http%3A//testserver/path/1/&to=application/pdf',
                                      headers={})


@override_settings(MEDIA_ROOT='/tmp/mapentity-media')
class AttachmentTest(BaseTest):
    def setUp(self):
        app_settings['SENDFILE_HTTP_HEADER'] = 'X-Accel-Redirect'
        self.obj = DummyModelFactory.create()
        if os.path.exists(settings.MEDIA_ROOT):
            self.tearDown()
        os.makedirs(os.path.join(settings.MEDIA_ROOT, 'paperclip/test_app_dummymodel/{}'.format(self.obj.pk)))
        self.file = os.path.join(settings.MEDIA_ROOT, 'paperclip/test_app_dummymodel/{}/file.pdf'.format(self.obj.pk))
        self.url = '/media/paperclip/test_app_dummymodel/{}/file.pdf'.format(self.obj.pk)
        open(self.file, 'wb').write('*' * 300)
        call_command('update_permissions')

    def tearDown(self):
        shutil.rmtree(settings.MEDIA_ROOT)
        app_settings['SENDFILE_HTTP_HEADER'] = None

    def download(self, url):
        return self.client.get(url, REMOTE_ADDR="6.6.6.6")

    def test_access_to_public_attachment(self):
        self.obj.public = True
        self.obj.save()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_anonymous_access_to_not_published_attachment(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_unauthorized_access_to_attachment(self):
        self.login()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_authorized_access_to_attachment(self):
        self.login()
        perm1 = Permission.objects.get(codename='read_attachment')
        self.user.user_permissions.add(perm1)
        perm2 = Permission.objects.get(codename='read_dummymodel')
        self.user.user_permissions.add(perm2)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_anonymous_access_to_deleted_object(self):
        self.obj.delete()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 404)

    def test_authorized_access_to_deleted_object(self):
        self.obj.delete()
        self.login_as_superuser()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 404)

    def test_access_to_not_existing_app(self):
        response = self.client.get('/media/paperclip/xxx_dummymodel/{}/file.pdf'.format(self.obj.pk))
        self.assertEqual(response.status_code, 404)

    def test_access_to_not_existing_model(self):
        response = self.client.get('/media/paperclip/test_app_yyy/{}/file.pdf'.format(self.obj.pk))
        self.assertEqual(response.status_code, 404)

    def test_access_to_not_existing_object(self):
        response = self.client.get('/media/paperclip/test_app_dummymodel/99999999/file.pdf')
        self.assertEqual(response.status_code, 404)

    @override_settings(DEBUG=True)
    def test_access_to_not_existing_file(self):
        os.remove(self.file)
        self.login_as_superuser()
        response = self.download(self.url)
        self.assertEqual(response.status_code, 404)

    @override_settings(DEBUG=True)
    def test_authenticated_user_can_access(self):
        self.login_as_superuser()
        response = self.download(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '*********')

    def test_http_headers_attachment(self):
        app_settings['SENDFILE_HTTP_HEADER'] = 'X-Accel-Redirect'
        request = RequestFactory().get('/fake-path')
        request.user = User.objects.create_superuser('test', 'email@corp.com', 'booh')
        response = serve_attachment(request, 'file.pdf', 'test_app', 'dummymodel', str(self.obj.pk))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '')
        self.assertEqual(response['X-Accel-Redirect'], '/media_secure/file.pdf')
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertEqual(response['Content-Disposition'], 'attachment; filename=file.pdf')
        app_settings['SENDFILE_HTTP_HEADER'] = None

    def test_http_headers_inline(self):
        app_settings['SERVE_MEDIA_AS_ATTACHMENT'] = False
        request = RequestFactory().get('/fake-path')
        request.user = User.objects.create_superuser('test', 'email@corp.com', 'booh')
        response = serve_attachment(request, 'file.pdf', 'test_app', 'dummymodel', str(self.obj.pk))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '')
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertFalse('Content-Disposition' in response)
        app_settings['SERVE_MEDIA_AS_ATTACHMENT'] = True


class SettingsViewTest(BaseTest):

    def test_js_settings_urls(self):
        view = JSSettings()
        view.request = RequestFactory().get('/fake-path')
        context = view.get_context_data()
        self.assertDictEqual(context['urls'], {
            "layer": "/api/modelname/modelname.geojson",
            "screenshot": "/map_screenshot/",
            "detail": "/modelname/0/",
            "format_list": "/modelname/list/export/",
            "static": "/static/",
            "root": "/"
        })


class ListViewTest(BaseTest):

    def setUp(self):
        self.user = User.objects.create_user('aah', 'email@corp.com', 'booh')

        def user_perms(p):
            return {'test_app.export_dummymodel': False}.get(p, True)

        self.user.has_perm = mock.MagicMock(side_effect=user_perms)

    def test_mapentity_template_is_last_candidate(self):
        listview = DummyList()
        listview.object_list = []
        self.assertEqual(listview.get_template_names(),
                         ['mapentity/mapentity_list.html'])

    def test_list_should_have_some_perms_in_context(self):
        view = DummyList()
        view.object_list = []
        view.request = RequestFactory().get('/fake-path')
        view.request.user = self.user
        context = view.get_context_data()
        self.assertEqual(context['can_add'], True)
        self.assertEqual(context['can_export'], False)

    def test_list_should_render_some_perms_in_template(self):
        request = RequestFactory().get('/fake-path')
        request.user = self.user
        request.session = {}
        view = DummyList.as_view()
        response = view(request)
        html = unicode(response.render())

        self.assertTrue('btn-group disabled' in html)
        self.assertTrue('Add a new dummy model</a>' in html)


class MapEntityLayerViewTest(BaseTest):
    def setUp(self):
        DummyModelFactory.create_batch(30)
        DummyModelFactory.create(name='toto')

        self.login()
        self.user.is_superuser = True
        self.user.save()
        self.logout()

    def test_geojson_layer_returns_all_by_default(self):
        self.login()
        response = self.client.get(DummyModel.get_layer_url())
        collection = json.loads(response.content)
        self.assertEqual(len(collection['features']), 31)

    def test_geojson_layer_can_be_filtered(self):
        self.login()
        response = self.client.get(DummyModel.get_layer_url() + '?name=toto')
        collection = json.loads(response.content)
        self.assertEqual(len(collection['features']), 1)

    def test_geojson_layer_with_parameters_is_not_cached(self):
        self.login()
        response = self.client.get(DummyModel.get_layer_url() + '?name=toto')
        collection = json.loads(response.content)
        self.assertEqual(len(collection['features']), 1)
        response = self.client.get(DummyModel.get_layer_url())
        collection = json.loads(response.content)
        self.assertEqual(len(collection['features']), 31)

    def test_geojson_layer_with_parameters_does_not_use_cache(self):
        self.login()
        response = self.client.get(DummyModel.get_layer_url())
        collection = json.loads(response.content)
        self.assertEqual(len(collection['features']), 31)
        response = self.client.get(DummyModel.get_layer_url() + '?name=toto')
        collection = json.loads(response.content)
        self.assertEqual(len(collection['features']), 1)

    def test_geojson_layer_with_dummy_parameter_still_uses_cache(self):
        self.login()
        response = self.client.get(DummyModel.get_layer_url())
        collection = json.loads(response.content)
        self.assertEqual(len(collection['features']), 31)
        # See Leaflet-ObjectsLayer.js load() function
        response = self.client.get(DummyModel.get_layer_url() + '?_u=1234&name=toto')
        collection = json.loads(response.content)
        self.assertEqual(len(collection['features']), 31)


class DetailViewTest(BaseTest):
    def setUp(self):
        self.login()
        self.user.is_superuser = True
        self.user.save()
        self.logout()
        self.object = DummyModelFactory.create(name='dumber')

    def test_mapentity_template_is_last_candidate(self):
        detailview = DummyDetail()
        detailview.object = self.object
        self.assertEqual(detailview.get_template_names(),
                         ['test_app/dummymodel_detail.html',
                          'mapentity/mapentity_detail.html'])

    def test_properties_shown_in_extended_template(self):
        self.login()
        response = self.client.get(self.object.get_detail_url())
        self.assertTemplateUsed(response,
                                template_name='test_app/dummymodel_detail.html')
        self.assertContains(response, 'dumber')

    def test_export_buttons_odt(self):
        self.login()

        tmp = app_settings['MAPENTITY_WEASYPRINT']
        app_settings['MAPENTITY_WEASYPRINT'] = False

        response = self.client.get(self.object.get_detail_url())

        app_settings['MAPENTITY_WEASYPRINT'] = tmp

        self.assertContains(response, '<a class="btn btn-mini" target="_blank" href="/document/dummymodel-{}.odt">\
<img src="/static/paperclip/fileicons/odt.png"/> ODT</a>'.format(self.object.pk))
        self.assertContains(response, '<a class="btn btn-mini" target="_blank" \
href="/convert/?url=/document/dummymodel-{}.odt&to=doc">\
<img src="/static/paperclip/fileicons/doc.png"/> DOC</a>'.format(self.object.pk))
        self.assertContains(response, '<a class="btn btn-mini" target="_blank" \
href="/convert/?url=/document/dummymodel-{}.odt">\
<img src="/static/paperclip/fileicons/pdf.png"/> PDF</a>'.format(self.object.pk))

    def test_export_buttons_weasyprint(self):
        self.login()

        tmp = app_settings['MAPENTITY_WEASYPRINT']
        app_settings['MAPENTITY_WEASYPRINT'] = True

        response = self.client.get(self.object.get_detail_url())

        app_settings['MAPENTITY_WEASYPRINT'] = tmp

        if app_settings['MAPENTITY_WEASYPRINT']:
            self.assertContains(response, '<a class="btn btn-mini" target="_blank" href="/document/dummymodel-{}.pdf">\
<img src="/static/paperclip/fileicons/pdf.png"/> PDF</a>'.format(self.object.pk))
        else:
            self.assertContains(response, '<a class="btn btn-mini" target="_blank" href="/document/dummymodel-{}.odt">\
<img src="/static/paperclip/fileicons/pdf.png"/> PDF</a>'.format(self.object.pk))
        self.assertNotContains(response, '<a class="btn btn-mini" target="_blank" \
href="/convert/?url=/document/dummymodel-{}.odt&to=doc">\
<img src="/static/paperclip/fileicons/doc.png"/> DOC</a>'.format(self.object.pk))
        self.assertNotContains(response, '<a class="btn btn-mini" target="_blank" \
href="/document/dummymodel-{}.odt"><img src="/static/paperclip/fileicons/odt.png"/> ODT</a>'.format(self.object.pk))


class DocumentOdtViewTest(BaseTest):
    def setUp(self):
        self.login()
        self.user.is_superuser = True
        self.user.save()
        self.logout()
        self.object = DummyModelFactory.create(name='dumber')

    def test_status_code(self):
        self.login()
        url = "/test/document/dummymodel-{pk}.odt".format(pk=self.object.pk)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)


class DocumentWeasyprintViewTest(BaseTest):
    def setUp(self):
        self.login()
        self.user.is_superuser = True
        self.user.save()
        self.logout()
        self.object = DummyModelFactory.create(name='dumber')

    def test_status_code(self):
        self.login()
        url = "/test/document/dummymodel-{pk}.pdf".format(pk=self.object.pk)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)


class ViewPermissionsTest(BaseTest):
    def setUp(self):
        self.login()
        self.user.user_permissions.all().delete()  # WTF ?
        self.object = DummyModel.objects.create()

    def tearDown(self):
        self.logout()

    def test_views_name_depend_on_model(self):
        view = DummyList()
        self.assertEqual(view.get_view_perm(), 'test_app.read_dummymodel')

    def test_unauthorized_list_view_redirects_to_login(self):
        response = self.client.get('/dummymodel/list/')
        self.assertRedirects(response, 'http://testserver/login/')

    def test_unauthorized_detail_view_redirects_to_list(self):
        detail_url = '/dummymodel/%s/' % self.object.pk
        response = self.client.get(detail_url)
        self.assertRedirects(response, 'http://testserver/dummymodel/list/',
                             target_status_code=302)  # --> login

    def test_unauthorized_add_view_redirects_to_list(self):
        add_url = '/dummymodel/add/'
        response = self.client.get(add_url)
        self.assertRedirects(response, 'http://testserver/dummymodel/list/',
                             target_status_code=302)  # --> login

    def test_unauthorized_update_view_redirects_to_detail(self):
        edit_url = '/dummymodel/edit/%s/' % self.object.pk
        response = self.client.get(edit_url)
        self.assertRedirects(response, 'http://testserver/dummymodel/%s/' % (self.object.pk),
                             target_status_code=302)  # --> login

    def test_unauthorized_delete_view_redirects_to_detail(self):
        delete_url = '/dummymodel/delete/%s/' % self.object.pk
        response = self.client.get(delete_url)
        self.assertRedirects(response, 'http://testserver/dummymodel/%s/' % (self.object.pk),
                             target_status_code=302)  # --> login
