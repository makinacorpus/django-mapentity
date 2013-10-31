from django.conf.urls import patterns, include, url
from django.contrib import admin


admin.autodiscover()

urlpatterns = patterns(
    '',
    url(r'', include('mapentity.urls', namespace='mapentity',
                     app_name='mapentity')),
    url(r'^paperclip/', include('paperclip.urls')),
    #url(r'^admin/', include(admin.site.urls)),
)
