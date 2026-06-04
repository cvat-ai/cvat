// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Source } from '../enums';
import type { SerializedShape, SerializedTrack } from '../server-response-types';
import type { TrackedShape } from './types';

export const defaultGroupColor = '#E0E0E0';

export function copyShape(state: TrackedShape, data: Partial<TrackedShape> = {}): TrackedShape {
    return {
        rotation: state.rotation,
        zOrder: state.zOrder,
        points: state.points,
        occluded: state.occluded,
        outside: state.outside,
        attributes: {},
        ...data,
    };
}

export function serverAttributesToDictionary(attributes: SerializedShape['attributes']): Record<number, string> {
    const object = Object.create(null);
    for (const attr of attributes) {
        object[attr.spec_id] = attr.value;
    }

    return object;
}

export function convertTrackedShape(shape: SerializedTrack['shapes'][0]): TrackedShape {
    return {
        serverID: shape.id,
        occluded: shape.occluded,
        zOrder: shape.z_order,
        points: shape.points,
        outside: shape.outside,
        rotation: shape.rotation || 0,
        attributes: serverAttributesToDictionary(shape.attributes),
    };
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
