/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported AnnotationParser */
"use strict";

class AnnotationParser {
    constructor(job, labelsInfo, idGenerator) {
        this._parser = new DOMParser();
        this._startFrame = job.start;
        this._stopFrame = job.stop;
        this._flipped = job.flipped;
        this._im_meta = job.image_meta_data;
        this._labelsInfo = labelsInfo;
        this._idGen = idGenerator;
    }

    _xmlParseError(parsedXML) {
        return parsedXML.getElementsByTagName("parsererror");
    }

    _getBoxPosition(box, frame) {
        frame = Math.min(frame - this._startFrame, this._im_meta['original_size'].length - 1);
        let im_w = this._im_meta['original_size'][frame].width;
        let im_h = this._im_meta['original_size'][frame].height;

        let xtl = +box.getAttribute('xtl');
        let ytl = +box.getAttribute('ytl');
        let xbr = +box.getAttribute('xbr');
        let ybr = +box.getAttribute('ybr');

        if (xtl < 0 || ytl < 0 || xbr < 0 || ybr < 0 ||
            xtl > im_w || ytl > im_h || xbr > im_w || ybr > im_h) {
            let message = `Incorrect bb found in annotation file: xtl=${xtl} ytl=${ytl} xbr=${xbr} ybr=${ybr}. `;
            message += `Box out of range: ${im_w}x${im_h}`;
            throw Error(message);
        }

        if (this._flipped) {
            let _xtl = im_w - xbr;
            let _xbr = im_w - xtl;
            let _ytl = im_h - ybr;
            let _ybr = im_h - ytl;
            xtl = _xtl;
            ytl = _ytl;
            xbr = _xbr;
            ybr = _ybr;
        }

        let occluded = +box.getAttribute('occluded');
        let z_order = box.getAttribute('z_order') || '0';
        return [xtl, ytl, xbr, ybr, occluded, +z_order];
    }

    _getPolyPosition(shape, frame) {
        frame = Math.min(frame - this._startFrame, this._im_meta['original_size'].length - 1);
        let im_w = this._im_meta['original_size'][frame].width;
        let im_h = this._im_meta['original_size'][frame].height;
        let points = shape.getAttribute('points').split(';').join(' ');
        points = PolyShapeModel.convertStringToNumberArray(points);

        for (let point of points) {
            if (point.x < 0 || point.y < 0 || point.x > im_w || point.y > im_h) {
                let message = `Incorrect point found in annotation file x=${point.x} y=${point.y}. `;
                message += `Point out of range ${im_w}x${im_h}`;
                throw Error(message);
            }

            if (this._flipped) {
                point.x = im_w - point.x;
                point.y = im_h - point.y;
            }
        }
        points = PolyShapeModel.convertNumberArrayToString(points);

        let occluded = +shape.getAttribute('occluded');
        let z_order = shape.getAttribute('z_order') || '0';
        return [points, occluded, +z_order];
    }

    _getAttribute(labelId, attrTag) {
        let name = attrTag.getAttribute('name');
        let attrId = this._labelsInfo.attrIdOf(labelId, name);
        if (attrId === null) {
            throw Error('An unknown attribute found in the annotation file: ' + name);
        }
        let attrInfo = this._labelsInfo.attrInfo(attrId);
        let value = this._labelsInfo.strToValues(attrInfo.type, attrTag.innerHTML)[0];

        if (['select', 'radio'].includes(attrInfo.type) && !attrInfo.values.includes(value)) {
            throw Error('Incorrect attribute value found for "' + name + '" attribute: ' + value);
        }
        else if (attrInfo.type === 'number') {
            if (isNaN(+value)) {
                throw Error('Incorrect attribute value found for "' + name + '" attribute: ' + value + '. Value must be a number.');
            }
            else {
                let min = +attrInfo.values[0];
                let max = +attrInfo.values[1];
                if (+value < min || +value > max) {
                    throw Error('Number attribute value out of range for "' + name +'" attribute: ' + value);
                }
            }
        }

        return [attrId, value];
    }

