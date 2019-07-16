threshold = .5

for detection in detections:
    frame_number = detection['frame_id']
    height = detection['frame_height']
    width = detection['frame_width']
    detection = detection['detections']

    prediction = detection[0][0]
    for obj in prediction:
        obj_class = int(obj[1])
        obj_value = obj[2]
        if obj_value >= threshold:
            x = obj[3] * width
            y = obj[4] * height
            right = obj[5] * width
            bottom = obj[6] * height

            results.add_box(x, y, right, bottom, obj_class, frame_number)
