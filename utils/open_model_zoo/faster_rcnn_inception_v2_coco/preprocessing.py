import cv2
# input_blob
# image
# inputs
image_tensor = input_blob['image_tensor']
_, _, h, w = image_tensor.shape

info = []
info.append(w)
info.append(h)
info.append(1)
inputs['image_info'] = info

in_frame = image if image.shape[:-1] == (h, w) else cv2.resize(image, (w, h))
in_frame = in_frame.transpose((2, 0, 1))  # Change data layout from HWC to CHW

inputs['image_tensor'] = in_frame
