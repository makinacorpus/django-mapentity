# Generated by Django 3.2.15 on 2023-02-15 14:46

import paperclip.models
import paperclip.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("test_app", "0014_sector"),
    ]

    operations = [
        migrations.AddField(
            model_name="attachment",
            name="random_suffix",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AlterField(
            model_name="attachment",
            name="attachment_file",
            field=models.FileField(
                blank=True,
                max_length=512,
                upload_to=paperclip.models.attachment_upload,
                validators=[paperclip.validators.FileMimetypeValidator()],
                verbose_name="File",
            ),
        ),
    ]
