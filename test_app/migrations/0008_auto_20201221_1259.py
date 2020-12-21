# Generated by Django 3.1.4 on 2020-12-21 12:59

import django.contrib.gis.db.models.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('test_app', '0007_event_public'),
    ]

    operations = [
        migrations.CreateModel(
            name='ComplexModel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, default='', max_length=128)),
                ('geom', django.contrib.gis.db.models.fields.GeometryField(srid=2154)),
                ('date_update', models.DateTimeField(auto_now=True)),
                ('public', models.BooleanField(default=False)),
                ('tags', models.ManyToManyField(blank=True, related_name='complexmodels', to='test_app.Tag')),
            ],
            options={
                'verbose_name': 'Complex Model',
            },
        ),
        migrations.RemoveField(
            model_name='event',
            name='themes',
        ),
        migrations.AddField(
            model_name='event',
            name='tags',
            field=models.ManyToManyField(blank=True, help_text='Main tag(s)', related_name='events', to='test_app.Tag', verbose_name='Tags'),
        ),
        migrations.DeleteModel(
            name='AnyGeomModel',
        ),
        migrations.DeleteModel(
            name='Theme',
        ),
    ]
