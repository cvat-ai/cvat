# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from copy import copy, deepcopy

import math
from typing import Optional, Sequence
import numpy as np
from itertools import chain
from scipy.optimize import linear_sum_assignment
from shapely import geometry

from cvat.apps.engine.models import ShapeType, DimensionType
from cvat.apps.engine.serializers import LabeledDataSerializer
from cvat.apps.dataset_manager.util import deepcopy_simple


class AnnotationIR:
    def __init__(self, dimension, data=None):
        self.reset()
        self.dimension = dimension
        if data:
            self.tags = getattr(data, 'tags', []) or data['tags']
            self.shapes = getattr(data, 'shapes', []) or data['shapes']
            self.tracks = getattr(data, 'tracks', []) or data['tracks']

    def add_tag(self, tag):
        self.tags.append(tag)

    def add_shape(self, shape):
        self.shapes.append(shape)

    def add_track(self, track):
        self.tracks.append(track)

    @property
    def data(self):
        return {
            'version': self.version,
            'tags': self.tags,
            'shapes': self.shapes,
            'tracks': self.tracks,
        }

    def __getitem__(self, key):
        return getattr(self, key)

    def __setitem__(self, key, value):
        return setattr(self, key, value)

    @data.setter
    def data(self, data):
        self.version = data['version']
        self.tags = data['tags']
        self.shapes = data['shapes']
        self.tracks = data['tracks']

    def serialize(self):
        serializer = LabeledDataSerializer(data=self.data)
        if serializer.is_valid(raise_exception=True):
            return serializer.data

    @staticmethod
    def _is_shape_inside(shape, start, stop):
        return start <= int(shape['frame']) <= stop

    @staticmethod
    def _is_track_inside(track, start, stop):
        def has_overlap(a, b):
            # a <= b
            return 0 <= min(b, stop) - max(a, start)

        prev_shape = None
        for shape in track['shapes']:
            if prev_shape and not prev_shape['outside'] and \
                    has_overlap(prev_shape['frame'], shape['frame']):
                return True
            prev_shape = shape

        if not prev_shape['outside'] and prev_shape['frame'] <= stop:
            return True

        return False

    @classmethod
    def _slice_track(cls, track_, start, stop, dimension):
        def filter_track_shapes(shapes):
            shapes = [s for s in shapes if cls._is_shape_inside(s, start, stop)]
            drop_count = 0
            for s in shapes:
                if s['outside']:
                    drop_count += 1
                else:
                    break

            return shapes[drop_count:]

        track = deepcopy(track_)
        segment_shapes = filter_track_shapes(deepcopy(track['shapes']))

        track["elements"] = [
            cls._slice_track(element, start, stop, dimension)
            for element in track.get('elements', [])
        ]

        if len(segment_shapes) < len(track['shapes']):
            interpolated_shapes = TrackManager.get_interpolated_shapes(
                track, start, stop + 1, dimension)
            scoped_shapes = filter_track_shapes(interpolated_shapes)

            if scoped_shapes:
                last_key = sorted(track['shapes'], key=lambda s: s['frame'])[-1]['frame']
                if not scoped_shapes[0]['keyframe']:
                    segment_shapes.insert(0, scoped_shapes[0])
                if last_key >= stop and scoped_shapes[-1]['points'] != segment_shapes[-1]['points']:
                    segment_shapes.append(scoped_shapes[-1])
                elif scoped_shapes[-1]['keyframe'] and \
                        scoped_shapes[-1]['outside']:
                    segment_shapes.append(scoped_shapes[-1])
                elif stop + 1 < len(interpolated_shapes) and \
                        interpolated_shapes[stop + 1]['outside']:
                    segment_shapes.append(interpolated_shapes[stop + 1])

            for shape in segment_shapes:
                shape.pop('keyframe', None)

        track['shapes'] = segment_shapes
        if 0 < len(segment_shapes):
            track['frame'] = track['shapes'][0]['frame']
        return track

    def slice(self, start, stop):
        # makes a data copy from specified frame interval
        splitted_data = AnnotationIR(self.dimension)
        splitted_data.tags = [deepcopy(t)
            for t in self.tags if self._is_shape_inside(t, start, stop)]
        splitted_data.shapes = [deepcopy(s)
            for s in self.shapes if self._is_shape_inside(s, start, stop)]
        splitted_tracks = []
        for t in self.tracks:
            if self._is_track_inside(t, start, stop):
                track = self._slice_track(t, start, stop, self.dimension)
                if 0 < len(track['shapes']):
                    splitted_tracks.append(track)
        splitted_data.tracks = splitted_tracks

        return splitted_data

    def reset(self):
        self.version = 0
        self.tags = []
        self.shapes = []
        self.tracks = []

