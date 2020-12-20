// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

export enum StateLevels {
    concatenator,
    filterBy,
    operator,
    value,
    attribute,
    attributeOperator,
    attributeValue,
    anotherAttributeLabel,
    anotherAttributeValue,
}

export enum ActionType {
    concatenator,
    filterBy,
    operator,
    value,
    attribute,
    attributeOperator,
    attributeValue,
    anotherAttributeLabel,
    anotherAttributeValue,
    fillState,
    partialReset,
    reset,
}

export enum ConcatenatorOptionsValues {
    or = '|',
    and = '&',
}

export enum FilterByValues {
    label = 'label',
    width = 'width',
    height = 'height',
    serverID = 'serverID',
    clientID = 'clientID',
    type = 'type',
    shape = 'shape',
    occluded = 'occluded',
    attribute = 'attribute',
    emptyFrame = 'empty_frame',
}

export enum FilterByTypeValues {
    shape = 'shape',
    track = 'track',
}

export enum FilterByShapeValues {
    rectangle = 'rectangle',
    points = 'points',
    polyline = 'polyline',
    polygon = 'polygon',
    cuboids = 'cuboids',
    tag = 'tag',
}

export enum OperatorOptionsValues {
    eq = '==',
    neq = '!=',
    gt = '>',
    gte = '>=',
    lt = '<',
    lte = '<=',
}

export enum NumericFilterByOptions {
    width,
    height,
    serverID,
    clientID,
}

export enum PixelFilterByOptions {
    width,
    height,
}

export enum BooleanFilterByOptions {
    occluded,
    empty_frame,
}

export enum StateFields {
    concatenator = 'concatenator',
    filterBy = 'filterBy',
    operator = 'operator',
    value = 'value',
    attribute = 'attribute',
    attributeOperator = 'attributeOperator',
    attributeValue = 'attributeValue',
    anotherAttributeLabel = 'anotherAttributeLabel',
    anotherAttributeValue = 'anotherAttributeValue',
}
