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

function getLabelFilterValue(labelID: number | string, sublabelID?: number | string): string {
    return typeof sublabelID === 'undefined' ? `label:${labelID}` : `sublabel:${labelID}:${sublabelID}`;
}

type Dimensions = {
    width: number | null;
    height: number | null;
};

type ConvertedAttributeValue = string | number | boolean;

interface ConvertedAttributes {
    [key: string]: ConvertedAttributeValue | ConvertedAttributes;
}

interface FilterReferences {
    labelValues: Set<string>;
    vars: Set<string>;
}

function getFilterReferences(filter: object): FilterReferences {
    const references: FilterReferences = {
        labelValues: new Set(),
        vars: new Set(),
    };

    const getVar = (value: unknown): string | null => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const varName = (value as { var?: unknown }).var;
            return typeof varName === 'string' ? varName : null;
        }

        return null;
    };

    const collectStrings = (value: unknown): void => {
        if (Array.isArray(value)) {
            value.forEach(collectStrings);
        } else if (typeof value === 'string') {
            references.labelValues.add(value);
        }
    };

    const collect = (value: unknown): void => {
        if (Array.isArray(value)) {
            value.forEach(collect);
        } else if (value && typeof value === 'object') {
            Object.entries(value).forEach(([key, entry]) => {
                if (key === 'var' && typeof entry === 'string') {
                    references.vars.add(entry);
                    return;
                }

                if (Array.isArray(entry) && entry.some((item) => getVar(item) === 'label')) {
                    entry.forEach((item) => {
                        if (getVar(item) !== 'label') {
                            collectStrings(item);
                        }
                    });
                }

                collect(entry);
            });
        }
    };

    collect(filter);
    return references;
}

function isLabelScopeReferenced(labelName: string, labelValue: string, references: FilterReferences): boolean {
    if (references.labelValues.has(labelValue) || references.labelValues.has(labelName)) {
        return true;
    }

    const adjustedLabelName = adjustName(labelName);
    const adjustedLabelValue = adjustName(labelValue);
    return [...references.vars].some((varName) => (
        varName === `attr.${adjustedLabelValue}` ||
        varName.startsWith(`attr.${adjustedLabelValue}.`) ||
        varName === `attr.${adjustedLabelName}` ||
        varName.startsWith(`attr.${adjustedLabelName}.`)
    ));
}

function isSublabelReferenced(sublabelName: string, sublabelValue: string, references: FilterReferences): boolean {
    return isLabelScopeReferenced(sublabelName, sublabelValue, references);
}

function hasReferencedSublabel(
    sublabels: { name: string; value: string }[],
    references: FilterReferences,
): boolean {
    return sublabels.some(({ name, value }) => (
        isSublabelReferenced(name, value, references)
    ));
}

function usesStableLabelValues(references: FilterReferences): boolean {
    return [...references.labelValues].some((value) => (
        /^(label|sublabel):/.test(value)
    ));
}

