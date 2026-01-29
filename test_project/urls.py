from django.conf import settings
from django.conf.urls import static
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.urls import include, path, re_path
from django.views.generic import RedirectView
from django.views.static import serve
from rest_framework.reverse import reverse_lazy

from test_project.test_app.views import DummyDocumentOdt, DummyDocumentWeasyprint

admin.autodiscover()

urlpatterns = [
    path(
        "",
        RedirectView.as_view(
            url=reverse_lazy("test_app:dummymodel_list"), permanent=True
        ),
        name="home",
    ),
    path("", include("test_project.test_app.urls")),
    path("", include("mapentity.urls")),
    path("tinymce/", include("tinymce.urls")),
    path("i18n/", include("django.conf.urls.i18n")),
    path("login/", auth_views.LoginView.as_view(), name="login"),
    path(
        "logout/",
        auth_views.LogoutView.as_view(),
        {"next_page": "/"},
        name="logout",
    ),
    path("paperclip/", include("paperclip.urls")),
    path("admin/", admin.site.urls),
    path(
        "test/document/dummymodel-<int:pk>.odt",
        DummyDocumentOdt.as_view(),
        name="dummymodel_odt",
    ),
    path(
        "test/document/dummymodel-<int:pk>.pdf",
        DummyDocumentWeasyprint.as_view(),
        name="dummymodel_pdf",
    ),
    re_path(
        r"^media/(?P<path>.*)$",
        serve,
        {
            "document_root": settings.MEDIA_ROOT,
        },
    ),
    path("__debug__/", include("debug_toolbar.urls")),
]

urlpatterns += staticfiles_urlpatterns()
urlpatterns += static.static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
