# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import mapentity.models
import django.contrib.gis.db.models.fields


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='DummyModel',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(default=b'', max_length=128, blank=True)),
                ('geom', django.contrib.gis.db.models.fields.PointField(default=None, srid=4326, null=True)),
                ('date_update', models.DateTimeField(auto_now=True)),
                ('public', models.BooleanField(default=False)),
            ],
            options={
                'verbose_name': 'Dummy Model',
            },
            bases=(mapentity.models.MapEntityMixin, models.Model),
        ),
        migrations.CreateModel(
            name='MushroomSpot',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(default=b'Empty', max_length=100)),
                ('serialized', models.CharField(default=None, max_length=200, null=True)),
                ('number', models.IntegerField(default=42, null=True)),
                ('size', models.FloatField(default=3.14159, null=True)),
                ('boolean', models.BooleanField(default=True)),
            ],
            bases=(mapentity.models.MapEntityMixin, models.Model),
        ),
        migrations.CreateModel(
            name='WeatherStation',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('geom', django.contrib.gis.db.models.fields.PointField(default=None, srid=2154, null=True)),
            ],
        ),
    ]