class AnnotationManager:
    def __init__(self, data):
        self.data = data

    def merge(self, data, start_frame, overlap, dimension):
        tags = TagManager(self.data.tags)
        tags.merge(data.tags, start_frame, overlap, dimension)

        shapes = ShapeManager(self.data.shapes)
        shapes.merge(data.shapes, start_frame, overlap, dimension)

        tracks = TrackManager(self.data.tracks, dimension)
        tracks.merge(data.tracks, start_frame, overlap, dimension)

    def to_shapes(self,
        end_frame: int,
        dimension: DimensionType,
        *,
        included_frames: Optional[Sequence[int]] = None,
        include_outside: bool = False,
        use_server_track_ids: bool = False
    ) -> list:
        shapes = self.data.shapes
        tracks = TrackManager(self.data.tracks, dimension)

        if included_frames is not None:
            shapes = [s for s in shapes if s["frame"] in included_frames]

        return shapes + tracks.to_shapes(end_frame,
            included_frames=included_frames, include_outside=include_outside,
            use_server_track_ids=use_server_track_ids
        )

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
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap, dimension):
        raise NotImplementedError()

    @staticmethod
    def _unite_objects(obj0, obj1):
        raise NotImplementedError()

    def _modify_unmatched_object(self, obj, end_frame):
        raise NotImplementedError()

    def merge(self, objects, start_frame, overlap, dimension):
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
                    self._modify_unmatched_object(old_obj, start_frame + overlap)
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
                            int_obj, old_obj, start_frame, overlap, dimension)

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
                        self._modify_unmatched_object(old_objects[j],
                            start_frame + overlap)
            else:
                # We don't have old objects on the frame. Let's add all new ones.
                self.objects.extend(int_objects_by_frame[frame])

class TagManager(ObjectManager):
    @staticmethod
    def _get_cost_threshold():
        return 0.25

    @staticmethod
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap, dimension):
        # TODO: improve the trivial implementation, compare attributes
        return 1 if obj0["label_id"] == obj1["label_id"] else 0

    @staticmethod
    def _unite_objects(obj0, obj1):
        # TODO: improve the trivial implementation
        return obj0 if obj0["frame"] < obj1["frame"] else obj1

    def _modify_unmatched_object(self, obj, end_frame):
        pass

def pairwise(iterable):
    a = iter(iterable)
    return zip(a, a)

