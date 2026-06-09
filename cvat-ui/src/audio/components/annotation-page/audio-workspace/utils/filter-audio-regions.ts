// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import jsonLogic from 'json-logic-js';

import { Attribute, AudioIntervalState, Label } from 'cvat-core-wrapper';

function adjustName(name: string): string {
    return name.replace(/\./g, '∙');
}

function convertAttributeValue(
    value: string,
    spec: Attribute | undefined,
): string | number | boolean {
    if (!spec) return value;
    if (spec.inputType === 'number') return Number(value);
    if (spec.inputType === 'checkbox') return value === 'true';
    return value;
}

function regionToFilterShape(
    interval: AudioIntervalState,
    labelById: Map<number, Label>,
): Record<string, unknown> {
    const label = interval.label.id != null ? labelById.get(interval.label.id) : undefined;
    const labelName = label?.name ?? '';
    const attrSpecById = new Map<number, Attribute>();
    label?.attributes.forEach((attr: Attribute) => {
        if (attr.id != null) attrSpecById.set(attr.id, attr);
    });

    const attrs: Record<string, string | number | boolean> = {};
    Object.entries(interval.attributes ?? {}).forEach(([id, value]) => {
        const spec = attrSpecById.get(Number(id));
        const name = adjustName(spec?.name ?? id);
        attrs[name] = convertAttributeValue(value, spec);
    });

    const startMs = interval.start;
    const endMs = interval.stop ?? interval.start;

    return {
        label: labelName,
        serverID: interval.serverID ?? null,
        source: interval.source ?? null,
        duration: endMs - startMs,
        start: startMs,
        end: endMs,
        attr: { [adjustName(labelName)]: attrs },
    };
}

export function filterAudioIntervals(
    intervals: AudioIntervalState[],
    labels: Label[],
    filters: object[],
): AudioIntervalState[] {
    if (!filters.length) return intervals;

    const labelById = new Map<number, Label>();
    labels.forEach((label) => {
        if (label.id != null) labelById.set(label.id, label);
    });

    const rule = filters[0];
    return intervals.filter((interval) => {
        try {
            return !!jsonLogic.apply(rule, regionToFilterShape(interval, labelById));
        } catch {
            return true;
        }
    });
}