    _getAttributeList(shape, labelId) {
        let attributeDict = {};
        let attributes = shape.getElementsByTagName('attribute');
        for (let attribute of attributes ) {
            let [id, value] = this._getAttribute(labelId, attribute);
            attributeDict[id] = value;
        }

        let attributeList = [];
        for (let attrId in attributeDict) {
            attributeList.push({
                id: attrId,
                value: attributeDict[attrId],
            });
        }

        return attributeList;
    }

    _getShapeFromPath(shape_type, tracks) {
        let result = [];
        for (let track of tracks) {
            let label = track.getAttribute('label');
            let group_id = track.getAttribute('group_id') || '0';
            let labelId = this._labelsInfo.labelIdOf(label);
            if (labelId === null) {
                throw Error(`An unknown label found in the annotation file: ${label}`);
            }

            let shapes = Array.from(track.getElementsByTagName(shape_type));
            shapes.sort((a,b) => +a.getAttribute('frame') - + b.getAttribute('frame'));

            while (shapes.length && +shapes[0].getAttribute('outside')) {
                shapes.shift();
            }

            if (shapes.length === 2) {
                if (shapes[1].getAttribute('frame') - shapes[0].getAttribute('frame') === 1 &&
                    !+shapes[0].getAttribute('outside') && +shapes[1].getAttribute('outside')) {
                    shapes[0].setAttribute('label', label);
                    shapes[0].setAttribute('group_id', group_id);
                    result.push(shapes[0]);
                }
            }
        }

        return result;
    }

    _parseAnnotationData(xml) {
        let data = {
            boxes: [],
            polygons: [],
            polylines: [],
            points: []
        };

        let tracks = xml.getElementsByTagName('track');
        let parsed = {
            boxes: this._getShapeFromPath('box', tracks),
            polygons: this._getShapeFromPath('polygon', tracks),
            polylines: this._getShapeFromPath('polyline', tracks),
            points: this._getShapeFromPath('points', tracks),
        };

        let images = xml.getElementsByTagName('image');
        for (let image of images) {
            let frame = image.getAttribute('id');

            for (let box of image.getElementsByTagName('box')) {
                box.setAttribute('frame', frame);
                parsed.boxes.push(box);
            }

            for (let polygon of image.getElementsByTagName('polygon')) {
                polygon.setAttribute('frame', frame);
                parsed.polygons.push(polygon);
            }

            for (let polyline of image.getElementsByTagName('polyline')) {
                polyline.setAttribute('frame', frame);
                parsed.polylines.push(polyline);
            }

            for (let points of image.getElementsByTagName('points')) {
                points.setAttribute('frame', frame);
                parsed.points.push(points);
            }
        }

        for (let shape_type in parsed) {
            for (let shape of parsed[shape_type]) {
                let frame = +shape.getAttribute('frame');
                if (frame < this._startFrame || frame > this._stopFrame) continue;

                let labelId = this._labelsInfo.labelIdOf(shape.getAttribute('label'));
                let groupId = shape.getAttribute('group_id') || "0";
                if (labelId === null) {
                    throw Error('An unknown label found in the annotation file: ' + shape.getAttribute('label'));
                }

                let attributeList = this._getAttributeList(shape, labelId);

                if (shape_type === 'boxes') {
                    let [xtl, ytl, xbr, ybr, occluded, z_order] = this._getBoxPosition(shape, frame);
                    data.boxes.push({
                        label_id: labelId,
                        group_id: +groupId,
                        frame: frame,
                        occluded: occluded,
                        xtl: xtl,
                        ytl: ytl,
                        xbr: xbr,
                        ybr: ybr,
                        z_order: z_order,
                        attributes: attributeList,
                        id: this._idGen.next(),
                    });
                }
                else {
                    let [points, occluded, z_order] = this._getPolyPosition(shape, frame);
                    data[shape_type].push({
                        label_id: labelId,
                        group_id: +groupId,
                        frame: frame,
                        points: points,
                        occluded: occluded,
                        z_order: z_order,
                        attributes: attributeList,
                        id: this._idGen.next(),
                    });
                }
            }
        }

        return data;
    }