class ShapeManager(ObjectManager):
    def to_tracks(self):
        tracks = []
        for shape in self.objects:
            shape0 = copy(shape)
            shape0["keyframe"] = True
            shape0["outside"] = False
            # TODO: Separate attributes on mutable and unmutable
            shape0["attributes"] = []
            shape0.pop("group", None)
            shape1 = copy(shape0)
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
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap, dimension):
        def _calc_polygons_similarity(p0, p1):
            if p0.is_valid and p1.is_valid: # check validity of polygons
                overlap_area = p0.intersection(p1).area
                if p0.area == 0 or p1.area == 0: # a line with many points
                    return 0
                else:
                    return overlap_area / (p0.area + p1.area - overlap_area)
            else:
                return 0 # if there's invalid polygon, assume similarity is 0

        has_same_type = obj0["type"] == obj1["type"]
        has_same_label = obj0.get("label_id") == obj1.get("label_id")
        if has_same_type and has_same_label:
            if obj0["type"] == ShapeType.RECTANGLE:
                # FIXME: need to consider rotated boxes
                p0 = geometry.box(*obj0["points"])
                p1 = geometry.box(*obj1["points"])

                return _calc_polygons_similarity(p0, p1)
            elif obj0["type"] == ShapeType.CUBOID and dimension == DimensionType.DIM_3D:
                [x_c0, y_c0, z_c0] = obj0["points"][0:3]
                [x_c1, y_c1, z_c1] = obj1["points"][0:3]

                [x_len0, y_len0, z_len0] = obj0["points"][6:9]
                [x_len1, y_len1, z_len1] = obj1["points"][6:9]

                top_view_0 = [
                    x_c0 - x_len0 / 2,
                    y_c0 - y_len0 / 2,
                    x_c0 + x_len0 / 2,
                    y_c0 + y_len0 / 2
                ]

                top_view_1 = [
                    x_c1 - x_len1 / 2,
                    y_c1 - y_len1 / 2,
                    x_c1 + x_len1 / 2,
                    y_c1 + y_len1 / 2
                ]

                p_top0 = geometry.box(*top_view_0)
                p_top1 = geometry.box(*top_view_1)
                top_similarity = _calc_polygons_similarity(p_top0, p_top1)

                side_view_0 = [
                    x_c0 - x_len0 / 2,
                    z_c0 - z_len0 / 2,
                    x_c0 + x_len0 / 2,
                    z_c0 + z_len0 / 2
                ]

                side_view_1 = [
                    x_c1 - x_len1 / 2,
                    z_c1 - z_len1 / 2,
                    x_c1 + x_len1 / 2,
                    z_c1 + z_len1 / 2
                ]
                p_side0 = geometry.box(*side_view_0)
                p_side1 = geometry.box(*side_view_1)
                side_similarity = _calc_polygons_similarity(p_side0, p_side1)

                return top_similarity * side_similarity
            elif obj0["type"] == ShapeType.POLYGON:
                p0 = geometry.Polygon(pairwise(obj0["points"]))
                p1 = geometry.Polygon(pairwise(obj1["points"]))

                return _calc_polygons_similarity(p0, p1)
            else:
                return 0 # FIXME: need some similarity for points, polylines, ellipses and 2D cuboids
        return 0

    @staticmethod
    def _unite_objects(obj0, obj1):
        # TODO: improve the trivial implementation
        return obj0 if obj0["frame"] < obj1["frame"] else obj1

    def _modify_unmatched_object(self, obj, end_frame):
        pass

