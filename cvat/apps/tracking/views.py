
# Copyright (C) 2018-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT
import copy

from django.http import JsonResponse
from rest_framework.decorators import api_view
from rules.contrib.views import permission_required

from cvat.apps.authentication.decorators import login_required
from cvat.apps.engine.data_manager import TrackManager
from cvat.apps.engine.models import (Job, TrackedShape)
from cvat.apps.engine.serializers import (TrackedShapeSerializer)
from .tracker import RectangleTracker

# TODO: Put tracker into background task.

@api_view(['POST'])
@login_required
@permission_required(perm=['engine.task.access'], raise_exception=True)
def track(request):
    # Track (with bounding boxes) that should be enriched with new shapes.
    # Done by tracking a existing bounding box

    tracking_job = request.data['trackingJob']
    job_id = request.data['jobId']
    track = tracking_job['track'] #already in server model
    # Start the tracking with the bounding box in this frame
    start_frame = tracking_job['startFrame']
    # Until track this bounding box until this frame (excluded)
    stop_frame = tracking_job['stopFrame']
    # Track the bounding boxes in images from this track
    task = Job.objects.get(pk=job_id).segment.task

    # If we in a large task this creates unnessary many shapes
    # We only need them between start_frame and stop_frame
    shapes_of_track = TrackManager([tracking_job['track']]).to_shapes(
        stop_frame)
    first_frame_in_track = shapes_of_track[0]['frame']

    def shape_to_db(tracked_shape_on_wire):
        s = copy.copy(tracked_shape_on_wire)
        s.pop('group', 0)
        s.pop('attributes', 0)
        s.pop('label_id', 0)
        s.pop('byMachine', 0)
        s.pop('keyframe')
        return TrackedShape(**s)

    # This bounding box is used as a reference for tracking
    start_shape = shape_to_db(shapes_of_track[start_frame-first_frame_in_track])

    # Do the actual tracking and serializee back
    tracker = RectangleTracker()
    new_shapes = tracker.track_rectangles(task, start_shape, stop_frame)
    new_shapes = [TrackedShapeSerializer(s).data for s in new_shapes]

    # Pack recognized shape in a track onto the wire
    track_with_new_shapes = copy.copy(track)
    track_with_new_shapes['shapes'] = new_shapes

    return JsonResponse(track_with_new_shapes)