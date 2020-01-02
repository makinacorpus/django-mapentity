from django.conf.urls import include, url
from django.urls import re_path
from django.contrib import admin
from django.views.generic import RedirectView

from test_app.views import DummyDocumentOdt, DummyDocumentWeasyprint
from django.contrib.auth import views as auth_views

admin.autodiscover()

urlpatterns = [
    url(r'', include('test_app.urls')),
    url(r'', include('mapentity.urls')),
    url(r'^home/$', RedirectView.as_view(url='/', permanent=True), name='home'),
    url(r'^login/$', auth_views.login, name='login'),
    url(r'^logout/$', auth_views.logout, {'next_page': '/'}, name='logout',),

    url(r'^paperclip/', include('paperclip.urls')),
    re_path(r'^admin/', admin.site.urls),
    url(r'^test/document/dummymodel-(?P<pk>\d+).odt', DummyDocumentOdt.as_view(), name="dummymodel_odt"),
    url(r'^test/document/dummymodel-(?P<pk>\d+).pdf', DummyDocumentWeasyprint.as_view(), name="dummymodel_pdf"),
]
