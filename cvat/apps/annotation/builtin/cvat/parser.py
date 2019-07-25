import xml.etree.ElementTree as et
context = et.iterparse(file_object, events=("start", "end"))
context = iter(context)
ev, root = next(context)

supported_shapes = ('box', 'polygon', 'polyline', 'points')

track = None
shape = None
image_is_opened = False
for ev, el in context:
    if ev == 'start':
        if el.tag == 'track':
            track = annotations.Track(
                label=el.attrib['label'],
                group=int(el.attrib.get('group_id', 0)),
                shapes=[],
            )
        elif el.tag == 'image':
            image_is_opened = True
            frame_id = int(el.attrib['id'])
        elif el.tag in supported_shapes and (track is not None or image_is_opened):
            shape = {
                'attributes': [],
                'points': [],
            }
    elif ev == 'end':
        if el.tag == 'attribute' and shape is not None:
            shape['attributes'].append(annotations.Attribute(
                name=el.attrib['name'],
                value=el.text,
            ))
        if el.tag in supported_shapes:
            if track is not None:
                shape['frame'] = el.attrib['frame']
                shape['outside'] = el.attrib['outside'] == "1"
                shape['keyframe'] = el.attrib['keyframe'] == "1"
            else:
                shape['frame'] = frame_id
                shape['label'] = el.attrib['label']
                shape['group'] = int(el.attrib.get('group_id', 0))

            shape['type'] = 'rectangle' if el.tag == 'box' else el.tag
            shape['occluded'] = el.attrib['occluded'] == '1'
            shape['z_order'] = int(el.attrib.get('z_order', 0))

            if el.tag == 'box':
                shape['points'].append(el.attrib['xtl'])
                shape['points'].append(el.attrib['ytl'])
                shape['points'].append(el.attrib['xbr'])
                shape['points'].append(el.attrib['ybr'])
            else:
                for pair in el.attrib['points'].split(';'):
                    shape['points'].extend(map(float, pair.split(',')))

            if track is not None:
                track.shapes.append(annotations.TrackedShape(**shape))
            else:
                annotations.add_shape(annotations.LabeledShape(**shape))
            shape = None

        elif el.tag == 'track':
            annotations.add_track(track)
            track = None
        elif el.tag == 'image':
            image_is_opened = False
        el.clear()