    _parseInterpolationData(xml) {
        let data = {
            box_paths: [],
            polygon_paths: [],
            polyline_paths: [],
            points_paths: []
        };

        let tracks = xml.getElementsByTagName('track');
        for (let track of tracks) {
            let labelId = this._labelsInfo.labelIdOf(track.getAttribute('label'));
            let groupId = track.getAttribute('group_id') || '0';
            if (labelId === null) {
                throw Error('An unknown label found in the annotation file: ' + name);
            }

            let parsed = {
                boxes: Array.from(track.getElementsByTagName('box')),
                polygons: Array.from(track.getElementsByTagName('polygon')),
                polylines: Array.from(track.getElementsByTagName('polyline')),
                points: Array.from(track.getElementsByTagName('points')),
            };

            for (let shape_type in parsed) {
                let shapes = parsed[shape_type];
                shapes.sort((a,b) => +a.getAttribute('frame') - + b.getAttribute('frame'));

                while (shapes.length && +shapes[0].getAttribute('outside')) {
                    shapes.shift();
                }

                if (shapes.length === 2) {
                    if (shapes[1].getAttribute('frame') - shapes[0].getAttribute('frame') === 1 &&
                        !+shapes[0].getAttribute('outside') && +shapes[1].getAttribute('outside')) {
                        parsed[shape_type] = [];   // pseudo interpolation track (actually is annotation)
                    }
                }
            }

            let type = null, target = null;
            if (parsed.boxes.length) {
                type = 'boxes';
                target = 'box_paths';
            }
            else if (parsed.polygons.length) {
                type = 'polygons';
                target = 'polygon_paths';
            }
            else if (parsed.polylines.length) {
                type = 'polylines';
                target = 'polyline_paths';
            }
            else if (parsed.points.length) {
                type = 'points';
                target = 'points_paths';
            }
            else continue;

            let path = {
                label_id: labelId,
                group_id: +groupId,
                frame: +parsed[type][0].getAttribute('frame'),
                attributes: [],
                shapes: [],
                id: this._idGen.next(),
            };

            for (let shape of parsed[type]) {
                let keyFrame = +shape.getAttribute('keyframe');
                let outside = +shape.getAttribute('outside');
                let frame = +shape.getAttribute('frame');

                /*
                    All keyframes are significant.
                    All shapes on first segment frame also significant.
                    Ignore all frames less then start.
                    Ignore all frames more then stop.
                */
                let significant = keyFrame || frame === this._startFrame;

                if (significant) {
                    let attributeList = this._getAttributeList(shape, labelId);
                    let shapeAttributes = [];
                    let pathAttributes = [];

                    for (let attr of attributeList) {
                        let attrInfo = this._labelsInfo.attrInfo(attr.id);
                        if (attrInfo.mutable) {
                            shapeAttributes.push({
                                id: attr.id,
                                value: attr.value,
                            });
                        }
                        else {
                            pathAttributes.push({
                                id: attr.id,
                                value: attr.value,
                            });
                        }
                    }
                    path.attributes = pathAttributes;

                    if (type === 'boxes') {
                        let [xtl, ytl, xbr, ybr, occluded, z_order] = this._getBoxPosition(shape, Math.clamp(frame, this._startFrame, this._stopFrame));
                        path.shapes.push({
                            frame: frame,
                            occluded: occluded,
                            outside: outside,
                            xtl: xtl,
                            ytl: ytl,
                            xbr: xbr,
                            ybr: ybr,
                            z_order: z_order,
                            attributes: shapeAttributes,
                        });
                    }
                    else {
                        let [points, occluded, z_order] = this._getPolyPosition(shape, Math.clamp(frame, this._startFrame, this._stopFrame));
                        path.shapes.push({
                            frame: frame,
                            occluded: occluded,
                            outside: outside,
                            points: points,
                            z_order: z_order,
                            attributes: shapeAttributes,
                        });
                    }
                }
            }

            if (path.shapes.length) {
                data[target].push(path);
            }
        }

        return data;
    }

    parse(text) {
        let xml = this._parser.parseFromString(text, 'text/xml');
        let parseerror = this._xmlParseError(xml);
        if (parseerror.length) {
            throw Error('Annotation page parsing error. ' + parseerror[0].innerText);
        }

        let interpolationData = this._parseInterpolationData(xml);
        let annotationData = this._parseAnnotationData(xml);
        return Object.assign({}, annotationData, interpolationData);
    }
}
