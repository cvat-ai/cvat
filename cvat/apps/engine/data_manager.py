import copy

import numpy as np
from scipy.optimize import linear_sum_assignment
from shapely import geometry

from . import models


class DataManager:
    def __init__(self, data):
        self.data = data

    def merge(self, data, start_frame, overlap):
        tags = TagManager(self.data.tags)
        tags.merge(data.tags, start_frame, overlap)

        shapes = ShapeManager(self.data.shapes)
        shapes.merge(data.shapes, start_frame, overlap)

        tracks = TrackManager(self.data.tracks)
        tracks.merge(data.tracks, start_frame, overlap)

    def to_shapes(self, end_frame):
        shapes = self.data.shapes
        tracks = TrackManager(self.data.tracks)

        return shapes + tracks.to_shapes(end_frame)

    def to_tracks(self):
        tracks = self.data.tracks
        shapes = ShapeManager(self.data.shapes)

        return tracks + shapes.to_tracks()

class ObjectManager:
    def __init__(self, objects):
        self.objects = objects

    @staticmethod
    def _get_objects_by_frame(objects, start_frame):
        objects_by_frame = {}
        for obj in objects:
            if obj["frame"] >= start_frame:
                if obj["frame"] in objects_by_frame:
                    objects_by_frame[obj["frame"]].append(obj)
                else:
                    objects_by_frame[obj["frame"]] = [obj]

        return objects_by_frame

    @staticmethod
    def _get_cost_threshold():
        raise NotImplementedError()

    @staticmethod
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap):
        raise NotImplementedError()

    @staticmethod
    def _unite_objects(obj0, obj1):
        raise NotImplementedError()

    @staticmethod
    def _modify_unmached_object(obj, end_frame):
        raise NotImplementedError()

    def merge(self, objects, start_frame, overlap):
        # 1. Split objects on two parts: new and which can be intersected
        # with existing objects.
        new_objects = [obj for obj in objects
            if obj["frame"] >= start_frame + overlap]
        int_objects = [obj for obj in objects
            if obj["frame"] < start_frame + overlap]
        assert len(new_objects) + len(int_objects) == len(objects)

        # 2. Convert to more convenient data structure (objects by frame)
        int_objects_by_frame = self._get_objects_by_frame(int_objects, start_frame)
        old_objects_by_frame = self._get_objects_by_frame(self.objects, start_frame)

        # 3. Add new objects as is. It should be done only after old_objects_by_frame
        # variable is initialized.
        self.objects.extend(new_objects)

        # Nothing to merge here. Just add all int_objects if any.
        if not old_objects_by_frame or not int_objects_by_frame:
            for frame in old_objects_by_frame:
                for old_obj in old_objects_by_frame[frame]:
                    self._modify_unmached_object(old_obj, start_frame + overlap)
            self.objects.extend(int_objects)
            return

        # 4. Build cost matrix for each frame and find correspondence using
        # Hungarian algorithm. In this case min_cost_thresh is stronger
        # because we compare only on one frame.
        min_cost_thresh = self._get_cost_threshold()
        for frame in int_objects_by_frame:
            if frame in old_objects_by_frame:
                int_objects = int_objects_by_frame[frame]
                old_objects = old_objects_by_frame[frame]
                cost_matrix = np.empty(shape=(len(int_objects), len(old_objects)),
                    dtype=float)
                # 5.1 Construct cost matrix for the frame.
                for i, int_obj in enumerate(int_objects):
                    for j, old_obj in enumerate(old_objects):
                        cost_matrix[i][j] = 1 - self._calc_objects_similarity(
                            int_obj, old_obj, start_frame, overlap)

                # 6. Find optimal solution using Hungarian algorithm.
                row_ind, col_ind = linear_sum_assignment(cost_matrix)
                old_objects_indexes = list(range(0, len(old_objects)))
                int_objects_indexes = list(range(0, len(int_objects)))
                for i, j in zip(row_ind, col_ind):
                    # Reject the solution if the cost is too high. Remember
                    # inside int_objects_indexes objects which were handled.
                    if cost_matrix[i][j] <= min_cost_thresh:
                        old_objects[j] = self._unite_objects(int_objects[i], old_objects[j])
                        int_objects_indexes[i] = -1
                        old_objects_indexes[j] = -1

                # 7. Add all new objects which were not processed.
                for i in int_objects_indexes:
                    if i != -1:
                        self.objects.append(int_objects[i])

                # 8. Modify all old objects which were not processed
                # (e.g. generate a shape with outside=True at the end).
                for j in old_objects_indexes:
                    if j != -1:
                        self._modify_unmached_object(old_objects[j],
                            start_frame + overlap)
            else:
                # We don't have old objects on the frame. Let's add all new ones.
                self.objects.extend(int_objects_by_frame[frame])

