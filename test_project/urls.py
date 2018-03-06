from django.conf.urls import include, url
from django.contrib import admin
from django.views.generic import RedirectView

from test_app.models import DummyModel, MushroomSpot
from test_app.views import DummyDocumentOdt, DummyDocumentWeasyprint
from mapentity.registry import registry


handler403 = 'mapentity.views.handler403'

admin.autodiscover()

models_urls = registry.register(DummyModel) + registry.register(MushroomSpot)

urlpatterns = [
    url(r'', include(models_urls, namespace='test_app')),
    url(r'', include('mapentity.urls', namespace='mapentity',
                     app_name='mapentity')),
    url(r'^home/$', RedirectView.as_view(url='/', permanent=True), name='home'),
    url(r'^login/$', 'django.contrib.auth.views.login', name='login'),
    url(r'^logout/$', 'django.contrib.auth.views.logout', {'next_page': '/'}, name='logout',),

    url(r'^paperclip/', include('paperclip.urls')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^test/document/dummymodel-(?P<pk>\d+).odt', DummyDocumentOdt.as_view(), name="dummymodel_odt"),
    url(r'^test/document/dummymodel-(?P<pk>\d+).pdf', DummyDocumentWeasyprint.as_view(), name="dummymodel_pdf"),
]
