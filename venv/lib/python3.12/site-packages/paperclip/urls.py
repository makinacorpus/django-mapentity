from django.urls import re_path
from paperclip import views

urlpatterns = [
    re_path(r'^add-for/(?P<app_label>[\w\-]+)/'
            r'(?P<model_name>[\w\-]+)/(?P<pk>\d+)/$',
            views.add_attachment,
            name="add_attachment"),
    re_path(r'^update/(?P<attachment_pk>\d+)/$',
            views.update_attachment,
            name="update_attachment"),
    re_path(r'^delete/(?P<attachment_pk>\d+)/$',
            views.delete_attachment,
            name="delete_attachment"),
    re_path(r'^star/(?P<attachment_pk>\d+)/$',
            views.star_attachment,
            name="star_attachment"),
    re_path(r'^get/(?P<app_label>[\w\-]+)/(?P<model_name>[\w\-]+)/(?P<pk>\d+)/$',
            views.get_attachments,
            name="get_attachments"),
]
