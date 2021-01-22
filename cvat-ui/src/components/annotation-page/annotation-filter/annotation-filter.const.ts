// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import {
    ConcatenatorOptionsValues,
    FilterByShapeValues,
    FilterByTypeValues,
    FilterByValues,
    OperatorOptionsValues,
} from './annotation-filter.enum';

export const concatenatorOptions: Record<string, string>[] = [
    { label: 'and (&)', value: ConcatenatorOptionsValues.and },
    { label: 'or (|)', value: ConcatenatorOptionsValues.or },
];

export const filterByOptions: Record<string, string | FilterByValues>[] = [
    { label: 'Label', value: FilterByValues.label },
    { label: 'Width', value: FilterByValues.width },
    { label: 'Height', value: FilterByValues.height },
    { label: 'Server ID', value: FilterByValues.serverID },
    { label: 'Client ID', value: FilterByValues.clientID },
    { label: 'Type', value: FilterByValues.type },
    { label: 'Shape', value: FilterByValues.shape },
    { label: 'Occluded', value: FilterByValues.occluded },
    { label: 'Attribute', value: FilterByValues.attribute },
    { label: 'Empty Frame', value: FilterByValues.emptyFrame },
];

export const filterByBooleanOptions: Record<string, string | boolean>[] = [
    { label: 'True', value: true },
    { label: 'False', value: false },
];

export const filterByTypeOptions: Record<string, string>[] = [
    { label: 'Shape', value: FilterByTypeValues.shape },
    { label: 'Track', value: FilterByTypeValues.track },
];

export const filterByShapeOptions: Record<string, string>[] = [
    { label: 'Rectangle', value: FilterByShapeValues.rectangle },
    { label: 'Points', value: FilterByShapeValues.points },
    { label: 'Polyline', value: FilterByShapeValues.polyline },
    { label: 'Polygon', value: FilterByShapeValues.polygon },
    { label: 'Cuboids', value: FilterByShapeValues.cuboids },
    { label: 'Tag', value: FilterByShapeValues.tag },
];

export const operatorOptions: Record<string, string | boolean>[] = [
    { label: OperatorOptionsValues.eq, value: OperatorOptionsValues.eq, any: true },
    { label: OperatorOptionsValues.neq, value: OperatorOptionsValues.neq, any: true },
    { label: OperatorOptionsValues.gt, value: OperatorOptionsValues.gt, any: false },
    { label: OperatorOptionsValues.gte, value: OperatorOptionsValues.gte, any: false },
    { label: OperatorOptionsValues.lt, value: OperatorOptionsValues.lt, any: false },
    { label: OperatorOptionsValues.lte, value: OperatorOptionsValues.lte, any: false },
];
