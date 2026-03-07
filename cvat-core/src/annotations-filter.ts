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

function getDimensions(
    points: number[],
    shapeType: ShapeType,
): {
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

function convertAttribute(
    id: number,
    value: string,
    attributesSpec: Record<number, Attribute>,
): [string, number | boolean | string] {
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

interface ConvertedAttributes {
    [key: string]: string | number | boolean | ConvertedAttributes;
}

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
    score: number | null;
    votes: number | null;
}

export default class AnnotationsFilter {
    private _convertSerializedObjectStates(statesData: SerializedData[]): ConvertedObjectData[] {
        const objects: ConvertedObjectData[] = [];

        statesData.forEach((state) => {
            const labelAttributes = state.label.attributes.reduce((acc, attr) => {
                acc[attr.id] = attr;
                return acc;
            }, {});

            let [width, height]: (number | null)[] = [null, null];
            if (state.objectType !== ObjectType.TAG) {
                const points =
                    state.shapeType === ShapeType.SKELETON
                        ? state.elements
                              .reduce((acc, val) => {
                                  acc.push(val.points);
                                  return acc;
                              }, [])
                              .flat()
                        : state.points;

                ({ width, height } = getDimensions(points, state.shapeType as ShapeType));
            }

            const attributes = Object.keys(state.attributes).reduce(
                (acc, key) => {
                    const [name, value] = convertAttribute(+key, state.attributes[key], labelAttributes);
                    acc[name] = value;
                    return acc;
                },
                {} as Record<string, string | number | boolean>,
            );

            const attrData: Record<string, ConvertedAttributes> = {
                [adjustName(state.label.name)]: attributes,
            };

            objects.push({
                width,
                height,
                attr: attrData,
                label: state.label.name,
                serverID: state.serverID,
                objectID: state.clientID,
                type: state.objectType,
                shape: state.shapeType,
                occluded: state.occluded,
                score: state.score ?? null,
                votes: state.votes ?? null,
            });

            // For skeleton shapes, create separate filterable entries for each element (sublabel)
            if (state.shapeType === ShapeType.SKELETON && state.elements) {
                state.elements.forEach((element) => {
                    const elementLabelAttributes = element.label.attributes.reduce((acc, attr) => {
                        acc[attr.id] = attr;
                        return acc;
                    }, {});

                    const elementAttributes = Object.keys(element.attributes || {}).reduce(
                        (acc, key) => {
                            const [name, value] = convertAttribute(
                                +key,
                                element.attributes[key],
                                elementLabelAttributes,
                            );
                            acc[name] = value;
                            return acc;
                        },
                        {} as Record<string, string | number | boolean>,
                    );

                    const sublabelName = `${state.label.name} / ${element.label.name}`;
                    const elementAttrData: Record<string, ConvertedAttributes> = {
                        [adjustName(sublabelName)]: elementAttributes,
                    };

                    let [elWidth, elHeight]: (number | null)[] = [null, null];
                    if (element.points) {
                        ({ width: elWidth, height: elHeight } = getDimensions(
                            element.points,
                            (element.shapeType ?? ShapeType.POINTS) as ShapeType,
                        ));
                    }

                    objects.push({
                        width: elWidth,
                        height: elHeight,
                        attr: elementAttrData,
                        label: sublabelName,
                        serverID: state.serverID,
                        objectID: state.clientID, // parent's clientID so the skeleton is shown/hidden
                        type: state.objectType,
                        shape: (element.shapeType ?? ShapeType.POINTS) as ShapeType,
                        occluded: element.occluded ?? false,
                        score: null,
                        votes: null,
                    });
                });
            }
        });

        return objects;
    }

    private _convertSerializedCollection(
        collection: Omit<SerializedCollection, 'version'>,
        labelsSpec: Label[],
    ): { shapes: ConvertedObjectData[]; tags: ConvertedObjectData[]; tracks: ConvertedObjectData[] } {
        const labelByID = labelsSpec.reduce<Record<number, Label>>(
            (acc, label) => ({
                [label.id]: label,
                ...acc,
            }),
            {},
        );

        const attributeById = labelsSpec
            .flatMap((label) => {
                const attrs = [...label.attributes];
                if (label.structure?.sublabels) {
                    label.structure.sublabels.forEach((sublabel) => {
                        attrs.push(...sublabel.attributes);
                    });
                }
                return attrs;
            })
            .reduce(
                (acc, attribute) => ({
                    ...acc,
                    [attribute.id]: attribute,
                }),
                {} as Record<number, Attribute>,
            );

        const convertAttributes = (attributes: SerializedCollection['shapes'][0]['attributes']): ConvertedAttributes =>
            attributes.reduce(
                (acc, { spec_id, value }) => {
                    const [name, adjustedValue] = convertAttribute(spec_id, value, attributeById);
                    acc[name] = adjustedValue;
                    return acc;
                },
                {} as Record<string, string | number | boolean>,
            );

        return {
            shapes: collection.shapes.flatMap((shape) => {
                const label = labelByID[shape.label_id];
                const points =
                    shape.type === ShapeType.SKELETON ? shape.elements.map((el) => el.points).flat() : shape.points;
                let [width, height]: (number | null)[] = [null, null];
                ({ width, height } = getDimensions(points, shape.type));

                const attrData: Record<string, ConvertedAttributes> = {
                    [adjustName(label.name)]: convertAttributes(shape.attributes),
                };

                const mainEntry: ConvertedObjectData = {
                    width,
                    height,
                    attr: attrData,
                    label: label.name,
                    serverID: shape.id ?? null,
                    type: ObjectType.SHAPE,
                    shape: shape.type,
                    occluded: shape.occluded,
                    objectID: shape.clientID ?? null,
                    score: shape.score ?? null,
                    votes: null,
                };

                const entries: ConvertedObjectData[] = [mainEntry];

                // For skeleton shapes, create separate entries for each element (sublabel)
                if (shape.type === ShapeType.SKELETON && shape.elements) {
                    shape.elements.forEach((element) => {
                        const elementLabel = labelByID[element.label_id];
                        if (elementLabel) {
                            const sublabelName = `${label.name} / ${elementLabel.name}`;
                            const elementAttrs = convertAttributes(element.attributes);
                            const elementAttrData: Record<string, ConvertedAttributes> = {
                                [adjustName(sublabelName)]: elementAttrs,
                            };

                            let [elWidth, elHeight]: (number | null)[] = [null, null];
                            ({ width: elWidth, height: elHeight } = getDimensions(
                                element.points,
                                element.type ?? ShapeType.POINTS,
                            ));

                            entries.push({
                                width: elWidth,
                                height: elHeight,
                                attr: elementAttrData,
                                label: sublabelName,
                                serverID: shape.id ?? null,
                                type: ObjectType.SHAPE,
                                shape: element.type ?? ShapeType.POINTS,
                                occluded: element.occluded ?? false,
                                objectID: shape.clientID ?? null,
                                score: null,
                                votes: null,
                            });
                        }
                    });
                }

                return entries;
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
                    score: null,
                    votes: null,
                };
            }),
            tracks: collection.tracks.flatMap((track) => {
                const label = labelByID[track.label_id];

                const attrData: Record<string, ConvertedAttributes> = {
                    [adjustName(label.name)]: convertAttributes(track.attributes),
                };

                const mainEntry: ConvertedObjectData = {
                    width: null,
                    height: null,
                    attr: attrData,
                    label: labelByID[track.label_id]?.name ?? null,
                    serverID: track.id,
                    type: ObjectType.TRACK,
                    shape: track.shapes[0]?.type ?? null,
                    occluded: null,
                    objectID: track.clientID ?? null,
                    score: null,
                    votes: null,
                };

                const entries: ConvertedObjectData[] = [mainEntry];

                // For skeleton tracks, create separate entries for each element (sublabel)
                if (track.shapes[0]?.type === ShapeType.SKELETON && track.elements) {
                    track.elements.forEach((element) => {
                        const elementLabel = labelByID[element.label_id];
                        if (elementLabel) {
                            const sublabelName = `${label.name} / ${elementLabel.name}`;
                            const elementAttrData: Record<string, ConvertedAttributes> = {
                                [adjustName(sublabelName)]: convertAttributes(element.attributes || []),
                            };

                            entries.push({
                                width: null,
                                height: null,
                                attr: elementAttrData,
                                label: sublabelName,
                                serverID: track.id,
                                type: ObjectType.TRACK,
                                shape: element.shapes?.[0]?.type ?? ShapeType.POINTS,
                                occluded: null,
                                objectID: track.clientID ?? null,
                                score: null,
                                votes: null,
                            });
                        }
                    });
                }

                return entries;
            }),
        };
    }

    public filterSerializedObjectStates(statesData: SerializedData[], filters: object[]): number[] {
        if (!filters.length) {
            return statesData.map((stateData): number => stateData.clientID);
        }

        const converted = this._convertSerializedObjectStates(statesData);
        const matchingIDs = new Set<number>();
        converted.forEach((entry) => {
            if (jsonLogic.apply(filters[0], entry)) {
                matchingIDs.add(entry.objectID);
            }
        });
        return [...matchingIDs];
    }

    public filterSerializedCollection(
        collection: Omit<SerializedCollection, 'version'>,
        labelsSpec: Label[],
        filters: object[],
    ): { shapes: number[]; tags: number[]; tracks: number[] } {
        if (!filters.length) {
            return {
                shapes: collection.shapes.map((shape) => shape.clientID),
                tags: collection.tags.map((tag) => tag.clientID),
                tracks: collection.tracks.map((track) => track.clientID),
            };
        }

        const converted = this._convertSerializedCollection(collection, labelsSpec);

        const filterCategory = (entries: ConvertedObjectData[]): number[] => {
            const matchingIDs = new Set<number>();
            entries.forEach((entry) => {
                if (jsonLogic.apply(filters[0], entry)) {
                    matchingIDs.add(entry.objectID);
                }
            });
            return [...matchingIDs];
        };

        return {
            shapes: filterCategory(converted.shapes),
            tags: filterCategory(converted.tags),
            tracks: filterCategory(converted.tracks),
        };
    }
}
