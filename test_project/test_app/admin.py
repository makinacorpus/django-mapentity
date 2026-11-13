from django.contrib import admin

from .models import Tag, FileType


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    pass

@admin.register(FileType)
class FileTypeAdmin(admin.ModelAdmin):
    pass