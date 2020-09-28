from django.db import migrations

def update_contenttypes_table(apps, schema_editor):
    content_type_model = apps.get_model('contenttypes', 'ContentType')
    content_type_model.objects.filter(app_label='git').update(app_label='git_manager')

class Migration(migrations.Migration):

    dependencies = [
        ('git_manager', '0003_gitdata_lfs'),
    ]

    operations = [
        migrations.AlterModelTable('gitdata', 'git_manager_gitdata'),
        migrations.RunPython(update_contenttypes_table),
    ]
