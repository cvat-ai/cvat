/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeSplitter */
"use strict";

class ShapeSplitter {
    _convertMutableAttributes(attributes) {
        const result = [];
        for (const attrId in attributes) {
            if (Object.prototype.hasOwnProperty.call(attributes, attrId)) {
                const attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
                if (attrInfo.mutable) {
                    result.push({
                        id: +attrId,
                        value: attributes[attrId].value,
                    });
                }
            }
        }

        return result;
    }

    split(track, frame) {
        const keyFrames = track.keyframes.map(keyframe => +keyframe).sort((a, b) => a - b);
        const exported = track.export();

        if (frame > +keyFrames[0]) {
            const curInterpolation = track.interpolate(frame);
            const prevInterpolation = track.interpolate(frame - 1);
            const curAttributes = this._convertMutableAttributes(curInterpolation.attributes);
            const prevAttrributes = this._convertMutableAttributes(prevInterpolation.attributes);
            const curPositionList = [];
            const prevPositionList = [];

            for (const shape of exported.shapes) {
                if (shape.frame < frame - 1) {
                    prevPositionList.push(shape);
                } else if (shape.frame > frame) {
                    curPositionList.push(shape);
                }
            }

            if (track.type.split('_')[1] === 'box') {
                const prevPos = prevInterpolation.position;
                prevPositionList.push(Object.assign({}, {
                    frame: frame - 1,
                    attributes: prevAttrributes,
                    type: 'box',
                }, prevPos));

                const curPos = curInterpolation.position;
                prevPositionList.push(Object.assign({}, {
                    frame,
                    attributes: curAttributes,
                    type: 'box',
                }, curPos, { outside: true }));

                curPositionList.push(Object.assign({}, {
                    frame,
                    attributes: curAttributes,
                    type: 'box',
                }, curPos));
            } else {
                const curPos = curInterpolation.position;
                curPositionList.push(Object.assign({
                    frame,
                    attributes: curAttributes,
                    type: track.type.split('_')[1],
                }, curPos));
            }

            // don't clone id of splitted object
            delete exported.id;
            // don't clone group of splitted object
            delete exported.group;

            const prevExported = JSON.parse(JSON.stringify(exported));
            const curExported = JSON.parse(JSON.stringify(exported));
            prevExported.shapes = prevPositionList;
            curExported.shapes = curPositionList;
            curExported.frame = frame;
            return [prevExported, curExported];
        }
        return [exported];
    }
}
