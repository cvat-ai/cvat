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
                    spec_id: +attrId,
                    value: attributes[attrId].value
                });
            }
        }

        return result;
    }

    split(track, frame) {
        const keyFrames = track.keyframes.sort((a,b) => a - b);
        const exported = track.export();
        if (frame > +keyFrames[0]) {
            const curInterpolation = track.interpolate(frame);
            const prevInterpolation = track.interpolate(frame - 1);
            const curAttributes = this._convertMutableAttributes(curInterpolation.attributes);
            const prevAttrributes = this._convertMutableAttributes(prevInterpolation.attributes);
            const curPositionList = [];
            const prevPositionList = [];

            for (let shape of exported.shapes) {
                if (shape.frame < frame) {
                    prevPositionList.push(shape);
                }
                else if (shape.frame > frame) {
                    curPositionList.push(shape);
                }
            }

            if (track.type.split('_')[1] === 'box') {
                const prevPos = prevInterpolation.position;
                prevPositionList.push({
                    frame: frame - 1,
                    attributes: prevAttrributes,
                    points: [prevPos.xtl, prevPos.xbr, prevPos.ytl, prevPos.ybr],
                    type: "rectangle",
                    occluded: Boolean(prevPos.occluded),
                    outside: Boolean(prevPos.outside),
                });

                if (!prevPos.outside) {
                    prevPositionList.push({
                        frame: frame - 1,
                        attributes: [],
                        points: [prevPos.xtl, prevPos.xbr, prevPos.ytl, prevPos.ybr],
                        type: "rectangle",
                        occluded: Boolean(prevPos.occluded),
                        outside: true,
                    });
                }

                const curPos = curInterpolation.position;
                curPositionList.push({
                    frame: frame,
                    attributes: curAttributes,
                    points: [curPos.xtl, curPos.xbr, curPos.ytl, curPos.ybr],
                    type: "rectangle",
                    occluded: Boolean(curPos.occluded),
                    outside: Boolean(curPos.outside),
                });
            } else {
                const curPos = curInterpolation.position;
                curPositionList.push({
                    frame: frame,
                    attributes: curAttributes,
                    points: curPos.points.split(' ').join(','),
                    type: track.type.split('_')[1],
                    occluded: Boolean(curPos.occluded),
                    outside: Boolean(curPos.outside),
                });
            }

            // don't clone id of splitted object
            delete exported.id;
            // don't clone group of splitted object
            delete exported.group;

            let prevExported = JSON.parse(JSON.stringify(exported));
            let curExported = JSON.parse(JSON.stringify(exported));
            prevExported.shapes = prevPositionList;
            curExported.shapes = curPositionList;
            curExported.frame = frame;
            return [prevExported, curExported];
        }
        else {
            return [exported];
        }
    }
}
