# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import django.contrib.admin.models
from django.db import migrations

import mapentity.models


class Migration(migrations.Migration):

    dependencies = [
        ('admin', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='LogEntry',
            fields=[
            ],
            options={
                'proxy': True,
            },
            bases=(mapentity.models.MapEntityMixin, 'admin.logentry'),
            managers=[
                ('objects', django.contrib.admin.models.LogEntryManager()),
            ],
        ),
    ]
