// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ObjectState, ObjectType } from 'cvat-core-wrapper';

const OBJECT_DRAG_ID_PREFIX = 'object:';
const LAYER_DRAG_ID_PREFIX = 'drag-layer:';
const LAYER_DROP_ID_PREFIX = 'layer:';
const LAYER_INSERT_DROP_ID_PREFIX = 'insert-layer:';

export const INSERT_DROP_AREA_PROXIMITY = 16;

export type LayerMoveSource = { clientID: number } | { zOrder: number };
export type LayerPlacement = { before: number } | { after: number };
export type PointerPosition = { x: number; y: number };

export function objectDragID(clientID: number): string {
    return `${OBJECT_DRAG_ID_PREFIX}${clientID}`;
}

export function layerDragID(zOrder: number): string {
    return `${LAYER_DRAG_ID_PREFIX}${zOrder}`;
}

export function layerDropID(zOrder: number): string {
    return `${LAYER_DROP_ID_PREFIX}${zOrder}`;
}

export function layerInsertDropID(placement: LayerPlacement): string {
    if ('before' in placement) {
        return `${LAYER_INSERT_DROP_ID_PREFIX}before:${placement.before}`;
    }

    return `${LAYER_INSERT_DROP_ID_PREFIX}after:${placement.after}`;
}

export function parseObjectDragID(id: string): number | null {
    if (!id.startsWith(OBJECT_DRAG_ID_PREFIX)) {
        return null;
    }

    const clientID = Number(id.slice(OBJECT_DRAG_ID_PREFIX.length));
    return Number.isInteger(clientID) ? clientID : null;
}

export function parseLayerDragID(id: string): number | null {
    if (!id.startsWith(LAYER_DRAG_ID_PREFIX)) {
        return null;
    }

    const zOrder = Number(id.slice(LAYER_DRAG_ID_PREFIX.length));
    return Number.isInteger(zOrder) ? zOrder : null;
}

export function parseLayerDropID(id: string): number | null {
    if (!id.startsWith(LAYER_DROP_ID_PREFIX)) {
        return null;
    }

    const zOrder = Number(id.slice(LAYER_DROP_ID_PREFIX.length));
    return Number.isInteger(zOrder) ? zOrder : null;
}

export function parseLayerInsertDropID(id: string): LayerPlacement | null {
    if (!id.startsWith(LAYER_INSERT_DROP_ID_PREFIX)) {
        return null;
    }

    const [kind, value] = id.slice(LAYER_INSERT_DROP_ID_PREFIX.length).split(':');
    const zOrder = Number(value);

    if (!Number.isInteger(zOrder)) {
        return null;
    }

    if (kind === 'before') {
        return { before: zOrder };
    }

    if (kind === 'after') {
        return { after: zOrder };
    }

    return null;
}

export function isLayerDroppedBesideItself(sourceZOrder: number, placement: LayerPlacement): boolean {
    if ('before' in placement) {
        return sourceZOrder === placement.before;
    }

    return sourceZOrder === placement.after;
}

export function isLayerState(state: ObjectState): boolean {
    return [ObjectType.SHAPE, ObjectType.TRACK].includes(state.objectType);
}
