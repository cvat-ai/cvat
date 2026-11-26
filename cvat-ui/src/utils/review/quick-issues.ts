// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import config from 'config';
import { DimensionType, ObjectState } from 'cvat-core-wrapper';
import { get3DQuickIssuePresets, is3DQuickIssueMessage } from './quick-issues3d';

export interface QuickIssuePreset {
    key: string;
    label: string;
    message: string;
}

interface QuickIssueGroup {
    key: string;
    label: string;
    items: QuickIssuePreset[];
}

export type QuickIssueMenuItem = QuickIssuePreset | QuickIssueGroup;

const commonPresets: QuickIssuePreset[] = [{
    key: 'quick_issue_position',
    label: 'Quick issue: incorrect position',
    message: config.QUICK_ISSUE_INCORRECT_POSITION_TEXT,
}, {
    key: 'quick_issue_attribute',
    label: 'Quick issue: incorrect attribute',
    message: config.QUICK_ISSUE_INCORRECT_ATTRIBUTE_TEXT,
}];

export function getQuickIssuePresets(dimension: DimensionType, object?: ObjectState): QuickIssueMenuItem[] {
    return [
        ...commonPresets,
        ...(dimension === DimensionType.DIMENSION_3D && object ? get3DQuickIssuePresets(object) : []),
    ];
}

export function isQuickIssuePresetMessage(message: string): boolean {
    return commonPresets.some((preset) => preset.message === message) || is3DQuickIssueMessage(message);
}
