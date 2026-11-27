// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ObjectState, ObjectType, ShapeType } from 'cvat-core-wrapper';
import type { QuickIssueMenuItem, QuickIssuePreset } from './quick-issues';

const cuboidPresets: QuickIssuePreset[] = [{
    key: 'quick_issue_rotation',
    label: 'Quick issue: incorrect rotation',
    message: 'Wrong rotation',
}, {
    key: 'quick_issue_dimensions',
    label: 'Quick issue: incorrect dimensions',
    message: 'Wrong dimensions',
}];

const trackPreset: QuickIssuePreset = {
    key: 'quick_issue_track_identity',
    label: 'Quick issue: incorrect track identity',
    message: 'Wrong track identity',
};

const attributeMessagePrefix = 'Wrong attribute: ';

export function get3DQuickIssuePresets(object: ObjectState): QuickIssueMenuItem[] {
    if (object.shapeType !== ShapeType.CUBOID) return [];

    const presets: QuickIssueMenuItem[] = [...cuboidPresets];
    if (object.objectType === ObjectType.TRACK) presets.push(trackPreset);

    const attributes = object.label.attributes.filter((attribute) => !attribute.deleted);
    if (attributes.length) {
        presets.push({
            key: 'quick_issue_specific_attribute',
            label: 'Quick issue: specific attribute',
            items: attributes.map((attribute) => ({
                key: `quick_issue_attribute_${attribute.id}`,
                label: attribute.name,
                message: `${attributeMessagePrefix}${attribute.name}`,
            })),
        });
    }

    return presets;
}

export function is3DQuickIssueMessage(message: string): boolean {
    return [...cuboidPresets, trackPreset].some((preset) => preset.message === message) ||
        message.startsWith(attributeMessagePrefix);
}
