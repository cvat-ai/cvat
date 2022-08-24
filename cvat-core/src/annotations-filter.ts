// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import jsonLogic from 'json-logic-js';
import { AttributeType, ObjectType } from './enums';

function adjustName(name): string {
    return name.replace(/\./g, '\u2219');
}

export default class AnnotationsFilter {
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
                const points = state.points || state.elements.reduce((acc, val) => {
                    acc.push(val.points);
                    return acc;
                }, []).flat();
                points.forEach((coord, idx) => {
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
                let value = state.attributes[key];
                if (attr.inputType === AttributeType.NUMBER) {
                    value = +value;
                } else if (attr.inputType === AttributeType.CHECKBOX) {
                    value = value === 'true';
                }
                acc[adjustName(attr.name)] = value;
                return acc;
            }, attributes);

            return {
                width,
                height,
                attr: Object.fromEntries([[adjustName(state.label.name), attributes]]),
                label: state.label.name,
                serverID: state.serverID,
                objectID: state.clientID,
                type: state.objectType,
                shape: state.shapeType,
                occluded: state.occluded,
            };
        });

        return objects;
    }

    filter(statesData, filters) {
        if (!filters.length) return statesData;
        const converted = this._convertObjects(statesData);
        return converted
            .map((state) => state.objectID)
            .filter((_, index) => jsonLogic.apply(filters[0], converted[index]));
    }
}
