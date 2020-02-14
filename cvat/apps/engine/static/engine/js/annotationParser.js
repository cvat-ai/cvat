/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported AnnotationParser */

/* global
    PolyShapeModel:false
    LabelsInfo:false
*/

class AnnotationParser {
    constructor(job, labelsInfo) {
        this._parser = new DOMParser();
        this._startFrame = job.start;
        this._stopFrame = job.stop;
        this._im_meta = job.image_meta_data;
        this._labelsInfo = labelsInfo;
    }

    _xmlParseError(parsedXML) {
        return parsedXML.getElementsByTagName('parsererror');
    }

    _getBoxPosition(box, frame) {
        frame = Math.min(frame - this._startFrame, this._im_meta.length - 1);
        const imWidth = this._im_meta[frame].width;
        const imHeight = this._im_meta[frame].height;

        const xtl = +box.getAttribute("xtl");
        const ytl = +box.getAttribute("ytl");
        const xbr = +box.getAttribute("xbr");
        const ybr = +box.getAttribute("ybr");

        if (xtl < 0 || ytl < 0 || xbr < 0 || ybr < 0
            || xtl > imWidth || ytl > imHeight || xbr > imWidth || ybr > imHeight) {
            const message = `Incorrect bb found in annotation file: xtl=${xtl} `
            + `ytl=${ytl} xbr=${xbr} ybr=${ybr}. `
            + `Box out of range: ${imWidth}x${imHeight}`;
            throw Error(message);
        }

        const occluded = box.getAttribute('occluded');
        const zOrder = box.getAttribute('z_order') || '0';
        return [[xtl, ytl, xbr, ybr], +occluded, +zOrder];
    }

    _getPolyPosition(shape, frame) {
        frame = Math.min(frame - this._startFrame, this._im_meta.length - 1);
        const imWidth = this._im_meta[frame].width;
        const imHeight = this._im_meta[frame].height;
        let points = shape.getAttribute('points').split(';').join(' ');
        points = PolyShapeModel.convertStringToNumberArray(points);

        for (const point of points) {
            if (point.x < 0 || point.y < 0 || point.x > imWidth || point.y > imHeight) {
                const message = `Incorrect point found in annotation file x=${point.x} `
                    + `y=${point.y}. Point out of range ${imWidth}x${imHeight}`;
                throw Error(message);
            }
        }

        points = points.reduce((acc, el) => {
            acc.push(el.x, el.y);
            return acc;
        }, []);

        const occluded = shape.getAttribute('occluded');
        const zOrder = shape.getAttribute('z_order') || '0';
        return [points, +occluded, +zOrder];
    }

    _getAttribute(labelId, attrTag) {
        const name = attrTag.getAttribute('name');
        const attrId = this._labelsInfo.attrIdOf(labelId, name);
        if (attrId === null) {
            throw Error(`An unknown attribute found in the annotation file: ${name}`);
        }
        const attrInfo = this._labelsInfo.attrInfo(attrId);
        const value = LabelsInfo.normalize(attrInfo.type, attrTag.textContent);

        if (['select', 'radio'].includes(attrInfo.type) && !attrInfo.values.includes(value)) {
            throw Error(`Incorrect attribute value found for "${name}" + attribute: "${value}"`);
        } else if (attrInfo.type === 'number') {
            if (Number.isNaN(+value)) {
                throw Error(`Incorrect attribute value found for "${name}" attribute: "${value}". Value must be a number.`);
            } else {
                const min = +attrInfo.values[0];
                const max = +attrInfo.values[1];
                if (+value < min || +value > max) {
                    throw Error(`Number attribute value out of range for "${name}" attribute: "${value}"`);
                }
            }
        }

        return [attrId, value];
    }

    _getAttributeList(shape, labelId) {
        const attributeDict = {};
        const attributes = shape.getElementsByTagName('attribute');
        for (const attribute of attributes) {
            const [id, value] = this._getAttribute(labelId, attribute);
            attributeDict[id] = value;
        }

        const attributeList = [];
        for (const attrId in attributeDict) {
            if (Object.prototype.hasOwnProperty.call(attributeDict, attrId)) {
                attributeList.push({
                    spec_id: attrId,
                    value: attributeDict[attrId],
                });
            }
        }

        return attributeList;
    }

