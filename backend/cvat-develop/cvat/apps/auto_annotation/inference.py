from .model_loader import ModelLoader
from cvat.apps.engine.utils import import_modules, execute_python_code
import itertools

def _process_detections(detections, path_to_conv_script, restricted=True):
    results = Results()
    local_vars = {
        "detections": detections,
        "results": results,
        }
    source_code = open(path_to_conv_script).read()

    if restricted:
        global_vars = {
            "__builtins__": {
                "str": str,
                "int": int,
                "float": float,
                "max": max,
                "min": min,
                "range": range,
                },
            }
    else:
        global_vars = globals()
        imports = import_modules(source_code)
        global_vars.update(imports)


    execute_python_code(source_code, global_vars, local_vars)

    return results

class Results():
    def __init__(self):
        self._results = {
            "shapes": [],
            "tracks": []
        }

    # https://stackoverflow.com/a/50928627/2701402
    def add_box(self, xtl: float, ytl: float, xbr: float, ybr: float, label: int, frame_number: int, attributes: dict=None):
        """
        xtl - x coordinate, top left
        ytl - y coordinate, top left
        xbr - x coordinate, bottom right
        ybr - y coordinate, bottom right
        """
        self.get_shapes().append({
            "label": label,
            "frame": frame_number,
            "points": [xtl, ytl, xbr, ybr],
            "type": "rectangle",
            "attributes": attributes or {},
        })

    def add_points(self, points: list, label: int, frame_number: int, attributes: dict=None):
        points = self._create_polyshape(points, label, frame_number, attributes)
        points["type"] = "points"
        self.get_shapes().append(points)

    def add_polygon(self, points: list, label: int, frame_number: int, attributes: dict=None):
        polygon = self._create_polyshape(points, label, frame_number, attributes)
        polygon["type"] = "polygon"
        self.get_shapes().append(polygon)

    def add_polyline(self, points: list, label: int, frame_number: int, attributes: dict=None):
        polyline = self._create_polyshape(points, label, frame_number, attributes)
        polyline["type"] = "polyline"
        self.get_shapes().append(polyline)

    def get_shapes(self):
        return self._results["shapes"]

    def get_tracks(self):
        return self._results["tracks"]

    @staticmethod
    def _create_polyshape(points: list, label: int, frame_number: int, attributes: dict=None):
        return {
            "label": label,
            "frame": frame_number,
            "points": list(itertools.chain.from_iterable(points)),
            "attributes": attributes or {},
        }

def run_inference_engine_annotation(data, model_file, weights_file,
       labels_mapping, attribute_spec, convertation_file, job=None, update_progress=None, restricted=True):
    def process_attributes(shape_attributes, label_attr_spec):
        attributes = []
        for attr_text, attr_value in shape_attributes.items():
            if attr_text in label_attr_spec:
                attributes.append({
                    "spec_id": label_attr_spec[attr_text],
                    "value": attr_value,
                })

        return attributes

    def add_shapes(shapes, target_container):
        for shape in shapes:
            if shape["label"] not in labels_mapping:
                    continue
            db_label = labels_mapping[shape["label"]]
            label_attr_spec = attribute_spec.get(db_label)
            target_container.append({
                "label_id": db_label,
                "frame": shape["frame"],
                "points": shape["points"],
                "type": shape["type"],
                "z_order": 0,
                "group": None,
                "occluded": False,
                "attributes": process_attributes(shape["attributes"], label_attr_spec),
            })

    result = {
        "shapes": [],
        "tracks": [],
        "tags": [],
        "version": 0
    }

    data_len = len(data)
    model = ModelLoader(model=model_file, weights=weights_file)

    frame_counter = 0

    detections = []
    for frame in data:
        orig_rows, orig_cols = frame.shape[:2]

        detections.append({
            "frame_id": frame_counter,
            "frame_height": orig_rows,
            "frame_width": orig_cols,
            "detections": model.infer(frame),
        })

        frame_counter += 1
        if job and update_progress and not update_progress(job, frame_counter * 100 / data_len):
            return None

    processed_detections = _process_detections(detections, convertation_file, restricted=restricted)

    add_shapes(processed_detections.get_shapes(), result["shapes"])

    return result
