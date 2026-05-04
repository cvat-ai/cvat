import jsonLogic from 'json-logic-js';

import { AudioRegion } from 'reducers';
import { Label, Attribute } from 'cvat-core-wrapper';

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
    region: AudioRegion,
    labelById: Map<number, Label>,
): Record<string, unknown> {
    const label = region.labelId != null ? labelById.get(region.labelId) : undefined;
    const labelName = label?.name ?? '';
    const attrSpecById = new Map<number, Attribute>();
    label?.attributes.forEach((attr: Attribute) => {
        if (attr.id != null) attrSpecById.set(attr.id, attr);
    });

    const attrs: Record<string, string | number | boolean> = {};
    Object.entries(region.attributes ?? {}).forEach(([id, value]) => {
        const spec = attrSpecById.get(Number(id));
        const name = adjustName(spec?.name ?? id);
        attrs[name] = convertAttributeValue(value, spec);
    });

    const startMs = region.start * 1000;
    const endMs = region.end * 1000;

    return {
        label: labelName,
        serverID: region.serverId ?? null,
        source: region.source ?? null,
        duration: endMs - startMs,
        start: startMs,
        end: endMs,
        attr: { [adjustName(labelName)]: attrs },
    };
}

export function filterAudioRegions(
    regions: AudioRegion[],
    labels: Label[],
    filters: object[],
): AudioRegion[] {
    if (!filters.length) return regions;

    const labelById = new Map<number, Label>();
    labels.forEach((label) => {
        if (label.id != null) labelById.set(label.id, label);
    });

    const rule = filters[0];
    return regions.filter((region) => {
        try {
            return !!jsonLogic.apply(rule, regionToFilterShape(region, labelById));
        } catch {
            // Malformed filter expression — fail open to avoid hiding everything.
            return true;
        }
    });
}
