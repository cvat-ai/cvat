/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeSplitter */
"use strict";

class ShapeSplitter {
    constructor() {}

    _convertMutableAttributes(attributes) {
        let result = [];
        for (let attrId in attributes) {
            let attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
            if (attrInfo.mutable) {
                result.push({
                    id: +attrId,
                    value: attributes[attrId].value
                });
            }
        }

        return result;
    }

    split(track, frame) {
        let keyFrames = track.keyframes.sort((a,b) => a - b);
        let exported = track.export();
        if (frame > +keyFrames[0]) {
            let curInterpolation = track.interpolate(frame);
            let prevInterpolation = track.interpolate(frame - 1);
            let curAttributes = this._convertMutableAttributes(curInterpolation.attributes);
            let prevAttrributes = this._convertMutableAttributes(prevInterpolation.attributes);
            let curPositionList = [];
            let prevPositionList = [];

            for (let shape of exported.shapes) {
                if (shape.frame < frame) {
                    prevPositionList.push(shape);
                }
                else if (shape.frame > frame) {
                    curPositionList.push(shape);
                }
            }

            if (track.type.split('_')[1] === 'box') {
                prevPositionList.push(Object.assign({}, prevInterpolation.position, {
                    frame: frame - 1,
                    attributes: prevAttrributes,
                }));

                if (!prevInterpolation.position.outside) {
                    prevPositionList.push(Object.assign({}, prevInterpolation.position, {
                        outside: true,
                        frame: frame,
                        attributes: [],
                    }));
                }
            }

            curPositionList.push(Object.assign(curInterpolation.position, {
                frame: frame,
                attributes: curAttributes,
            }));

            // don't clone id of splitted object
            delete exported.id;
            let prevExported = Object.assign({}, exported);
            let curExported = Object.assign({}, exported);
            prevExported.shapes = prevPositionList;
            prevExported.group_id = 0;
            curExported.shapes = curPositionList;
            curExported.group_id = 0;
            curExported.frame = frame;
            return [prevExported, curExported];
        }
        else {
            return [exported];
        }
    }
}