    _getShapeFromPath(shapeType, tracks) {
        const result = [];
        for (const track of tracks) {
            const label = track.getAttribute('label');
            const group = track.getAttribute('group_id') || '0';
            const labelId = this._labelsInfo.labelIdOf(label);
            if (labelId === null) {
                throw Error(`An unknown label found in the annotation file: ${label}`);
            }

            const shapes = Array.from(track.getElementsByTagName(shapeType));
            shapes.sort((a, b) => +a.getAttribute('frame') - +b.getAttribute('frame'));

            while (shapes.length && +shapes[0].getAttribute('outside')) {
                shapes.shift();
            }

            if (shapes.length === 2) {
                if (shapes[1].getAttribute('frame') - shapes[0].getAttribute('frame') === 1
                    && !+shapes[0].getAttribute('outside') && +shapes[1].getAttribute('outside')) {
                    shapes[0].setAttribute('label', label);
                    shapes[0].setAttribute('group_id', group);
                    result.push(shapes[0]);
                }
            }
        }

        return result;
    }

    _parseAnnotationData(xml) {
        const data = {
            boxes: [],
            polygons: [],
            polylines: [],
            points: [],
            cuboids: [],
        };

        const tracks = xml.getElementsByTagName('track');
        const parsed = {
            box: this._getShapeFromPath('box', tracks),
            polygon: this._getShapeFromPath('polygon', tracks),
            polyline: this._getShapeFromPath('polyline', tracks),
            points: this._getShapeFromPath('points', tracks),
            cuboid: this._getShapeFromPath('cuboid', tracks),
        };
        const shapeTarget = {
            box: 'boxes',
            polygon: 'polygons',
            polyline: 'polylines',
            points: 'points',
            cuboid: 'cuboids',
        };

        const images = xml.getElementsByTagName('image');
        for (const image of images) {
            const frame = image.getAttribute('id');

            for (const box of image.getElementsByTagName('box')) {
                box.setAttribute('frame', frame);
                parsed.box.push(box);
            }

            for (const polygon of image.getElementsByTagName('polygon')) {
                polygon.setAttribute('frame', frame);
                parsed.polygon.push(polygon);
            }

            for (const polyline of image.getElementsByTagName('polyline')) {
                polyline.setAttribute('frame', frame);
                parsed.polyline.push(polyline);
            }

            for (const points of image.getElementsByTagName('points')) {
                points.setAttribute('frame', frame);
                parsed.points.push(points);
            }
            for (const cuboid of image.getElementsByTagName('cuboid')) {
                cuboid.setAttribute('frame', frame);
                parsed.cuboid.push(cuboid);
            }
        }

        for (const shapeType in parsed) {
            if (Object.prototype.hasOwnProperty.call(parsed, shapeType)) {
                for (const shape of parsed[shapeType]) {
                    const frame = +shape.getAttribute('frame');
                    if (frame < this._startFrame || frame > this._stopFrame) {
                        continue;
                    }

                    const labelId = this._labelsInfo.labelIdOf(shape.getAttribute('label'));
                    const group = shape.getAttribute('group_id') || '0';
                    if (labelId === null) {
                        throw Error(`An unknown label found in the annotation file: "${shape.getAttribute('label')}"`);
                    }

                    const attributeList = this._getAttributeList(shape, labelId);

                    if (shapeType === 'box') {
                        const [points, occluded, zOrder] = this._getBoxPosition(shape, frame);
                        data[shapeTarget[shapeType]].push({
                            label_id: labelId,
                            group: +group,
                            attributes: attributeList,
                            type: 'rectangle',
                            z_order: zOrder,
                            frame,
                            occluded,
                            points,
                        });
                    } else if (shapeType === 'cuboid') {
                        const [points, occluded, zOrder] = this._getPolyPosition(shape, frame);
                        data[shapeTarget[shapeType]].push({
                            label_id: labelId,
                            group: +group,
                            attributes: attributeList,
                            type: 'cuboid',
                            z_order: zOrder,
                            frame,
                            occluded,
                            points,
                        });
                    } else {
                        const [points, occluded, zOrder] = this._getPolyPosition(shape, frame);
                        data[shapeTarget[shapeType]].push({
                            label_id: labelId,
                            group: +group,
                            attributes: attributeList,
                            type: shapeType,
                            z_order: zOrder,
                            frame,
                            points,
                            occluded,
                        });
                    }
                }
            }
        }

        return data;
    }

