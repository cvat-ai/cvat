from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('engine', '0082_alter_job_type'),
    ]

    database_operations = [
        migrations.AlterModelTable('QualityReport', 'quality_control_qualityreport'),
        migrations.AlterModelTable('AnnotationConflict', 'quality_control_annotationconflict'),
        migrations.AlterModelTable('AnnotationId', 'quality_control_annotationid'),
        migrations.AlterModelTable('QualitySettings', 'quality_control_qualitysettings'),
    ]

    state_operations = [
        migrations.DeleteModel('QualityReport'),
        migrations.DeleteModel('AnnotationConflict'),
        migrations.DeleteModel('AnnotationId'),
        migrations.DeleteModel('QualitySettings'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=database_operations,
            state_operations=state_operations)
    ]
