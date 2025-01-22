// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import jsonLogic from 'json-logic-js';
import { SerializedData } from './object-state';
import { AttributeType, ObjectType, ShapeType } from './enums';
import { SerializedCollection } from './server-response-types';
import { Attribute, Label } from './labels';

function adjustName(name): string {
    return name.replace(/\./g, '\u2219');
}

function getDimensions(points: number[], shapeType: ShapeType): {
    width: number | null;
    height: number | null;
} {
    let [width, height]: (number | null)[] = [null, null];
    if (shapeType === ShapeType.MASK) {
        const [xtl, ytl, xbr, ybr] = points.slice(-4);
        [width, height] = [xbr - xtl + 1, ybr - ytl + 1];
    } else if (shapeType === ShapeType.ELLIPSE) {
        const [cx, cy, rightX, topY] = points;
        width = Math.abs(rightX - cx) * 2;
        height = Math.abs(cy - topY) * 2;
    } else {
        let xtl = Number.MAX_SAFE_INTEGER;
        let xbr = Number.MIN_SAFE_INTEGER;
        let ytl = Number.MAX_SAFE_INTEGER;
        let ybr = Number.MIN_SAFE_INTEGER;

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

    return {
        width,
        height,
    };
}

function convertAttribute(id: number, value: string, attributesSpec: Record<number, Attribute>): [
    string,
    number | boolean | string,
] {
    const spec = attributesSpec[id];
    const name = adjustName(spec.name);
    if (spec.inputType === AttributeType.NUMBER) {
        return [name, +value];
    }

    if (spec.inputType === AttributeType.CHECKBOX) {
        return [name, value === 'true'];
    }

    return [name, value];
}

type ConvertedAttributes = Record<string, string | number | boolean>;

interface ConvertedObjectData {
    width: number | null;
    height: number | null;
    attr: Record<string, ConvertedAttributes>;
    label: string;
    serverID: number;
    objectID: number;
    type: ObjectType;
    shape: ShapeType;
    occluded: boolean;
}

export default class AnnotationsFilter {
    private _convertSerializedObjectStates(statesData: SerializedData[]): ConvertedObjectData[] {
        const objects = statesData.map((state) => {
            const labelAttributes = state.label.attributes.reduce((acc, attr) => {
                acc[attr.id] = attr;
                return acc;
            }, {});

            let [width, height]: (number | null)[] = [null, null];
            if (state.objectType !== ObjectType.TAG) {
                const points = state.shapeType === ShapeType.SKELETON ? state.elements.reduce((acc, val) => {
                    acc.push(val.points);
                    return acc;
                }, []).flat() : state.points;

                ({ width, height } = getDimensions(points, state.shapeType as ShapeType));
            }

            const attributes = Object.keys(state.attributes).reduce((acc, key) => {
                const [name, value] = convertAttribute(+key, state.attributes[key], labelAttributes);
                acc[name] = value;
                return acc;
            }, {} as Record<string, string | number | boolean>);

            return {
                width,
                height,
                attr: {
                    [adjustName(state.label.name)]: attributes,
                },
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

    private _convertSerializedCollection(
        collection: Omit<SerializedCollection, 'version'>,
        labelsSpec: Label[],
    ): { shapes: ConvertedObjectData[]; tags: ConvertedObjectData[]; tracks: ConvertedObjectData[]; } {
        const labelByID = labelsSpec.reduce<Record<number, Label>>((acc, label) => ({
            [label.id]: label,
            ...acc,
        }), {});

        const attributeById = labelsSpec.map((label) => label.attributes).flat().reduce((acc, attribute) => ({
            ...acc,
            [attribute.id]: attribute,
        }), {} as Record<number, Attribute>);

        const convertAttributes = (
            attributes: SerializedCollection['shapes'][0]['attributes'],
        ): ConvertedAttributes => attributes.reduce((acc, { spec_id, value }) => {
            const [name, adjustedValue] = convertAttribute(spec_id, value, attributeById);
            acc[name] = adjustedValue;
            return acc;
        }, {} as Record<string, string | number | boolean>);

        return {
            shapes: collection.shapes.map((shape) => {
                const label = labelByID[shape.label_id];
                const points = shape.type === ShapeType.SKELETON ?
                    shape.elements.map((el) => el.points).flat() : shape.points;
                let [width, height]: (number | null)[] = [null, null];
                ({ width, height } = getDimensions(points, shape.type));

                return {
                    width,
                    height,
                    attr: {
                        [adjustName(label.name)]: convertAttributes(shape.attributes),
                    },
                    label: label.name,
                    serverID: shape.id ?? null,
                    type: ObjectType.SHAPE,
                    shape: shape.type,
                    occluded: shape.occluded,
                    objectID: shape.clientID ?? null,
                };
            }),
            tags: collection.tags.map((tag) => {
                const label = labelByID[tag.label_id];

                return {
                    width: null,
                    height: null,
                    attr: {
                        [adjustName(label.name)]: convertAttributes(tag.attributes),
                    },
                    label: labelByID[tag.label_id]?.name ?? null,
                    serverID: tag.id ?? null,
                    type: ObjectType.SHAPE,
                    shape: null,
                    occluded: false,
                    objectID: tag.clientID ?? null,
                };
            }),
            tracks: collection.tracks.map((track) => {
                const label = labelByID[track.label_id];

                return {
                    width: null,
                    height: null,
                    attr: {
                        [adjustName(label.name)]: convertAttributes(track.attributes),
                    },
                    label: labelByID[track.label_id]?.name ?? null,
                    serverID: track.id,
                    type: ObjectType.TRACK,
                    shape: track.shapes[0]?.type ?? null,
                    occluded: null,
                    objectID: track.clientID ?? null,
                };
            }),
        };
    }

    public filterSerializedObjectStates(statesData: SerializedData[], filters: object[]): number[] {
        if (!filters.length) {
            return statesData.map((stateData): number => stateData.clientID);
        }

        const converted = this._convertSerializedObjectStates(statesData);
        return converted
            .map((state) => state.objectID)
            .filter((_, index) => jsonLogic.apply(filters[0], converted[index]));
    }

    public filterSerializedCollection(
        collection: Omit<SerializedCollection, 'version'>,
        labelsSpec: Label[],
        filters: object[],
    ): { shapes: number[]; tags: number[]; tracks: number[]; } {
        if (!filters.length) {
            return {
                shapes: collection.shapes.map((shape) => shape.clientID),
                tags: collection.tags.map((tag) => tag.clientID),
                tracks: collection.tracks.map((track) => track.clientID),
            };
        }

        const converted = this._convertSerializedCollection(collection, labelsSpec);
        return {
            shapes: converted.shapes.map((shape) => shape.objectID)
                .filter((_, index) => jsonLogic.apply(filters[0], converted.shapes[index])),
            tags: converted.tags.map((shape) => shape.objectID)
                .filter((_, index) => jsonLogic.apply(filters[0], converted.tags[index])),
            tracks: converted.tracks.map((shape) => shape.objectID)
                .filter((_, index) => jsonLogic.apply(filters[0], converted.tracks[index])),
        };
    }
}
