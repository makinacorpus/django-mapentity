"""test_project URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView

from test_app.views import DummyDocumentOdt, DummyDocumentWeasyprint
from django.contrib.auth import views as auth_views

admin.autodiscover()

urlpatterns = [
    path('', include('test_app.urls')),
    path('', include('mapentity.urls')),
    path('home/', RedirectView.as_view(url='/', permanent=True), name='home'),
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), {'next_page': '/'}, name='logout',),

    path('paperclip/', include('paperclip.urls')),
    path('admin/', admin.site.urls),
    path('test/document/dummymodel-<int:pk>.odt', DummyDocumentOdt.as_view(), name="dummymodel_odt"),
    path('test/document/dummymodel-<int:pk>.pdf', DummyDocumentWeasyprint.as_view(), name="dummymodel_pdf"),
    path('i18n/', include('django.conf.urls.i18n')),
]
