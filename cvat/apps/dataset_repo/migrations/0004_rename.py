from django.db import migrations

def update_contenttypes_table(apps, schema_editor):
    content_type_model = apps.get_model('contenttypes', 'ContentType')
    content_type_model.objects.filter(app_label='git').update(app_label='dataset_repo')

class Migration(migrations.Migration):

    dependencies = [
        ('dataset_repo', '0003_gitdata_lfs'),
    ]

    operations = [
        migrations.AlterModelTable('gitdata', 'dataset_repo_gitdata'),
        migrations.RunPython(update_contenttypes_table),
    ]
