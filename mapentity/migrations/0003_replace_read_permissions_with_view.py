import logging

from django.db import migrations

logger = logging.getLogger(__name__)


def get_mapentity_models(apps=None):
    from django.apps import apps as global_apps

    from mapentity.models import BaseMapEntityMixin, MapEntityMixin

    mapentity_models = set()
    for model in global_apps.get_models():
        if issubclass(model, (MapEntityMixin, BaseMapEntityMixin)):
            mapentity_models.add(model)

    try:
        from importlib import import_module

        from django.conf import settings

        if hasattr(settings, "ROOT_URLCONF") and settings.ROOT_URLCONF:
            import_module(settings.ROOT_URLCONF)
            from mapentity.registry import registry

            for model in registry.registry.keys():
                mapentity_models.add(model)
    except Exception:
        pass

    return mapentity_models


def replace_read_permissions_with_view(apps, schema_editor):
    from mapentity.registry import migrate_permissions_to_view

    db_alias = schema_editor.connection.alias
    migrate_permissions_to_view(db_alias=db_alias)


def reverse_replace_read_permissions_with_view(apps, schema_editor):
    db_alias = schema_editor.connection.alias
    ContentType = apps.get_model("contenttypes", "ContentType")
    Permission = apps.get_model("auth", "Permission")

    mapentity_models = get_mapentity_models(apps)

    for model in mapentity_models:
        model_name = model._meta.model_name
        app_label = model._meta.app_label

        content_types = set(
            ContentType.objects.using(db_alias).filter(
                app_label=app_label, model=model_name
            )
        )
        if (
            model._meta.proxy
            and hasattr(model._meta, "proxy_for_model")
            and model._meta.proxy_for_model
        ):
            concrete_opts = model._meta.proxy_for_model._meta
            for ct in ContentType.objects.using(db_alias).filter(
                app_label=concrete_opts.app_label, model=concrete_opts.model_name
            ):
                content_types.add(ct)

        for ct in content_types:
            view_codename = f"view_{model_name}"
            view_perm = (
                Permission.objects.using(db_alias)
                .filter(content_type=ct, codename=view_codename)
                .first()
            )
            if not view_perm:
                continue

            read_codename = f"read_{model_name}"
            read_perm, _ = Permission.objects.using(db_alias).get_or_create(
                content_type=ct,
                codename=read_codename,
                defaults={"name": f"Can read {model._meta.verbose_name_raw}"[:255]},
            )

            for group in view_perm.group_set.using(db_alias).all():
                group.permissions.add(read_perm)

            for user in view_perm.user_set.using(db_alias).all():
                user.user_permissions.add(read_perm)


class Migration(migrations.Migration):
    dependencies = [
        ("mapentity", "0002_alter_logentry_options"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="logentry",
            options={},
        ),
        migrations.RunPython(
            replace_read_permissions_with_view,
            reverse_replace_read_permissions_with_view,
        ),
    ]
