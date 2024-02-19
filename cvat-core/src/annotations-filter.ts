// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import jsonLogic from 'json-logic-js';
import { SerializedData } from './object-state';
import { AttributeType, ObjectType, ShapeType } from './enums';

function adjustName(name): string {
    return name.replace(/\./g, '\u2219');
}

interface ConvertedObjectData {
    width: number | null;
    height: number | null;
    attr: Record<string, Record<string, string>>;
    label: string;
    serverID: number;
    objectID: number;
    type: ObjectType;
    shape: ShapeType;
    occluded: boolean;
}

export default class AnnotationsFilter {
    _convertObjects(statesData: SerializedData[]): ConvertedObjectData[] {
        const objects = statesData.map((state) => {
            const labelAttributes = state.label.attributes.reduce((acc, attr) => {
                acc[attr.id] = attr;
                return acc;
            }, {});

            let [width, height]: (number | null)[] = [null, null];
            if (state.objectType !== ObjectType.TAG) {
                if (state.shapeType === ShapeType.MASK) {
                    const [xtl, ytl, xbr, ybr] = state.points.slice(-4);
                    [width, height] = [xbr - xtl + 1, ybr - ytl + 1];
                } else {
                    let xtl = Number.MAX_SAFE_INTEGER;
                    let xbr = Number.MIN_SAFE_INTEGER;
                    let ytl = Number.MAX_SAFE_INTEGER;
                    let ybr = Number.MIN_SAFE_INTEGER;

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
            }

            const attributes = Object.keys(state.attributes).reduce<Record<string, string>>((acc, key) => {
                const attr = labelAttributes[key];
                let value = state.attributes[key];
                if (attr.inputType === AttributeType.NUMBER) {
                    value = +value;
                } else if (attr.inputType === AttributeType.CHECKBOX) {
                    value = value === 'true';
                }
                acc[adjustName(attr.name)] = value;
                return acc;
            }, {});

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

    filter(statesData: SerializedData[], filters: object[]): number[] {
        if (!filters.length) return statesData.map((stateData): number => stateData.clientID);
        const converted = this._convertObjects(statesData);
        return converted
            .map((state) => state.objectID)
            .filter((_, index) => jsonLogic.apply(filters[0], converted[index]));
    }
}
