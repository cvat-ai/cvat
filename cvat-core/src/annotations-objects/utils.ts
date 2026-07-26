// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Source } from '../enums';
import type { SerializedAttributes, SerializedTrack } from '../server-response-types';
import type { TrackedShape } from './types';

export const defaultGroupColor = '#E0E0E0';

type CopyShapeState = Omit<TrackedShape, 'attributes' | 'serverId'>;

export function copyShape(state: CopyShapeState, data: Partial<TrackedShape> = {}): TrackedShape {
    return {
        rotation: state.rotation,
        zOrder: state.zOrder,
        points: state.points,
        occluded: state.occluded,
        outside: state.outside,
        attributes: new Map(),
        ...data,
    };
}

export function deserializeAttributes(attributes: SerializedAttributes): Map<number, string> {
    const map = new Map<number, string>();
    for (const attr of attributes) {
        map.set(attr.spec_id, attr.value);
    }
    return map;
}

export function serializeAttributes(attributes: Map<number, string>): SerializedAttributes {
    return Array.from(attributes.entries()).reduce((acc, [id, value]) => {
        acc.push({ spec_id: id, value });
        return acc;
    }, []);
}

export function deserializeTrackedShapes(shapes: SerializedTrack['shapes']): Record<number, TrackedShape> {
    return shapes.reduce((acc, shape) => {
        acc[shape.frame] = {
            serverId: shape.id,
            occluded: shape.occluded,
            zOrder: shape.z_order,
            points: shape.points,
            outside: shape.outside,
            rotation: shape.rotation || 0,
            attributes: deserializeAttributes(shape.attributes),
        };
        return acc;
    }, {} as Record<number, TrackedShape>);
}

export function computeNewSource(currentSource: Source): Source {
    if ([Source.AUTO, Source.SEMI_AUTO].includes(currentSource)) {
        return Source.SEMI_AUTO;
    }

    if (currentSource === Source.CONSENSUS) {
        return Source.CONSENSUS;
    }

    return Source.MANUAL;
}

export function isChildObject(parentId?: number): boolean {
    return typeof parentId === 'number';
}
