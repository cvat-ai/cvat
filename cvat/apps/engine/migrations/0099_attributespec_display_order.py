from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('engine', '0098_data_local_storage_backing_cs'),
    ]

    operations = [
        migrations.AddField(
            model_name='attributespec',
            name='display_order',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterModelOptions(
            name='attributespec',
            options={'default_permissions': (), 'ordering': ['display_order']},
        ),
    ]
