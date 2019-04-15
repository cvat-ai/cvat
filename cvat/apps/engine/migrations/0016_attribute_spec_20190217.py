import os
import re
import csv
from io import StringIO
from PIL import Image
from django.conf import settings
from django.db import migrations, models
import django.db.migrations.operations.special
import django.db.models.deletion
import cvat.apps.engine.models
from cvat.apps.engine.task import _get_mime



def parse_attribute(value):
    match = re.match(r'^([~@])(\w+)=(\w+):(.+)?$', value)
    if match:
        prefix = match.group(1)
        input_type = match.group(2)
        name = match.group(3)
        if match.group(4):
            values = list(csv.reader(StringIO(match.group(4)),
                quotechar="'"))[0]
        else:
            values = []

        return {'prefix':prefix, 'type':input_type, 'name':name, 'values':values}
    else:
        return None

def split_text_attribute(apps, schema_editor):
    AttributeSpec = apps.get_model('engine', 'AttributeSpec')
    for attribute in AttributeSpec.objects.all():
        spec = parse_attribute(attribute.text)
        if spec:
            attribute.mutable = (spec['prefix'] == '~')
            attribute.input_type = spec['type']
            attribute.name = spec['name']
            attribute.default_value = spec['values'][0] if spec['values'] else ''
            attribute.values = '\n'.join(spec['values'])
            attribute.save()

def join_text_attribute(apps, schema_editor):
    AttributeSpec = apps.get_model('engine', 'AttributeSpec')
    for attribute in AttributeSpec.objects.all():
        attribute.text = ""
        if attribute.mutable:
            attribute.text += "~"
        else:
            attribute.text += "@"

        attribute.text += attribute.input_type
        attribute.text += "=" + attribute.name + ":"
        attribute.text += ",".join(attribute.values.split('\n'))
        attribute.save()

def _get_task_dirname(task_obj):
    return os.path.join(settings.DATA_ROOT, str(task_obj.id))

def _get_upload_dirname(task_obj):
    return os.path.join(_get_task_dirname(task_obj), ".upload")

def _get_frame_path(task_obj, frame):
    return os.path.join(
        _get_task_dirname(task_obj),
        "data",
        str(int(frame) // 10000),
        str(int(frame) // 100),
        str(frame) + '.jpg',
    )

def fill_task_meta_data_forward(apps, schema_editor):
    db_alias = schema_editor.connection.alias
    Task = apps.get_model('engine', 'Task')
    Video_model = apps.get_model('engine', "Video")
    Image_model = apps.get_model('engine', 'Image')

    for db_task in Task.objects.all():
        if db_task.mode == 'interpolation':
            db_video = Video_model()
            db_video.task_id = db_task.id
            db_video.path = os.path.join(_get_upload_dirname(db_task), db_task.source)
            db_video.start_frame = 0
            db_video.stop_frame = db_task.size
            db_video.step = 1

            image = Image.open(_get_frame_path(db_task, 0))
            db_video.width = image.width
            db_video.height = image.height
            image.close()

            db_video.save()
        else:
            filenames = []
            for root, _, files in os.walk(_get_upload_dirname(db_task)):
                fullnames = map(lambda f: os.path.join(root, f), files)
                images = filter(lambda x: _get_mime(x) == 'image', fullnames)
                filenames.extend(images)
            filenames.sort()

            db_images = []
            for i, image_path in enumerate(filenames):
                db_image = Image_model()
                db_image.task_id = db_task.id
                db_image.path = image_path
                db_image.frame = i

                image = Image.open(image_path)
                db_image.width = image.width
                db_image.height = image.height
                image.close()

                db_images.append(db_image)
            Image_model.objects.using(db_alias).bulk_create(db_images)

def fill_task_meta_data_backward(apps, schema_editor):
    db_alias = schema_editor.connection.alias
    Task = apps.get_model('engine', 'Task')
    Video_model = apps.get_model('engine', "Video")
    Image_model = apps.get_model('engine', 'Image')

    for db_task in Task.objects.all():
        upload_dir = _get_upload_dirname(db_task)
        if db_task.mode == 'interpolation':
            video = Video_model.objects.get(task__id=db_task.id)
            db_task.source = os.path.relpath(video.path, upload_dir)
            video.delete()
        else:
            images = Image_model.objects.filter(task__id=db_task.id)
            db_task.source = '{} images: {}, ...'.format(
                len(images),
                ", ".join([os.path.relpath(x.path, upload_dir) for x in images[0:2]])
            )
            images.delete()
        db_task.save()

class Migration(migrations.Migration):

    dependencies = [
        ('engine', '0015_db_redesign_20190217'),
    ]

    operations = [
        migrations.RunPython(
            code=split_text_attribute,
            reverse_code=join_text_attribute,
        ),
        migrations.RemoveField(
            model_name='attributespec',
            name='text',
        ),
        migrations.AlterUniqueTogether(
            name='attributespec',
            unique_together={('label', 'name')},
        ),
        migrations.RunPython(
            code=fill_task_meta_data_forward,
            reverse_code=fill_task_meta_data_backward,
        ),
        migrations.RemoveField(
            model_name='task',
            name='source',
        ),
    ]