    _parseInterpolationData(xml) {
        const data = {
            box_paths: [],
            polygon_paths: [],
            polyline_paths: [],
            points_paths: [],
        };

        const tracks = xml.getElementsByTagName('track');
        for (const track of tracks) {
            const labelId = this._labelsInfo.labelIdOf(track.getAttribute('label'));
            const group = track.getAttribute('group_id') || '0';
            if (labelId === null) {
                throw Error(`An unknown label found in the annotation file: "${track.getAttribute('label')}"`);
            }

            const parsed = {
                box: Array.from(track.getElementsByTagName('box')),
                polygon: Array.from(track.getElementsByTagName('polygon')),
                polyline: Array.from(track.getElementsByTagName('polyline')),
                points: Array.from(track.getElementsByTagName('points')),
            };

            for (const shapeType in parsed) {
                if (Object.prototype.hasOwnProperty.call(parsed, shapeType)) {
                    const shapes = parsed[shapeType];
                    shapes.sort((a, b) => +a.getAttribute('frame') - +b.getAttribute('frame'));

                    while (shapes.length && +shapes[0].getAttribute('outside')) {
                        shapes.shift();
                    }

                    if (shapes.length === 2) {
                        if (shapes[1].getAttribute('frame') - shapes[0].getAttribute('frame') === 1
                            && !+shapes[0].getAttribute('outside') && +shapes[1].getAttribute('outside')) {
                            // pseudo interpolation track (actually is annotation)
                            parsed[shapeType] = [];
                        }
                    }
                }
            }

            let type = null;
            let target = null;
            if (parsed.box.length) {
                type = 'box';
                target = 'box_paths';
            } else if (parsed.polygon.length) {
                type = 'polygon';
                target = 'polygon_paths';
            } else if (parsed.polyline.length) {
                type = 'polyline';
                target = 'polyline_paths';
            } else if (parsed.points.length) {
                type = 'points';
                target = 'points_paths';
            } else {
                continue;
            }

            const path = {
                label_id: labelId,
                group: +group,
                frame: +parsed[type][0].getAttribute('frame'),
                attributes: [],
                shapes: [],
            };

            if (path.frame > this._stopFrame) {
                continue;
            }

            for (const shape of parsed[type]) {
                const keyFrame = +shape.getAttribute('keyframe');
                const outside = +shape.getAttribute('outside');
                const frame = +shape.getAttribute('frame');

                /*
                    All keyframes are significant.
                    All shapes on first segment frame also significant.
                    Ignore all frames less then start.
                    Ignore all frames more then stop.
                */
                const significant = (keyFrame || frame === this._startFrame)
                    && frame >= this._startFrame && frame <= this._stopFrame;

                if (significant) {
                    const attributeList = this._getAttributeList(shape, labelId);
                    const shapeAttributes = [];
                    const pathAttributes = [];

                    for (const attr of attributeList) {
                        const attrInfo = this._labelsInfo.attrInfo(attr.spec_id);
                        if (attrInfo.mutable) {
                            shapeAttributes.push({
                                spec_id: attr.spec_id,
                                value: attr.value,
                            });
                        } else {
                            pathAttributes.push({
                                spec_id: attr.spec_id,
                                value: attr.value,
                            });
                        }
                    }
                    path.attributes = pathAttributes;

                    if (type === 'box') {
                        const [points, occluded, zOrder] = this._getBoxPosition(shape,
                            Math.clamp(frame, this._startFrame, this._stopFrame));
                        path.shapes.push({
                            attributes: shapeAttributes,
                            type: 'rectangle',
                            frame,
                            occluded,
                            outside,
                            points,
                            zOrder,
                        });
                    } else {
                        const [points, occluded, zOrder] = this._getPolyPosition(shape,
                            Math.clamp(frame, this._startFrame, this._stopFrame));
                        path.shapes.push({
                            attributes: shapeAttributes,
                            type,
                            frame,
                            occluded,
                            outside,
                            points,
                            zOrder,
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
        const xml = this._parser.parseFromString(text, 'text/xml');
        const parseerror = this._xmlParseError(xml);
        if (parseerror.length) {
            throw Error(`Annotation page parsing error. ${parseerror[0].innerText}`);
        }

        const interpolationData = this._parseInterpolationData(xml);
        const annotationData = this._parseAnnotationData(xml);

        const data = {
            shapes: [],
            tracks: [],
        };


        for (const type in interpolationData) {
            if (Object.prototype.hasOwnProperty.call(interpolationData, type)) {
                Array.prototype.push.apply(data.tracks, interpolationData[type]);
            }
        }

        for (const type in annotationData) {
            if (Object.prototype.hasOwnProperty.call(annotationData, type)) {
                Array.prototype.push.apply(data.shapes, annotationData[type]);
            }
        }

        return data;
    }
}
