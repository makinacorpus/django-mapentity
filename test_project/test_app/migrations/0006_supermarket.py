# Generated by Django 3.2.10 on 2021-12-08 15:22

import django.contrib.gis.db.models.fields
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("test_app", "0005_city"),
    ]

    operations = [
        migrations.CreateModel(
            name="Supermarket",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "geom",
                    django.contrib.gis.db.models.fields.PolygonField(
                        default=None, null=True, srid=2154
                    ),
                ),
                (
                    "parking",
                    django.contrib.gis.db.models.fields.PointField(
                        default=None, null=True, srid=2154
                    ),
                ),
                (
                    "tag",
                    models.ForeignKey(
                        default=None,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="test_app.tag",
                    ),
                ),
            ],
            options={
                "abstract": False,
            },
        ),
    ]
