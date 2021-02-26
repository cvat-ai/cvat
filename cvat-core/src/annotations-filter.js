// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

const jsonLogic = require('json-logic-js');
const { AttributeType, ObjectType } = require('./enums');

class AnnotationsFilter {
    _convertObjects(statesData) {
        const objects = statesData.map((state) => {
            const labelAttributes = state.label.attributes.reduce((acc, attr) => {
                acc[attr.id] = attr;
                return acc;
            }, {});

            let xtl = Number.MAX_SAFE_INTEGER;
            let xbr = Number.MIN_SAFE_INTEGER;
            let ytl = Number.MAX_SAFE_INTEGER;
            let ybr = Number.MIN_SAFE_INTEGER;
            let [width, height] = [null, null];

            if (state.objectType !== ObjectType.TAG) {
                state.points.forEach((coord, idx) => {
                    if (idx % 2) {
                        // y
                        ytl = Math.min(ytl, coord);
                        ybr = Math.max(ybr, coord);
                    } else {
                        // x
                        xtl = Math.min(xtl, coord);
                        xbr = Math.max(xbr, coord);
                    }
                });
                [width, height] = [xbr - xtl, ybr - ytl];
            }

            const attributes = {};
            Object.keys(state.attributes).reduce((acc, key) => {
                const attr = labelAttributes[key];
                let value = state.attributes[key].replace(/\\"/g, '`');
                if (attr.inputType === AttributeType.NUMBER) {
                    value = +value;
                } else if (attr.inputType === AttributeType.CHECKBOX) {
                    value = value === 'true';
                }
                acc[attr.name] = value;
                return acc;
            }, attributes);

            return {
                width,
                height,
                attr: attributes,
                label: state.label.name.replace(/\\"/g, '`'),
                serverID: state.serverID,
                clientID: state.clientID,
                type: state.objectType,
                shape: state.shapeType,
                occluded: state.occluded,
            };
        });

        return {
            objects,
        };
    }

    filter(statesData, filters) {
        return this._convertObjects(statesData)
            .objects.map((state) => jsonLogic.apply(filters[0], state) && state.clientID)
            .filter(Boolean);
    }
}

module.exports = AnnotationsFilter;
