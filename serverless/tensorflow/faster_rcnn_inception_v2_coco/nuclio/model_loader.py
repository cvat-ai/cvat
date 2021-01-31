
import numpy as np
from PIL import Image
import tensorflow.compat.v1 as tf
tf.disable_v2_behavior()

class ModelLoader:
    def __init__(self, model_path):
        self.session = None

        detection_graph = tf.Graph()
        with detection_graph.as_default():
            od_graph_def = tf.GraphDef()
            with tf.gfile.GFile(model_path, 'rb') as fid:
                serialized_graph = fid.read()
                od_graph_def.ParseFromString(serialized_graph)
                tf.import_graph_def(od_graph_def, name='')
            gpu_fraction = 0.333
            gpu_options = tf.GPUOptions(per_process_gpu_memory_fraction=gpu_fraction,
                                        allow_growth=True)
            config = tf.ConfigProto(gpu_options=gpu_options)
            self.session = tf.Session(graph=detection_graph, config=config)

            self.image_tensor = detection_graph.get_tensor_by_name('image_tensor:0')
            self.boxes = detection_graph.get_tensor_by_name('detection_boxes:0')
            self.scores = detection_graph.get_tensor_by_name('detection_scores:0')
            self.classes = detection_graph.get_tensor_by_name('detection_classes:0')
            self.num_detections = detection_graph.get_tensor_by_name('num_detections:0')

    def __del__(self):
        if self.session:
            self.session.close()
            del self.session

    def infer(self, image):
        width, height = image.size
        if width > 1920 or height > 1080:
            image = image.resize((width // 2, height // 2), Image.ANTIALIAS)
        image_np = np.array(image.getdata())[:, :3].reshape(
            (image.height, image.width, -1)).astype(np.uint8)
        image_np = np.expand_dims(image_np, axis=0)

        return self.session.run(
            [self.boxes, self.scores, self.classes, self.num_detections],
            feed_dict={self.image_tensor: image_np})
