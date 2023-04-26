from django.db import migrations, models

def fix_track_frames_for_skeletons(apps, schema_editor):
    LabeledTrack = apps.get_model("engine", "LabeledTrack")
    for track in LabeledTrack.objects.all():
        for track_shape in track.trackedshape_set.all():
            if track_shape.frame < track.frame:
                track.frame = track_shape.frame
        track.save()
    for track in LabeledTrack.objects.all():
        for element in track.elements.all():
            if element.frame < track.frame:
                track.frame = element.frame
        track.save()




class Migration(migrations.Migration):

    dependencies = [
        ('engine', '0067_alter_cloudstorage_credentials_type'),
    ]

    operations = [
        migrations.RunPython(fix_track_frames_for_skeletons)
    ]
