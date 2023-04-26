from django.db import migrations

def fix_track_frames_for_all_tracks(apps, schema_editor):
    LabeledTrack = apps.get_model("engine", "LabeledTrack")

    for track in LabeledTrack.objects.all():
        for tracked_shape in track.trackedshape_set.all():
            if tracked_shape.frame < track.frame:
                track.frame = tracked_shape.frame
        track.save()

def fix_track_frames_for_skeletons(apps, schema_editor):
    LabeledTrack = apps.get_model("engine", "LabeledTrack")

    for track in LabeledTrack.objects.all():
        tracked_shapes = track.trackedshape_set
        if tracked_shapes.count() == 1 and tracked_shapes.first().type == 'skeleton':
            for element in track.elements.all():
                if element.frame < track.frame:
                    track.frame = element.frame
            skeleton_shape = tracked_shapes.first()
            skeleton_shape.frame = track.frame
            skeleton_shape.save()
            track.save()

class Migration(migrations.Migration):

    dependencies = [
        ('engine', '0067_alter_cloudstorage_credentials_type'),
    ]

    operations = [
        migrations.RunPython(fix_track_frames_for_all_tracks),
        migrations.RunPython(fix_track_frames_for_skeletons)
    ]
