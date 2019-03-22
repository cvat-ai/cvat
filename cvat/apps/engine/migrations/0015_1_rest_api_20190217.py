import re
import csv
from io import StringIO
from django.conf import settings
from django.db import migrations, models
import django.db.migrations.operations.special
import django.db.models.deletion
import cvat.apps.engine.models

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




class Migration(migrations.Migration):

    dependencies = [
        ('engine', '0015_rest_api_20190217'),
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
    ]
