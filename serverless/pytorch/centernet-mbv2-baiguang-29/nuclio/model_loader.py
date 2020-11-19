import numpy as np
from mobilenetv3magicv3 import get_pose_net as create_model
from utils import ctdet_decode, load_model, visualize
import torch
from PIL import Image
from io import BytesIO
import base64
import cv2
import os
import yaml
import json

class ModelLoader:
  def __init__ (self, model_path: str):
    self.INPUT_HEIGHT = 288
    self.INPUT_WIDTH = 384
    self.MEAN = np.array([0.485,0.456,0.406], dtype=np.float32).reshape(1, 1, 3)
    self.STD = np.array([0.229,0.224,0.225], dtype=np.float32).reshape(1, 1, 3)
    self.DOWN_SCALE = 4.0
    # spec file exists in nuclio environment
    spec_file = "/opt/nuclio/function.yaml"
    if os.path.exists(spec_file):
      functionconfig = yaml.safe_load(open(spec_file))
      labels_spec = functionconfig['metadata']['annotations']['spec']
      labels = {item['id']: item['name'] for item in json.loads(labels_spec)}
      self.CLASS_NAMES = [each[1] for each in sorted(labels.items(), key = lambda x:x[0])]
    else:
      self.CLASS_NAMES = ['wire','pet feces','shoe'
                  ,'bar stool a','fan','power strip','dock(ruby)','dock(rubys+tanosv)'
                  ,'bar stool b','scale','clothing item','cleaning robot','fan b'
                  ,'door mark a','door mark b','wheel','door mark c','flat base'
                  ,'whole fan','whole fan b','whole bar stool a','whole bar stool b'
                  ,'fake poop a','dust pan','folding chair','laundry basket'
                  ,'handheld cleaner','sock', 'fake poop b']
    self.PER_CLASS_THRESHOLD = {'wire': 0.22
                            ,'pet feces': 0.08
                            ,'shoe': 0.27
                            ,'bar stool a': 0.17
                            ,'fan': 0.33
                            ,'power strip': 0.21
                            ,'dock(ruby)': 0.3
                            ,'dock(rubys+tanosv)': 0.22
                            ,'bar stool b': 0.2
                            ,'scale': 0.21
                            ,'clothing item': 0.3
                            ,'cleaning robot': 0.25
                            ,'fan b': 0.1
                            ,'door mark a': 0.19
                            ,'door mark b': 0.22
                            ,'wheel': 0.2
                            ,'door mark c': 0.3
                            ,'flat base': 0.25
                            ,'whole fan': 0.2
                            ,'whole fan b': 0.12
                            ,'whole bar stool a': 0.22
                            ,'whole bar stool b': 0.3
                            ,'fake poop a': 0.12
                            ,'dust pan': 0.11
                            ,'folding chair': 0.14
                            ,'laundry basket': 0.15
                            ,'handheld cleaner': 0.08
                            ,'sock': 0.22
                            ,'fake poop b': 0.13}
    self.MODEL = create_model(None, {'hm': 29, 'wh': 2, 'reg': 2}, None)
    self.MODEL = load_model(self.MODEL, model_path)
    self.MODEL.eval()

  def __del__(self):
    del self.MODEL

  def infer(self, im_data: str, from_request: bool = False):
    if from_request:
      out_buf = BytesIO(base64.b64decode(im_data.encode('utf-8')))
      origin_image = Image.open(out_buf)
      origin_image = np.array(origin_image.getdata()).reshape((origin_image.height, origin_image.width, 3)).astype(np.uint8)
      origin_image = cv2.cvtColor(origin_image, cv2.COLOR_RGB2BGR)
    else:
      origin_image = cv2.imread(im_data)

    self.RESOTRE_SCALE_HEIGHT = float(origin_image.shape[0]) / self.INPUT_HEIGHT
    self.RESOTRE_SCALE_WIDTH = float(origin_image.shape[1]) / self.INPUT_WIDTH

    input_image = cv2.resize(origin_image, (self.INPUT_WIDTH, self.INPUT_HEIGHT))
    input_data = ((input_image / 255. - self.MEAN) / self.STD).astype(np.float32)
    input_data = input_data.transpose(2, 0, 1).reshape(1, 3, self.INPUT_HEIGHT, self.INPUT_WIDTH)
    input_data = torch.from_numpy(input_data)
    output = self.MODEL(input_data)[-1]
    hm = output['hm'].sigmoid_()
    wh = output['wh']
    reg = output['reg']
    dets = ctdet_decode(hm, wh, reg=reg, cat_spec_wh=False, K=100)
    dets = self.filter_and_restore(dets)
    # visualize(dets, origin_image)
    print(dets)
    return dets

  def filter_and_restore(self, rets: torch.Tensor):
    dets = []
    rets = rets.detach().numpy().squeeze()
    for det in rets:
        x1,y1,x2,y2,score,classid = det
        x1 = int(float(x1) * self.DOWN_SCALE * self.RESOTRE_SCALE_WIDTH)
        y1 = int(float(y1) * self.DOWN_SCALE * self.RESOTRE_SCALE_HEIGHT)
        x2 = int(float(x2) * self.DOWN_SCALE * self.RESOTRE_SCALE_WIDTH)
        y2 = int(float(y2) * self.DOWN_SCALE * self.RESOTRE_SCALE_HEIGHT)
        score = float(score)
        classid = int(classid)
        class_name = self.CLASS_NAMES[classid]
        if score > self.PER_CLASS_THRESHOLD[class_name]:
            # dets.append((x1,y1,x2,y2,class_name,score))
            dets.append({
                    "confidence": str(score),
                    "label": class_name,
                    "points": [x1,y1,x2,y2],
                    "type": "rectangle",
                })
    return dets


if __name__ == "__main__":
  sess = ModelLoader('./ctdet_288x384_20200806.pth')
  img_path = "./StereoVision_L_52855983_1_0_0_16018_D_Shoe_-6683_-652.jpeg"
  _ = sess.infer(img_path)

  in_buf = BytesIO()
  Image.open(img_path).save(in_buf, 'jpeg') # compress here!!
  request_data = base64.b64encode(in_buf.getvalue()).decode('utf-8')
  _ = sess.infer(request_data, True)
