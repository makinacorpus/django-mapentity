from django.conf.urls import patterns, include, url
from django.contrib import admin
from django.views.generic import RedirectView

from .models import DummyModel
from mapentity import registry


handler403 = 'mapentity.views.handler403'

admin.autodiscover()

models_urls = registry.register(DummyModel)

urlpatterns = patterns(
    '',

    url(r'', include(models_urls, namespace='tests')),
    url(r'', include('mapentity.urls', namespace='mapentity',
                     app_name='mapentity')),
    url(r'^home/$', RedirectView.as_view(url='/'), name='home'),
    url(r'^login/$', 'django.contrib.auth.views.login', name='login'),
    url(r'^logout/$', 'django.contrib.auth.views.logout', {'next_page': '/'}, name='logout',),

    url(r'^paperclip/', include('paperclip.urls')),
    url(r'^admin/', include(admin.site.urls)),
)