class TrackManager(ObjectManager):
    def __init__(self, objects, dimension):
        self._dimension = dimension
        super().__init__(objects)

    def to_shapes(self, end_frame: int, *,
        included_frames: Optional[Sequence[int]] = None,
        include_outside: bool = False,
        use_server_track_ids: bool = False
    ) -> list:
        shapes = []
        for idx, track in enumerate(self.objects):
            track_id = track["id"] if use_server_track_ids else idx
            track_shapes = {}

            for shape in TrackManager.get_interpolated_shapes(
                track,
                0,
                end_frame,
                self._dimension,
                include_outside=include_outside,
                included_frames=included_frames,
            ):
                shape["label_id"] = track["label_id"]
                shape["group"] = track["group"]
                shape["track_id"] = track_id
                shape["source"] = track["source"]
                shape["attributes"] += track["attributes"]
                shape["elements"] = []

                track_shapes[shape["frame"]] = shape

            if not track_shapes:
                # This track has no elements on the included frames
                continue

            if track.get("elements"):
                track_elements = TrackManager(track["elements"], self._dimension)
                element_shapes = track_elements.to_shapes(end_frame,
                    included_frames=set(track_shapes.keys()).intersection(included_frames or []),
                    include_outside=True, # elements are controlled by the parent shape
                    use_server_track_ids=use_server_track_ids
                )

                for shape in element_shapes:
                    track_shapes[shape["frame"]]["elements"].append(shape)

                # The whole shape can be filtered out, if all its elements are outside,
                # and outside shapes are not requested.
                if not include_outside:
                    track_shapes = {
                        frame_number: shape for frame_number, shape in track_shapes.items()
                        if not shape["elements"]
                        or not all(elem["outside"] for elem in shape["elements"])
                    }

            shapes.extend(track_shapes.values())
        return shapes

    @staticmethod
    def _get_objects_by_frame(objects, start_frame):
        # Just for unification. All tracks are assigned on the same frame
        objects_by_frame = {0: []}
        for obj in objects:
            if not obj["shapes"]:
                continue

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
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap, dimension):
        if obj0["label_id"] == obj1["label_id"]:
            # Here start_frame is the start frame of next segment
            # and stop_frame is the stop frame of current segment
            # end_frame == stop_frame + 1
            end_frame = start_frame + overlap
            obj0_shapes = TrackManager.get_interpolated_shapes(obj0, start_frame, end_frame, dimension)
            obj1_shapes = TrackManager.get_interpolated_shapes(obj1, start_frame, end_frame, dimension)
            if not obj0_shapes or not obj1_shapes:
                return 0

            obj0_shapes_by_frame = {shape["frame"]:shape for shape in obj0_shapes}
            obj1_shapes_by_frame = {shape["frame"]:shape for shape in obj1_shapes}

            count, error = 0, 0
            for frame in range(start_frame, end_frame):
                shape0 = obj0_shapes_by_frame.get(frame)
                shape1 = obj1_shapes_by_frame.get(frame)
                if shape0 and shape1:
                    if shape0["outside"] != shape1["outside"]:
                        error += 1
                    else:
                        error += 1 - ShapeManager._calc_objects_similarity(shape0, shape1, start_frame, overlap, dimension)
                    count += 1
                elif shape0 or shape1:
                    error += 1
                    count += 1

            return 1 - error / (count or 1)
        else:
            return 0

    def _modify_unmatched_object(self, obj, end_frame):
        shape = obj["shapes"][-1]
        if not shape["outside"]:
            shape = deepcopy(shape)
            shape["frame"] = end_frame
            shape["outside"] = True
            obj["shapes"].append(shape)

            for element in obj.get("elements", []):
                self._modify_unmatched_object(element, end_frame)

    @staticmethod
    def get_interpolated_shapes(
        track, start_frame, end_frame, dimension, *,
        included_frames: Optional[Sequence[int]] = None,
        include_outside: bool = False,
    ):
        def copy_shape(source, frame, points=None, rotation=None):
            copied = source.copy()
            copied["attributes"] = deepcopy_simple(source["attributes"])

            copied["keyframe"] = False
            copied["frame"] = frame
            if rotation is not None:
                copied["rotation"] = rotation

            if points is None:
                points = copied["points"]

            if isinstance(points, np.ndarray):
                points = points.tolist()
            else:
                points = points.copy()

            if points is not None:
                copied["points"] = points

            return copied

        def find_angle_diff(right_angle, left_angle):
            angle_diff = right_angle - left_angle
            angle_diff = ((angle_diff + 180) % 360) - 180
            if abs(angle_diff) >= 180:
                # if the main arc is bigger than 180, go another arc
                # to find it, just subtract absolute value from 360 and inverse sign
                angle_diff = 360 - abs(angle_diff) * -1 if angle_diff > 0 else 1

            return angle_diff

        def simple_interpolation(shape0, shape1):
            shapes = []
            distance = shape1["frame"] - shape0["frame"]
            diff = np.subtract(shape1["points"], shape0["points"])

            for frame in range(shape0["frame"] + 1, shape1["frame"]):
                offset = (frame - shape0["frame"]) / distance
                rotation = (shape0["rotation"] + find_angle_diff(
                    shape1["rotation"], shape0["rotation"],
                ) * offset + 360) % 360
                points = shape0["points"] + diff * offset

                if included_frames is None or frame in included_frames:
                    shapes.append(copy_shape(shape0, frame, points, rotation))

            return shapes

        def simple_3d_interpolation(shape0, shape1):
            result = simple_interpolation(shape0, shape1)
            angles = (shape0["points"][3:6] + shape1["points"][3:6])
            distance = shape1["frame"] - shape0["frame"]

            for shape in result:
                offset = (shape["frame"] - shape0["frame"]) / distance
                for i, angle0 in enumerate(angles):
                    if i < 3:
                        angle1 = angles[i + 3]
                        angle0 = (angle0 if angle0 >= 0 else angle0 + math.pi * 2) * 180 / math.pi
                        angle1 = (angle1 if angle1 >= 0 else angle1 + math.pi * 2) * 180 / math.pi
                        angle = angle0 + find_angle_diff(angle1, angle0) * offset * math.pi / 180
                        shape["points"][i + 3] = angle if angle <= math.pi else angle - math.pi * 2

            return result

        def points_interpolation(shape0, shape1):
            if len(shape0["points"]) == 2 and len(shape1["points"]) == 2:
                return simple_interpolation(shape0, shape1)
            else:
                shapes = []
                for frame in range(shape0["frame"] + 1, shape1["frame"]):
                    if included_frames is None or frame in included_frames:
                        shapes.append(copy_shape(shape0, frame))

            return shapes

        def interpolate_position(left_position, right_position, offset):
            def to_array(points):
                return np.asarray(
                    list(map(lambda point: [point["x"], point["y"]], points))
                ).flatten()

            def to_points(array):
                return list(map(
                    lambda point: {"x": point[0], "y": point[1]}, np.asarray(array).reshape(-1, 2)
                ))

            def curve_length(points):
                length = 0
                for i in range(1, len(points)):
                    dx = points[i]["x"] - points[i - 1]["x"]
                    dy = points[i]["y"] - points[i - 1]["y"]
                    length += np.sqrt(dx ** 2 + dy ** 2)
                return length

            def curve_to_offset_vec(points, length):
                offset_vector = [0]
                accumulated_length = 0
                for i in range(1, len(points)):
                    dx = points[i]["x"] - points[i - 1]["x"]
                    dy = points[i]["y"] - points[i - 1]["y"]
                    accumulated_length += np.sqrt(dx ** 2 + dy ** 2)
                    offset_vector.append(accumulated_length / length)

                return offset_vector

            def find_nearest_pair(value, curve):
                minimum = [0, abs(value - curve[0])]
                for i in range(1, len(curve)):
                    distance = abs(value - curve[i])
                    if distance < minimum[1]:
                        minimum = [i, distance]

                return minimum[0]

            def match_left_right(left_curve, right_curve):
                matching = {}
                for i, left_curve_item in enumerate(left_curve):
                    matching[i] = [find_nearest_pair(left_curve_item, right_curve)]
                return matching

            def match_right_left(left_curve, right_curve, left_right_matching):
                matched_right_points = list(chain.from_iterable(left_right_matching.values()))
                unmatched_right_points = filter(lambda x: x not in matched_right_points, range(len(right_curve)))
                updated_matching = deepcopy_simple(left_right_matching)

                for right_point in unmatched_right_points:
                    left_point = find_nearest_pair(right_curve[right_point], left_curve)
                    updated_matching[left_point].append(right_point)

                for key, value in updated_matching.items():
                    updated_matching[key] = sorted(value)

                return updated_matching

            def reduce_interpolation(interpolated_points, matching, left_points, right_points):
                def average_point(points):
                    sumX = 0
                    sumY = 0
                    for point in points:
                        sumX += point["x"]
                        sumY += point["y"]

                    return {
                        "x": sumX / len(points),
                        "y": sumY / len(points)
                    }

                def compute_distance(point1, point2):
                    return np.sqrt(
                        ((point1["x"] - point2["x"])) ** 2
                        + ((point1["y"] - point2["y"]) ** 2)
                    )

                def minimize_segment(base_length, N, start_interpolated, stop_interpolated):
                    threshold = base_length / (2 * N)
                    minimized = [interpolated_points[start_interpolated]]
                    latest_pushed = start_interpolated
                    for i in range(start_interpolated + 1, stop_interpolated):
                        distance = compute_distance(
                            interpolated_points[latest_pushed], interpolated_points[i]
                        )

                        if distance >= threshold:
                            minimized.append(interpolated_points[i])
                            latest_pushed = i

                    minimized.append(interpolated_points[stop_interpolated])

                    if len(minimized) == 2:
                        distance = compute_distance(
                            interpolated_points[start_interpolated],
                            interpolated_points[stop_interpolated]
                        )

                        if distance < threshold:
                            return [average_point(minimized)]

                    return minimized

                reduced = []
                interpolated_indexes = {}
                accumulated = 0
                for i in range(len(left_points)):
                    interpolated_indexes[i] = []
                    for _ in range(len(matching[i])):
                        interpolated_indexes[i].append(accumulated)
                        accumulated += 1

                def left_segment(start, stop):
                    start_interpolated = interpolated_indexes[start][0]
                    stop_interpolated = interpolated_indexes[stop][0]

                    if start_interpolated == stop_interpolated:
                        reduced.append(interpolated_points[start_interpolated])
                        return

                    base_length = curve_length(left_points[start: stop + 1])
                    N = stop - start + 1

                    reduced.extend(
                        minimize_segment(base_length, N, start_interpolated, stop_interpolated)
                    )


                def right_segment(left_point):
                    start = matching[left_point][0]
                    stop = matching[left_point][-1]
                    start_interpolated = interpolated_indexes[left_point][0]
                    stop_interpolated = interpolated_indexes[left_point][-1]
                    base_length = curve_length(right_points[start: stop + 1])
                    N = stop - start + 1

                    reduced.extend(
                        minimize_segment(base_length, N, start_interpolated, stop_interpolated)
                    )

                previous_opened = None
                for i in range(len(left_points)):
                    if len(matching[i]) == 1:
                        if previous_opened is not None:
                            if matching[i][0] == matching[previous_opened][0]:
                                continue
                            else:
                                start = previous_opened
                                stop = i - 1
                                left_segment(start, stop)
                                previous_opened = i
                        else:
                            previous_opened = i
                    else:
                        if previous_opened is not None:
                            start = previous_opened
                            stop = i - 1
                            left_segment(start, stop)
                            previous_opened = None

                        right_segment(i)

                if previous_opened is not None:
                    left_segment(previous_opened, len(left_points) - 1)

                return reduced

            left_points = to_points(left_position["points"])
            right_points = to_points(right_position["points"])
            left_offset_vec = curve_to_offset_vec(left_points, curve_length(left_points))
            right_offset_vec = curve_to_offset_vec(right_points, curve_length(right_points))

            matching = match_left_right(left_offset_vec, right_offset_vec)
            completed_matching = match_right_left(
                left_offset_vec, right_offset_vec, matching
            )

            interpolated_points = []
            for left_point_index, left_point in enumerate(left_points):
                for right_point_index in completed_matching[left_point_index]:
                    right_point = right_points[right_point_index]
                    interpolated_points.append({
                        "x": left_point["x"] + (right_point["x"] - left_point["x"]) * offset,
                        "y": left_point["y"] + (right_point["y"] - left_point["y"]) * offset
                    })

            reducedPoints = reduce_interpolation(
                interpolated_points,
                completed_matching,
                left_points,
                right_points
            )

            return to_array(reducedPoints).tolist()

        def polyshape_interpolation(shape0, shape1):
            shapes = []
            is_polygon = shape0["type"] == ShapeType.POLYGON
            if is_polygon:
                # Make the polygon closed for computations
                shape0 = shape0.copy()
                shape1 = shape1.copy()
                shape0["points"] = shape0["points"] + shape0["points"][:2]
                shape1["points"] = shape1["points"] + shape1["points"][:2]

            distance = shape1["frame"] - shape0["frame"]
            for frame in range(shape0["frame"] + 1, shape1["frame"]):
                offset = (frame - shape0["frame"]) / distance
                points = interpolate_position(shape0, shape1, offset)

                if included_frames is None or frame in included_frames:
                    shapes.append(copy_shape(shape0, frame, points))

            if is_polygon:
                # Remove the extra point added
                shape0["points"] = shape0["points"][:-2]
                shape1["points"] = shape1["points"][:-2]
                for shape in shapes:
                    shape["points"] = shape["points"][:-2]

            return shapes

        def interpolate(shape0, shape1):
            is_same_type = shape0["type"] == shape1["type"]
            is_rectangle = shape0["type"] == ShapeType.RECTANGLE
            is_ellipse = shape0["type"] == ShapeType.ELLIPSE
            is_cuboid = shape0["type"] == ShapeType.CUBOID
            is_polygon = shape0["type"] == ShapeType.POLYGON
            is_polyline = shape0["type"] == ShapeType.POLYLINE
            is_points = shape0["type"] == ShapeType.POINTS
            is_skeleton = shape0["type"] == ShapeType.SKELETON

            if not is_same_type:
                raise NotImplementedError()

            shapes = []
            if dimension == DimensionType.DIM_3D:
                shapes = simple_3d_interpolation(shape0, shape1)
            if is_rectangle or is_cuboid or is_ellipse or is_skeleton:
                shapes = simple_interpolation(shape0, shape1)
            elif is_points:
                shapes = points_interpolation(shape0, shape1)
            elif is_polygon or is_polyline:
                shapes = polyshape_interpolation(shape0, shape1)
            else:
                raise NotImplementedError()

            return shapes

        def propagate(shape, end_frame, *, included_frames=None):
            return [
                copy_shape(shape, i)
                for i in range(shape["frame"] + 1, end_frame)
                if included_frames is None or i in included_frames
            ]

        shapes = []
        prev_shape = None
        for shape in sorted(track["shapes"], key=lambda shape: shape["frame"]):
            curr_frame = shape["frame"]
            if prev_shape and end_frame <= curr_frame:
                # If we exceed the end_frame and there was a previous shape,
                # we still need to interpolate up to the next keyframe,
                # but keep the results only up to the end_frame:
                #        vvvvvvv
                # ---- | ------- | ----- | ----->
                #     prev      end   cur kf
                interpolated = interpolate(prev_shape, shape)
                interpolated.append(shape)

                for shape in sorted(interpolated, key=lambda shape: shape["frame"]):
                    if shape["frame"] < end_frame:
                        shapes.append(shape)
                    else:
                        break

                # Update the last added shape
                shape["keyframe"] = True
                prev_shape = shape

                break # The track finishes here

            if prev_shape:
                assert curr_frame > prev_shape["frame"], f"{curr_frame} > {prev_shape['frame']}. Track id: {track['id']}" # Catch invalid tracks

                # Propagate attributes
                for attr in prev_shape["attributes"]:
                    if attr["spec_id"] not in map(lambda el: el["spec_id"], shape["attributes"]):
                        shape["attributes"].append(deepcopy_simple(attr))

                if not prev_shape["outside"] or include_outside:
                    shapes.extend(interpolate(prev_shape, shape))

            shape["keyframe"] = True
            shapes.append(shape)
            prev_shape = shape

        if prev_shape and (not prev_shape["outside"] or include_outside):
            # When the latest keyframe of a track is less than the end_frame
            # and it is not outside, need to propagate
            shapes.extend(propagate(prev_shape, end_frame, included_frames=included_frames))

        shapes = [
            shape for shape in shapes

            # After interpolation there can be a finishing frame
            # outside of the task boundaries. Filter it out to avoid errors.
            # https://github.com/openvinotoolkit/cvat/issues/2827
            if track["frame"] <= shape["frame"] < end_frame

            # Exclude outside shapes.
            # Keyframes should be included regardless the outside value
            # If really needed, they can be excluded on the later stages,
            # but here they represent a finishing shape in a visible sequence
            if shape["keyframe"] or not shape["outside"] or include_outside

            if included_frames is None or shape["frame"] in included_frames
        ]

        return shapes

    @staticmethod
    def _unite_objects(obj0, obj1):
        track = obj0 if obj0["frame"] < obj1["frame"] else obj1
        assert obj0["label_id"] == obj1["label_id"]
        shapes = {shape["frame"]: shape for shape in obj0["shapes"]}
        for shape in obj1["shapes"]:
            frame = shape["frame"]
            if frame in shapes:
                shapes[frame] = ShapeManager._unite_objects(shapes[frame], shape)
            else:
                shapes[frame] = shape

        track["frame"] = min(obj0["frame"], obj1["frame"])
        track["shapes"] = list(sorted(shapes.values(), key=lambda shape: shape["frame"]))

        return track
