# Generated by Django 3.1.4 on 2020-12-21 16:05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('test_app', '0008_auto_20201221_1259'),
    ]

    operations = [
        migrations.AlterField(
            model_name='complexmodel',
            name='name',
            field=models.CharField(blank=True, default='', max_length=128, verbose_name='Name'),
        ),
    ]
