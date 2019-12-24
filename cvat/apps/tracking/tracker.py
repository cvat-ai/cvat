from cvat.apps.engine.models import TrackedShape
import cv2
import copy


def rectanlge_to_cv_bbox(rectangle_points):
    """
    Convert the CVAT rectangle points (serverside) to a OpenCV rectangle.
    :param tuple rectangle_points: Tuple of form (x1,y1,x2,y2)
    :return: Form (x1, y1, width, height)
    """
    # Dimensions must be ints, otherwise tracking throws a exception
    return (int(rectangle_points[0]), int(rectangle_points[1]),
            int(rectangle_points[2] - rectangle_points[0]),
            int(rectangle_points[3] - rectangle_points[1]))

def cv_bbox_to_rectangle(cv_bbox):
    """
    Convert the OpenCV bounding box points to a CVAT rectangle points.
    :param tuple cv_bbox: Form (x1, y1, width, height)
    :return: Form (x1,y1,x2,y2)
    """
    return (cv_bbox[0], cv_bbox[1], cv_bbox[0] + cv_bbox[2], cv_bbox[1] + cv_bbox[3])

def image_iterable_from_task(task, start_frame, stop_frame):
    """
    Create a iterable to iterate over the images from a CVAT task.
    :param Task task The Django model of type Task
    :param int start_frame: Frame number where iteration should start (included)
    :param int stop_frame: First frame that is excluded from iteration (excluded)
    :return: Iterable over OpenCV images
    """
    for frame in range(start_frame, stop_frame):
        image_path = task.get_frame_path(frame)
        img = cv2.imread(image_path)
        yield frame, img

class RectangleTracker:
    trackerTypes = ['BOOSTING', 'MIL', 'KCF', 'CSRT', 'MEDIANFLOW', 'TLD',
        'MOSSE', 'GOTRUN']

    def __init__(self, trackerType = "BOOSTING"):
        """Create tracker.
        :param str trackerType: String specifying tracker, see trackerTypes.
        """
        trackerTypes_constructor = {
            'BOOSTING': cv2.TrackerBoosting_create,
            'MIL': cv2.TrackerMIL_create,
            'KCF': cv2.TrackerKCF_create,
            'CSRT': cv2.TrackerCSRT_create,
            'MEDIANFLOW': cv2.TrackerMedianFlow_create,
            'TLD': cv2.TrackerTLD_create,
            'MOSSE': cv2.TrackerMOSSE_create,
            'GOTRUN': cv2.TrackerGOTURN_create,
        }
        if trackerType not in trackerTypes_constructor:
            raise Exception("Tracker type not known:" + trackerType)    
        self._tracker = trackerTypes_constructor[trackerType]()

    def track_rectangles(self, task, start_shape, stop_frame):
        """
        Follow an the rectangle in consecutive frames of a task.
        :param Task task: The Django Task with the images
        :param TrackedShape start_shape: Start tracking with this shape; This
            specifies the frame to start at (start_shape.frame).
        :param int stop_frame: Stop tracking at this frame (excluded).
        :return: List of Shapes (Rectangles) with new shapes.
        """
        if not isinstance(start_shape, TrackedShape):
             raise Exception("start_shape must be of type TrackedShape")    

        # Only track in to future.
        start_frame = start_shape.frame
        if stop_frame < start_frame:
            return []

        # Load the image iterable for range of frames
        # and init the tracker with the bounding box from the user given shape
        images = image_iterable_from_task(task, start_frame, stop_frame)
        img0 = next(images)[1]
        bbox = rectanlge_to_cv_bbox(start_shape.points)
        no_error = self._tracker.init(img0, bbox)

        #Generated shapes
        shapes_by_tracking = []
        for frame, img  in images:
            # Let the tracker find the bounding box in the next image(s)
            no_error, bbox = self._tracker.update(img)

            if no_error:
                new_shape = copy.copy(start_shape)
                new_shape.pk = None
                new_shape.points = cv_bbox_to_rectangle(bbox)
                new_shape.frame = frame
                shapes_by_tracking.append(new_shape)
            else:
                break

        return shapes_by_tracking