class TagManager(ObjectManager):
    @staticmethod
    def _get_cost_threshold():
        return 0.25

    @staticmethod
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap):
        # TODO: improve the trivial implementation, compare attributes
        return 1 if obj0["label_id"] == obj1["label_id"] else 0

    @staticmethod
    def _unite_objects(obj0, obj1):
        # TODO: improve the trivial implementation
        return obj0 if obj0["frame"] < obj1["frame"] else obj1

    @staticmethod
    def _modify_unmached_object(obj, end_frame):
        pass

def pairwise(iterable):
    a = iter(iterable)
    return zip(a, a)

class ShapeManager(ObjectManager):
    def to_tracks(self):
        tracks = []
        for shape in self.objects:
            shape0 = copy.copy(shape)
            shape0["keyframe"] = True
            shape0["outside"] = False
            # TODO: Separate attributes on mutable and unmutable
            shape0["attributes"] = []
            shape0.pop("group", None)
            shape1 = copy.copy(shape0)
            shape1["outside"] = True
            shape1["frame"] += 1

            track = {
                "label_id": shape["label_id"],
                "frame": shape["frame"],
                "group": shape.get("group", None),
                "attributes": shape["attributes"],
                "shapes": [shape0, shape1]
            }
            tracks.append(track)

        return tracks

    @staticmethod
    def _get_cost_threshold():
        return 0.25

    @staticmethod
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap):
        def _calc_polygons_similarity(p0, p1):
            overlap_area = p0.intersection(p1).area
            return overlap_area / (p0.area + p1.area - overlap_area)

        has_same_type  = obj0["type"] == obj1["type"]
        has_same_label = obj0.get("label_id") == obj1.get("label_id")
        if has_same_type and has_same_label:
            if obj0["type"] == models.ShapeType.RECTANGLE:
                p0 = geometry.box(*obj0["points"])
                p1 = geometry.box(*obj1["points"])

                return _calc_polygons_similarity(p0, p1)
            elif obj0["type"] == models.ShapeType.POLYGON:
                p0 = geometry.Polygon(pairwise(obj0["points"]))
                p1 = geometry.Polygon(pairwise(obj0["points"]))

                return _calc_polygons_similarity(p0, p1)
            else:
                return 0 # FIXME: need some similarity for points and polylines
        return 0

    @staticmethod
    def _unite_objects(obj0, obj1):
        # TODO: improve the trivial implementation
        return obj0 if obj0["frame"] < obj1["frame"] else obj1

    @staticmethod
    def _modify_unmached_object(obj, end_frame):
        pass

