from django.contrib import admin

from test_project.test_app.models import Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    pass
