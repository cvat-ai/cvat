from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('engine', '0083_move_quality_models'),
    ]

    state_operations = [
        migrations.CreateModel(
            name='QualitySettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('iou_threshold', models.FloatField()),
                ('oks_sigma', models.FloatField()),
                ('line_thickness', models.FloatField()),
                ('low_overlap_threshold', models.FloatField()),
                ('oriented_lines', models.BooleanField()),
                ('line_orientation_threshold', models.FloatField()),
                ('compare_groups', models.BooleanField()),
                ('group_match_threshold', models.FloatField()),
                ('check_covered_annotations', models.BooleanField()),
                ('object_visibility_threshold', models.FloatField()),
                ('panoptic_comparison', models.BooleanField()),
                ('compare_attributes', models.BooleanField()),
                ('task', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='quality_settings', to='engine.task')),
            ],
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='QualityReport',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('target_last_updated', models.DateTimeField()),
                ('gt_last_updated', models.DateTimeField()),
                ('data', models.JSONField()),
                ('job', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='quality_reports', to='engine.job')),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='quality_control.qualityreport')),
                ('task', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='quality_reports', to='engine.task')),
            ],
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='AnnotationConflict',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('frame', models.PositiveIntegerField()),
                ('type', models.CharField(choices=[('missing_annotation', 'MISSING_ANNOTATION'), ('extra_annotation', 'EXTRA_ANNOTATION'), ('mismatching_label', 'MISMATCHING_LABEL'), ('low_overlap', 'LOW_OVERLAP'), ('mismatching_direction', 'MISMATCHING_DIRECTION'), ('mismatching_attributes', 'MISMATCHING_ATTRIBUTES'), ('mismatching_groups', 'MISMATCHING_GROUPS'), ('covered_annotation', 'COVERED_ANNOTATION')], max_length=32)),
                ('importance', models.CharField(choices=[('warning', 'WARNING'), ('error', 'ERROR')], max_length=32)),
                ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conflicts', to='quality_control.qualityreport')),
            ],
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='AnnotationId',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('obj_id', models.PositiveIntegerField()),
                ('job_id', models.PositiveIntegerField()),
                ('type', models.CharField(choices=[('tag', 'TAG'), ('track', 'TRACK'), ('rectangle', 'RECTANGLE'), ('polygon', 'POLYGON'), ('polyline', 'POLYLINE'), ('points', 'POINTS'), ('ellipse', 'ELLIPSE'), ('cuboid', 'CUBOID'), ('mask', 'MASK'), ('skeleton', 'SKELETON')], max_length=32)),
                ('conflict', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='annotation_ids', to='quality_control.annotationconflict')),
            ],
            bases=(models.Model,),
        ),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(state_operations=state_operations)
    ]