class TrackManager(ObjectManager):
    def to_shapes(self, end_frame):
        shapes = []
        for idx, track in enumerate(self.objects):
            for shape in TrackManager.get_interpolated_shapes(track, 0, end_frame):
                if not shape["outside"]:
                    shape["label_id"] = track["label_id"]
                    shape["group"] = track["group"]
                    shape["track_id"] = idx
                    shape["attributes"] += track["attributes"]
                    shapes.append(shape)
        return shapes

    @staticmethod
    def _get_objects_by_frame(objects, start_frame):
        # Just for unification. All tracks are assigned on the same frame
        objects_by_frame = {0: []}
        for obj in objects:
            shape = obj["shapes"][-1] # optimization for old tracks
            if shape["frame"] >= start_frame or not shape["outside"]:
                objects_by_frame[0].append(obj)

        if not objects_by_frame[0]:
            objects_by_frame = {}

        return objects_by_frame

    @staticmethod
    def _get_cost_threshold():
        return 0.5

    @staticmethod
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap):
        if obj0["label_id"] == obj1["label_id"]:
            # Here start_frame is the start frame of next segment
            # and stop_frame is the stop frame of current segment
            # end_frame == stop_frame + 1
            end_frame = start_frame + overlap
            obj0_shapes = TrackManager.get_interpolated_shapes(obj0, start_frame, end_frame)
            obj1_shapes = TrackManager.get_interpolated_shapes(obj1, start_frame, end_frame)
            obj0_shapes_by_frame = {shape["frame"]:shape for shape in obj0_shapes}
            obj1_shapes_by_frame = {shape["frame"]:shape for shape in obj1_shapes}
            assert obj0_shapes_by_frame and obj1_shapes_by_frame

            count, error = 0, 0
            for frame in range(start_frame, end_frame):
                shape0 = obj0_shapes_by_frame.get(frame)
                shape1 = obj1_shapes_by_frame.get(frame)
                if shape0 and shape1:
                    if shape0["outside"] != shape1["outside"]:
                        error += 1
                    else:
                        error += 1 - ShapeManager._calc_objects_similarity(shape0, shape1, start_frame, overlap)
                    count += 1
                elif shape0 or shape1:
                    error += 1
                    count += 1

            return 1 - error / count
        else:
            return 0

    @staticmethod
    def _modify_unmached_object(obj, end_frame):
        shape = obj["shapes"][-1]
        if not shape["outside"]:
            shape = copy.deepcopy(shape)
            shape["frame"] = end_frame
            shape["outside"] = True
            obj["shapes"].append(shape)

    @staticmethod
    def normalize_shape(shape):
        points = np.asarray(shape["points"]).reshape(-1, 2)
        broken_line = geometry.LineString(points)
        points = []
        for off in range(0, 100, 1):
            p = broken_line.interpolate(off / 100, True)
            points.append(p.x)
            points.append(p.y)

        shape = copy.copy(shape)
        shape["points"] = points

        return shape

    @staticmethod
    def get_interpolated_shapes(track, start_frame, end_frame):
        def interpolate(shape0, shape1):
            shapes = []
            is_same_type = shape0["type"] == shape1["type"]
            is_polygon = shape0["type"] == models.ShapeType.POLYGON
            is_polyline = shape0["type"] == models.ShapeType.POLYLINE
            is_same_size = len(shape0["points"]) == len(shape1["points"])
            if not is_same_type or is_polygon or is_polyline or not is_same_size:
                shape0 = TrackManager.normalize_shape(shape0)
                shape1 = TrackManager.normalize_shape(shape1)

            distance = shape1["frame"] - shape0["frame"]
            step = np.subtract(shape1["points"], shape0["points"]) / distance
            for frame in range(shape0["frame"] + 1, shape1["frame"]):
                off = frame - shape0["frame"]
                if shape1["outside"]:
                    points = np.asarray(shape0["points"]).reshape(-1, 2)
                else:
                    points = (shape0["points"] + step * off).reshape(-1, 2)
                shape = copy.deepcopy(shape0)
                if len(points) == 1:
                    shape["points"] = points.flatten()
                else:
                    broken_line = geometry.LineString(points).simplify(0.05, False)
                    shape["points"] = [x for p in broken_line.coords for x in p]

                shape["keyframe"] = False
                shape["frame"] = frame
                shapes.append(shape)
            return shapes

        if track.get("interpolated_shapes"):
            return track["interpolated_shapes"]

        # TODO: should be return an iterator?
        shapes = []
        curr_frame = track["shapes"][0]["frame"]
        prev_shape = {}
        for shape in track["shapes"]:
            if prev_shape:
                assert shape["frame"] > curr_frame
                for attr in prev_shape["attributes"]:
                    if attr["spec_id"] not in map(lambda el: el["spec_id"], shape["attributes"]):
                        shape["attributes"].append(copy.deepcopy(attr))
                if not prev_shape["outside"]:
                    shapes.extend(interpolate(prev_shape, shape))

            shape["keyframe"] = True
            shapes.append(shape)
            curr_frame = shape["frame"]
            prev_shape = shape

        # TODO: Need to modify a client and a database (append "outside" shapes for polytracks)
        if not prev_shape["outside"] and (prev_shape["type"] == models.ShapeType.RECTANGLE
               or prev_shape["type"] == models.ShapeType.POINTS):
            shape = copy.copy(prev_shape)
            shape["frame"] = end_frame
            shapes.extend(interpolate(prev_shape, shape))

        track["interpolated_shapes"] = shapes

        return shapes

    @staticmethod
    def _unite_objects(obj0, obj1):
        track = obj0 if obj0["frame"] < obj1["frame"] else obj1
        assert obj0["label_id"] == obj1["label_id"]
        shapes = {shape["frame"]:shape for shape in obj0["shapes"]}
        for shape in obj1["shapes"]:
            frame = shape["frame"]
            if frame in shapes:
                shapes[frame] = ShapeManager._unite_objects(shapes[frame], shape)
            else:
                shapes[frame] = shape

        track["frame"] = min(obj0["frame"], obj1["frame"])
        track["shapes"] = list(sorted(shapes.values(), key=lambda shape: shape["frame"]))
        track["interpolated_shapes"] = []

        return track
