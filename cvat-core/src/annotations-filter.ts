// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import jsonLogic from 'json-logic-js';
import { SerializedData } from './object-state';
import { AttributeType, ObjectType, ShapeType } from './enums';
import { SerializedCollection } from './server-response-types';
import { Attribute, Label } from './labels';
import type { AudioIntervalState } from './annotations-objects/audio-interval-state';

function adjustName(name): string {
    return name.replace(/\./g, '\u2219');
}

type Dimensions = {
    width: number | null;
    height: number | null;
};

type ConvertedAttributeValue = string | number | boolean;

interface ConvertedAttributes {
    [key: string]: ConvertedAttributeValue | ConvertedAttributes;
}

function getDimensions(
    points: number[],
    shapeType: ShapeType,
): Dimensions {
    let [width, height]: (number | null)[] = [null, null];
    if (!points.length) {
        return { width, height };
    }

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

function convertAttributes(
    attributes: SerializedData['attributes'] | SerializedCollection['shapes'][0]['attributes'],
    attributesSpec: Record<number, Attribute>,
): ConvertedAttributes {
    const entries: [number, string][] = Array.isArray(attributes) ?
        attributes.map(({ spec_id, value }) => [spec_id, value]) :
        Object.keys(attributes).map((key) => [+key, attributes[key]]);

    return entries.reduce((acc, [id, value]) => {
        const spec = attributesSpec[id];
        const name = adjustName(spec.name);
        if (spec.inputType === AttributeType.NUMBER) {
            acc[name] = +value;
        } else if (spec.inputType === AttributeType.CHECKBOX) {
            acc[name] = value === 'true';
        } else {
            acc[name] = value;
        }

        return acc;
    }, {} as Record<string, ConvertedAttributeValue>);
}

function buildAttributeMap(attributes: Attribute[]): Record<number, Attribute> {
    return attributes.reduce((acc, attribute) => {
        if (typeof attribute.id === 'number') {
            acc[attribute.id] = attribute;
        }
        return acc;
    }, {} as Record<number, Attribute>);
}

function buildLabelMaps(labels: Label[]): {
    labelByID: Record<number, Label>;
    attributeByID: Record<number, Attribute>;
} {
    const labelByID: Record<number, Label> = {};
    const attributeByID: Record<number, Attribute> = {};

    const registerLabel = (label: Label): void => {
        if (typeof label.id === 'number') {
            labelByID[label.id] = label;
        }

        label.attributes.forEach((attribute) => {
            if (typeof attribute.id === 'number') {
                attributeByID[attribute.id] = attribute;
            }
        });
    };

    labels.forEach((label) => {
        registerLabel(label);
        label.structure?.sublabels.forEach(registerLabel);
    });

    return { labelByID, attributeByID };
}

interface BaseConvertedData {
    width: number | null;
    height: number | null;
    rotation: number | null;
    attr: Record<string, ConvertedAttributes>;
    label: string;
    type: ObjectType | null;
    shape: ShapeType | null;
    occluded: boolean | null;
    score: number | null;
    votes: number | null;
    zOrder: number | null;
}

interface ConvertedElementData extends BaseConvertedData {
    objectID: number | null;
}

interface ConvertedObjectData extends BaseConvertedData {
    serverID: number | null;
    objectID: number | null;
    elements: ConvertedElementData[];
}

interface ConvertedAudioIntervalData {
    clientID: number | null;
    attr: Record<string, ConvertedAttributes>;
    duration: number;
    end: number;
    label: string;
    serverID: number | null;
    source: string | null;
    start: number;
}

function getRotation(shapeType: ShapeType, rotation?: number | null): number | null {
    return shapeType === ShapeType.RECTANGLE || shapeType === ShapeType.ELLIPSE ? rotation ?? null : null;
}

function isEmptyFilter(filter: object | undefined): boolean {
    return !filter || !Object.keys(filter).length;
}

function getMatchingIDs(
    entries: ConvertedObjectData[],
    objectFilter?: object,
    keypointFilter?: object,
): number[] {
    const matchingIDs = new Set<number>();
    entries.forEach((entry) => {
        const objectMatches = isEmptyFilter(objectFilter) || jsonLogic.apply(objectFilter, entry);
        const keypointsMatch = isEmptyFilter(keypointFilter) ||
            entry.elements.some((element) => jsonLogic.apply(keypointFilter, element));
        if (typeof entry.objectID === 'number' && objectMatches && keypointsMatch) {
            matchingIDs.add(entry.objectID);
        }
    });
    return [...matchingIDs];
}

export default class AnnotationsFilter {
    private lastPosition: number | null;

    constructor(lastPosition: number | null) {
        this.lastPosition = lastPosition;
    }

    private _convertAudioIntervalStates(
        intervalsData: AudioIntervalState[],
    ): ConvertedAudioIntervalData[] {
        if (this.lastPosition === null) {
            throw new Error('Last position is required to filter audio intervals');
        }

        return intervalsData.map((interval) => {
            const labelAttributes = buildAttributeMap(interval.label.attributes);
            const attributes = convertAttributes(interval.attributes, labelAttributes);
            const end = interval.stop ?? this.lastPosition;

            return {
                clientID: interval.clientID,
                attr: {
                    [adjustName(interval.label.name)]: attributes,
                },
                duration: end - interval.start,
                end,
                label: interval.label.name,
                serverID: interval.serverID ?? null,
                source: interval.source ?? null,
                start: interval.start,
            };
        });
    }

    private _convertSerializedObjectStates(statesData: SerializedData[]): ConvertedObjectData[] {
        return statesData.map((state) => {
            const labelAttributes = buildAttributeMap(state.label.attributes);

            let dimensions: Dimensions = { width: null, height: null };
            let rotation: number | null = null;
            if (state.objectType !== ObjectType.TAG) {
                const points =
                    state.shapeType === ShapeType.SKELETON ?
                        (state.elements ?? [])
                            .map((element) => element.points ?? [])
                            .flat() :
                        state.points;

                dimensions = getDimensions(points ?? [], state.shapeType as ShapeType);
                rotation = getRotation(state.shapeType, state.rotation);
            }

            const attributes = convertAttributes(state.attributes || {}, labelAttributes);
            const elements: ConvertedElementData[] = state.shapeType === ShapeType.SKELETON && state.elements ?
                state.elements.map((element) => {
                    const elementLabelAttributes = buildAttributeMap(element.label.attributes);
                    const sublabelName = `${state.label.name} / ${element.label.name}`;
                    const elementAttributes = convertAttributes(element.attributes || {}, elementLabelAttributes);

                    return {
                        width: null,
                        height: null,
                        rotation: null,
                        attr: {
                            [adjustName(sublabelName)]: elementAttributes,
                        },
                        label: sublabelName,
                        objectID: element.clientID ?? null,
                        type: null,
                        shape: null,
                        occluded: element.occluded ?? false,
                        score: null,
                        votes: null,
                        zOrder: null,
                    };
                }) :
                [];

            return {
                width: dimensions.width,
                height: dimensions.height,
                rotation,
                attr: {
                    [adjustName(state.label.name)]: attributes,
                },
                label: state.label.name,
                serverID: state.serverID ?? null,
                objectID: state.clientID ?? null,
                type: state.objectType,
                shape: state.shapeType ?? null,
                occluded: state.occluded ?? null,
                score: state.score ?? null,
                votes: state.votes ?? null,
                zOrder: state.zOrder ?? null,
                elements,
            };
        });
    }

    private _convertSerializedCollection(
        collection: Pick<SerializedCollection, 'shapes' | 'tags' | 'tracks'>,
        labelsSpec: Label[],
    ): {
        shapes: ConvertedObjectData[];
        tags: ConvertedObjectData[];
        tracks: ConvertedObjectData[];
    } {
        const { labelByID, attributeByID } = buildLabelMaps(labelsSpec);

        return {
            shapes: collection.shapes.map((shape) => {
                const label = labelByID[shape.label_id];
                const points =
                    shape.type === ShapeType.SKELETON ?
                        shape.elements.map((el) => el.points ?? []).flat() :
                        shape.points;
                const dimensions = getDimensions(points ?? [], shape.type);
                const attributes = convertAttributes(shape.attributes, attributeByID);

                const elements: ConvertedElementData[] = shape.type === ShapeType.SKELETON && shape.elements ?
                    shape.elements.flatMap((element) => {
                        const elementLabel = labelByID[element.label_id];
                        if (!elementLabel) {
                            return [];
                        }

                        const sublabelName = `${label.name} / ${elementLabel.name}`;
                        const elementAttributes = convertAttributes(element.attributes, attributeByID);

                        return [{
                            width: null,
                            height: null,
                            rotation: null,
                            attr: {
                                [adjustName(sublabelName)]: elementAttributes,
                            },
                            label: sublabelName,
                            objectID: null,
                            type: null,
                            shape: null,
                            occluded: element.occluded ?? false,
                            score: null,
                            votes: null,
                            zOrder: null,
                        }];
                    }) :
                    [];

                return {
                    width: dimensions.width,
                    height: dimensions.height,
                    rotation: getRotation(shape.type, shape.rotation),
                    attr: {
                        [adjustName(label.name)]: attributes,
                    },
                    label: label.name,
                    serverID: shape.id ?? null,
                    objectID: shape.clientID ?? null,
                    type: ObjectType.SHAPE,
                    shape: shape.type,
                    occluded: shape.occluded,
                    score: shape.score ?? null,
                    votes: null,
                    zOrder: shape.z_order,
                    elements,
                };
            }),
            tags: collection.tags.map((tag) => {
                const label = labelByID[tag.label_id];
                const attributes = convertAttributes(tag.attributes, attributeByID);

                return {
                    width: null,
                    height: null,
                    rotation: null,
                    attr: {
                        [adjustName(label.name)]: attributes,
                    },
                    label: label.name,
                    serverID: tag.id ?? null,
                    objectID: tag.clientID ?? null,
                    type: ObjectType.TAG,
                    shape: null,
                    occluded: false,
                    score: null,
                    votes: null,
                    zOrder: 0,
                    elements: [],
                };
            }),
            tracks: collection.tracks.map((track) => {
                const label = labelByID[track.label_id];
                const attributes = convertAttributes(track.attributes, attributeByID);

                let elements: ConvertedElementData[] = [];
                if (track.shapes[0]?.type === ShapeType.SKELETON && track.elements) {
                    elements = track.elements.flatMap((element) => {
                        const elementLabel = labelByID[element.label_id];
                        if (!elementLabel) {
                            return [];
                        }

                        const sublabelName = `${label.name} / ${elementLabel.name}`;
                        const elementAttributes = convertAttributes(element.attributes, attributeByID);

                        return [{
                            width: null,
                            height: null,
                            rotation: null,
                            attr: {
                                [adjustName(sublabelName)]: elementAttributes,
                            },
                            label: sublabelName,
                            objectID: null,
                            type: null,
                            shape: null,
                            occluded: null,
                            score: null,
                            votes: null,
                            zOrder: null,
                        }];
                    });
                }

                return {
                    width: null,
                    height: null,
                    rotation: null,
                    attr: {
                        [adjustName(label.name)]: attributes,
                    },
                    label: label.name,
                    serverID: track.id ?? null,
                    objectID: track.clientID ?? null,
                    type: ObjectType.TRACK,
                    shape: track.shapes[0]?.type ?? null,
                    occluded: null,
                    score: null,
                    votes: null,
                    zOrder: track.shapes[0]?.z_order ?? null,
                    elements,
                };
            }),
        };
    }

    public filterSerializedObjectStates(statesData: SerializedData[], filters: object[]): number[] {
        if (isEmptyFilter(filters[0]) && isEmptyFilter(filters[1])) {
            return statesData.map((stateData): number => stateData.clientID);
        }

        const converted = this._convertSerializedObjectStates(statesData);
        return getMatchingIDs(converted, filters[0], filters[1]);
    }

    public filterAudioIntervalStates(audioIntervalStates: AudioIntervalState[], filters: object[]): number[] {
        if (isEmptyFilter(filters[0])) {
            return audioIntervalStates.map((intervalData): number => intervalData.clientID!);
        }

        const converted = this._convertAudioIntervalStates(audioIntervalStates);
        return converted.filter((interval) => jsonLogic.apply(filters[0], interval))
            .map((interval) => interval.clientID);
    }

    public filterSerializedCollection(
        collection: Pick<SerializedCollection, 'shapes' | 'tags' | 'tracks'>,
        labelsSpec: Label[],
        filters: object[],
    ): { shapes: number[]; tags: number[]; tracks: number[]; } {
        if (isEmptyFilter(filters[0]) && isEmptyFilter(filters[1])) {
            return {
                shapes: collection.shapes.map((shape) => shape.clientID),
                tags: collection.tags.map((tag) => tag.clientID),
                tracks: collection.tracks.map((track) => track.clientID),
            };
        }

        const converted = this._convertSerializedCollection(collection, labelsSpec);

        return {
            shapes: getMatchingIDs(converted.shapes, filters[0], filters[1]),
            tags: getMatchingIDs(converted.tags, filters[0], filters[1]),
            tracks: getMatchingIDs(converted.tracks, filters[0], filters[1]),
        };
    }

    public filterSerializedSkeletonElements(statesData: SerializedData[], filters: object[]): Record<number, number[]> {
        if (isEmptyFilter(filters[1])) {
            return {};
        }

        const filter = filters[1];
        const converted = this._convertSerializedObjectStates(statesData);
        return converted.reduce((acc, entry) => {
            if (entry.shape === ShapeType.SKELETON && typeof entry.objectID === 'number') {
                acc[entry.objectID] = entry.elements
                    .filter((element) => typeof element.objectID === 'number' && jsonLogic.apply(filter, element))
                    .map((element) => element.objectID as number);
            }

            return acc;
        }, {} as Record<number, number[]>);
    }
}
