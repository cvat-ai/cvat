from collections import OrderedDict

from django.db import transaction

from cvat.apps.annotation.annotation import Annotation
from cvat.apps.engine.annotation import TaskAnnotation
from cvat.apps.engine.models import ShapeType

import datumaro.components.extractor as datumaro
from datumaro.util.image import decode_image


class CvatImagesExtractor(datumaro.Extractor):
    # _SUPPORTED_FORMATS = ['.png', '.jpg']

    def __init__(self, url, frame_provider):
        super().__init__()

        self._frame_provider = frame_provider

    def __iter__(self):
        frames = self._frame_provider.get_frames(self._frame_provider.Quality.ORIGINAL)
        for item_id, image in enumerate(frames):
            yield datumaro.DatasetItem(
                id=item_id,
                image=decode_image(image.getvalue())
            )

    def __len__(self):
        return len(self._frame_provider)

    def subsets(self):
        return self._subsets

    def get(self, item_id, subset=None, path=None):
        if path or subset:
            raise KeyError()
        return datumaro.DatasetItem(
            id=item_id,
            image=self._frame_provider[item_id].getvalue()
        )

class CvatTaskExtractor(datumaro.Extractor):
    def __init__(self, url, db_task, user):
        self._db_task = db_task
        self._categories = self._load_categories()

        cvat_annotations = TaskAnnotation(db_task.id, user)
        with transaction.atomic():
            cvat_annotations.init_from_db()
        cvat_annotations = Annotation(cvat_annotations.ir_data, db_task)

        dm_annotations = []

        for cvat_anno in cvat_annotations.group_by_frame():
            dm_anno = self._read_cvat_anno(cvat_anno)
            dm_item = datumaro.DatasetItem(
                id=cvat_anno.frame, annotations=dm_anno)
            dm_annotations.append((dm_item.id, dm_item))

        dm_annotations = sorted(dm_annotations, key=lambda e: int(e[0]))
        self._items = OrderedDict(dm_annotations)

        self._subsets = None

    def __iter__(self):
        for item in self._items.values():
            yield item

    def __len__(self):
        return len(self._items)

    def subsets(self):
        return self._subsets

    def get(self, item_id, subset=None, path=None):
        if path or subset:
            raise KeyError()
        return self._items[item_id]

    def _load_categories(self):
        categories = {}
        label_categories = datumaro.LabelCategories()

        db_labels = self._db_task.label_set.all()
        for db_label in db_labels:
            db_attributes = db_label.attributespec_set.all()
            label_categories.add(db_label.name)

            for db_attr in db_attributes:
                label_categories.attributes.add(db_attr.name)

        categories[datumaro.AnnotationType.label] = label_categories

        return categories

    def categories(self):
        return self._categories

    def _read_cvat_anno(self, cvat_anno):
        item_anno = []

        categories = self.categories()
        label_cat = categories[datumaro.AnnotationType.label]

        label_map = {}
        label_attrs = {}
        db_labels = self._db_task.label_set.all()
        for db_label in db_labels:
            label_map[db_label.name] = label_cat.find(db_label.name)[0]

            attrs = {}
            db_attributes = db_label.attributespec_set.all()
            for db_attr in db_attributes:
                attrs[db_attr.name] = db_attr.default_value
            label_attrs[db_label.name] = attrs
        map_label = lambda label_db_name: label_map[label_db_name]

        for tag_obj in cvat_anno.tags:
            anno_group = tag_obj.group
            if isinstance(anno_group, int):
                anno_group = anno_group
            anno_label = map_label(tag_obj.label)
            anno_attr = dict(label_attrs[tag_obj.label])
            for attr in tag_obj.attributes:
                anno_attr[attr.name] = attr.value

            anno = datumaro.LabelObject(label=anno_label,
                attributes=anno_attr, group=anno_group)
            item_anno.append(anno)

        for shape_obj in cvat_anno.labeled_shapes:
            anno_group = shape_obj.group
            if isinstance(anno_group, int):
                anno_group = anno_group
            anno_label = map_label(shape_obj.label)
            anno_attr = dict(label_attrs[shape_obj.label])
            for attr in shape_obj.attributes:
                anno_attr[attr.name] = attr.value

            anno_points = shape_obj.points
            if shape_obj.type == ShapeType.POINTS:
                anno = datumaro.PointsObject(anno_points,
                    label=anno_label, attributes=anno_attr, group=anno_group)
            elif shape_obj.type == ShapeType.POLYLINE:
                anno = datumaro.PolyLineObject(anno_points,
                    label=anno_label, attributes=anno_attr, group=anno_group)
            elif shape_obj.type == ShapeType.POLYGON:
                anno = datumaro.PolygonObject(anno_points,
                    label=anno_label, attributes=anno_attr, group=anno_group)
            elif shape_obj.type == ShapeType.RECTANGLE:
                x0, y0, x1, y1 = anno_points
                anno = datumaro.BboxObject(x0, y0, x1 - x0, y1 - y0,
                    label=anno_label, attributes=anno_attr, group=anno_group)
            else:
                raise Exception("Unknown shape type '%s'" % (shape_obj.type))

            item_anno.append(anno)

        return item_anno