function getDimensions(
    points: number[],
    shapeType: ShapeType,
): Dimensions {
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

function convertAttributes(
    attributes: Record<string, string> | SerializedCollection['shapes'][0]['attributes'],
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

function getTrackAttributes(
    track: Pick<SerializedCollection['tracks'][0], 'attributes' | 'shapes'>,
): SerializedCollection['tracks'][0]['attributes'] {
    return [
        ...track.attributes,
        ...track.shapes.flatMap((shape) => shape.attributes),
    ];
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

interface ConvertedObjectData {
    width: number | null;
    height: number | null;
    rotation: number | null;
    attr: Record<string, ConvertedAttributes>;
    label: string;
    serverID: number | null;
    objectID: number | null;
    type: ObjectType;
    shape: ShapeType | null;
    occluded: boolean | null;
    score: number | null;
    votes: number | null;
}

function getRotation(shapeType: ShapeType, rotation?: number | null): number | null {
    return shapeType === ShapeType.RECTANGLE || shapeType === ShapeType.ELLIPSE ? rotation ?? null : null;
}

function getMatchingIDs(entries: ConvertedObjectData[], filter: object): number[] {
    const matchingIDs = new Set<number>();
    entries.forEach((entry) => {
        if (typeof entry.objectID === 'number' && jsonLogic.apply(filter, entry)) {
            matchingIDs.add(entry.objectID);
        }
    });
    return [...matchingIDs];
}

export default class AnnotationsFilter {
    private _convertSerializedObjectStates(
        statesData: SerializedData[],
        filterReferences: FilterReferences,
    ): ConvertedObjectData[] {
        const objects: ConvertedObjectData[] = [];
        const useStableLabelValues = usesStableLabelValues(filterReferences);

        statesData.forEach((state) => {
            const labelAttributes = buildAttributeMap(state.label.attributes);
            const labelValue = getLabelFilterValue(state.label.id);
            const hasSublabelScope = state.shapeType === ShapeType.SKELETON && state.elements ?
                hasReferencedSublabel(
                    state.elements.map((element) => ({
                        name: `${state.label.name} / ${element.label.name}`,
                        value: getLabelFilterValue(state.label.id, element.label.id),
                    })),
                    filterReferences,
                ) :
                false;
            const shouldAddParentEntry = !hasSublabelScope ||
                isLabelScopeReferenced(state.label.name, labelValue, filterReferences);

            let dimensions: Dimensions = { width: null, height: null };
            let rotation: number | null = null;
            if (state.objectType !== ObjectType.TAG) {
                const points =
                    state.shapeType === ShapeType.SKELETON ?
                        state.elements
                            .reduce((acc, val) => {
                                acc.push(val.points);
                                return acc;
                            }, [])
                            .flat() :
                        state.points;

                dimensions = getDimensions(points, state.shapeType as ShapeType);
                rotation = getRotation(state.shapeType, state.rotation);
            }

            if (shouldAddParentEntry) {
                const attributes = convertAttributes(state.attributes, labelAttributes);
                objects.push({
                    width: dimensions.width,
                    height: dimensions.height,
                    rotation,
                    attr: {
                        [adjustName(labelValue)]: attributes,
                        [adjustName(state.label.name)]: attributes,
                    },
                    label: useStableLabelValues ? labelValue : state.label.name,
                    serverID: state.serverID,
                    objectID: state.clientID,
                    type: state.objectType,
                    shape: state.shapeType,
                    occluded: state.occluded,
                    score: state.score ?? null,
                    votes: state.votes ?? null,
                });
            }

            // For skeleton shapes, create separate filterable entries for each element (sublabel)
            if (state.shapeType === ShapeType.SKELETON && state.elements) {
                state.elements.forEach((element) => {
                    const elementLabelAttributes = buildAttributeMap(element.label.attributes);
                    const elementShape = (element.shapeType ?? ShapeType.POINTS) as ShapeType;
                    const elementDimensions = element.points ?
                        getDimensions(element.points, elementShape) :
                        { width: null, height: null };
                    const sublabelName = `${state.label.name} / ${element.label.name}`;
                    const sublabelValue = getLabelFilterValue(state.label.id, element.label.id);

                    if (isSublabelReferenced(sublabelName, sublabelValue, filterReferences)) {
                        const attributes = convertAttributes(element.attributes || {}, elementLabelAttributes);
                        objects.push({
                            width: elementDimensions.width,
                            height: elementDimensions.height,
                            rotation: element.rotation ?? null,
                            attr: {
                                [adjustName(sublabelValue)]: attributes,
                                [adjustName(sublabelName)]: attributes,
                            },
                            label: useStableLabelValues ? sublabelValue : sublabelName,
                            serverID: state.serverID,
                            objectID: state.clientID,
                            type: state.objectType,
                            shape: elementShape,
                            occluded: element.occluded ?? false,
                            score: null,
                            votes: null,
                        });
                    }
                });
            }
        });

        return objects;
    }

    private _convertSerializedCollection(
        collection: Omit<SerializedCollection, 'version'>,
        labelsSpec: Label[],
        filterReferences: FilterReferences,
    ): { shapes: ConvertedObjectData[]; tags: ConvertedObjectData[]; tracks: ConvertedObjectData[] } {
        const { labelByID, attributeByID } = buildLabelMaps(labelsSpec);
        const useStableLabelValues = usesStableLabelValues(filterReferences);

        return {
            shapes: collection.shapes.flatMap((shape) => {
                const label = labelByID[shape.label_id];
                const labelValue = getLabelFilterValue(shape.label_id);
                const points =
                    shape.type === ShapeType.SKELETON ? shape.elements.map((el) => el.points).flat() : shape.points;
                const dimensions = getDimensions(points, shape.type);
                const elementLabels = shape.type === ShapeType.SKELETON && shape.elements ?
                    shape.elements.flatMap((element) => {
                        const elementLabelName = labelByID[element.label_id]?.name;
                        return elementLabelName ? [{
                            name: `${label.name} / ${elementLabelName}`,
                            value: getLabelFilterValue(shape.label_id, element.label_id),
                        }] : [];
                    }) :
                    [];
                const hasSublabelScope = hasReferencedSublabel(elementLabels, filterReferences);
                const shouldAddParentEntry = !hasSublabelScope ||
                    isLabelScopeReferenced(label.name, labelValue, filterReferences);
                const attributes = convertAttributes(shape.attributes, attributeByID);

                const mainEntry: ConvertedObjectData = {
                    width: dimensions.width,
                    height: dimensions.height,
                    rotation: getRotation(shape.type, shape.rotation),
                    attr: {
                        [adjustName(labelValue)]: attributes,
                        [adjustName(label.name)]: attributes,
                    },
                    label: useStableLabelValues ? labelValue : label.name,
                    serverID: shape.id ?? null,
                    objectID: shape.clientID ?? null,
                    type: ObjectType.SHAPE,
                    shape: shape.type,
                    occluded: shape.occluded,
                    score: shape.score ?? null,
                    votes: null,
                };

                const entries: ConvertedObjectData[] = shouldAddParentEntry ? [mainEntry] : [];

                // For skeleton shapes, create separate entries for each element (sublabel)
                if (shape.type === ShapeType.SKELETON && shape.elements) {
                    shape.elements.forEach((element) => {
                        const elementLabel = labelByID[element.label_id];
                        if (elementLabel) {
                            const elementShape = element.type ?? ShapeType.POINTS;
                            const elementDimensions = getDimensions(element.points, elementShape);
                            const sublabelName = `${label.name} / ${elementLabel.name}`;
                            const sublabelValue = getLabelFilterValue(shape.label_id, element.label_id);

                            if (isSublabelReferenced(sublabelName, sublabelValue, filterReferences)) {
                                const elementAttributes = convertAttributes(element.attributes, attributeByID);
                                entries.push({
                                    width: elementDimensions.width,
                                    height: elementDimensions.height,
                                    rotation: element.rotation ?? null,
                                    attr: {
                                        [adjustName(sublabelValue)]: elementAttributes,
                                        [adjustName(sublabelName)]: elementAttributes,
                                    },
                                    label: useStableLabelValues ? sublabelValue : sublabelName,
                                    serverID: shape.id ?? null,
                                    objectID: shape.clientID ?? null,
                                    type: ObjectType.SHAPE,
                                    shape: elementShape,
                                    occluded: element.occluded ?? false,
                                    score: null,
                                    votes: null,
                                });
                            }
                        }
                    });
                }

                return entries;
            }),
            tags: collection.tags.map((tag) => {
                const label = labelByID[tag.label_id];
                const labelValue = getLabelFilterValue(tag.label_id);
                const attributes = convertAttributes(tag.attributes, attributeByID);

                return {
                    width: null,
                    height: null,
                    rotation: null,
                    attr: {
                        [adjustName(labelValue)]: attributes,
                        [adjustName(label.name)]: attributes,
                    },
                    label: useStableLabelValues ? labelValue : label.name,
                    serverID: tag.id ?? null,
                    objectID: tag.clientID ?? null,
                    type: ObjectType.SHAPE,
                    shape: null,
                    occluded: false,
                    score: null,
                    votes: null,
                };
            }),
            tracks: collection.tracks.flatMap((track) => {
                const label = labelByID[track.label_id];
                const labelValue = getLabelFilterValue(track.label_id);
                const elementLabels = track.shapes[0]?.type === ShapeType.SKELETON && track.elements ?
                    track.elements.flatMap((element) => {
                        const elementLabelName = labelByID[element.label_id]?.name;
                        return elementLabelName ? [{
                            name: `${label.name} / ${elementLabelName}`,
                            value: getLabelFilterValue(track.label_id, element.label_id),
                        }] : [];
                    }) :
                    [];
                const hasSublabelScope = hasReferencedSublabel(elementLabels, filterReferences);
                const shouldAddParentEntry = !hasSublabelScope ||
                    isLabelScopeReferenced(label.name, labelValue, filterReferences);
                const attributes = convertAttributes(getTrackAttributes(track), attributeByID);

                const mainEntry: ConvertedObjectData = {
                    width: null,
                    height: null,
                    rotation: null,
                    attr: {
                        [adjustName(labelValue)]: attributes,
                        [adjustName(label.name)]: attributes,
                    },
                    label: useStableLabelValues ? labelValue : label.name,
                    serverID: track.id ?? null,
                    objectID: track.clientID ?? null,
                    type: ObjectType.TRACK,
                    shape: track.shapes[0]?.type ?? null,
                    occluded: null,
                    score: null,
                    votes: null,
                };

                const entries: ConvertedObjectData[] = shouldAddParentEntry ? [mainEntry] : [];

                // For skeleton tracks, create separate entries for each element (sublabel)
                if (track.shapes[0]?.type === ShapeType.SKELETON && track.elements) {
                    track.elements.forEach((element) => {
                        const elementLabel = labelByID[element.label_id];
                        if (elementLabel) {
                            const sublabelName = `${label.name} / ${elementLabel.name}`;
                            const sublabelValue = getLabelFilterValue(track.label_id, element.label_id);

                            if (isSublabelReferenced(sublabelName, sublabelValue, filterReferences)) {
                                const elementAttributes = convertAttributes(getTrackAttributes(element), attributeByID);
                                entries.push({
                                    width: null,
                                    height: null,
                                    rotation: null,
                                    attr: {
                                        [adjustName(sublabelValue)]: elementAttributes,
                                        [adjustName(sublabelName)]: elementAttributes,
                                    },
                                    label: useStableLabelValues ? sublabelValue : sublabelName,
                                    serverID: track.id ?? null,
                                    objectID: track.clientID ?? null,
                                    type: ObjectType.TRACK,
                                    shape: element.shapes?.[0]?.type ?? ShapeType.POINTS,
                                    occluded: null,
                                    score: null,
                                    votes: null,
                                });
                            }
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

        const filter = filters[0];
        const filterReferences = getFilterReferences(filter);
        const converted = this._convertSerializedObjectStates(statesData, filterReferences);
        return getMatchingIDs(converted, filter);
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

        const filter = filters[0];
        const filterReferences = getFilterReferences(filter);
        const converted = this._convertSerializedCollection(collection, labelsSpec, filterReferences);

        return {
            shapes: getMatchingIDs(converted.shapes, filter),
            tags: getMatchingIDs(converted.tags, filter),
            tracks: getMatchingIDs(converted.tracks, filter),
        };
    }
}
