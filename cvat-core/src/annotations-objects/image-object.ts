// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type ObjectState from '../object-state';
import { checkObjectType } from '../common';
import { ArgumentError } from '../exceptions';
import { Label } from '../labels';
import {
    attrsAsAnObject, validateAttributeValue,
} from '../object-utils';
import { AnnotationBase } from './annotation-common';
import type { AnnotationInjection, TrackedShape } from './types';

export class InterpolationNotPossibleError extends Error {}

export class ImageObject extends AnnotationBase {
    public frame: number;

    constructor(data, clientID: number, color: string, injection: AnnotationInjection) {
        super(data, clientID, color, injection);
        this.frame = data.frame;
    }

    protected validateStateBeforeSave(data: ObjectState, updated: ObjectState['updateFlags']): void {
        if (updated.label) {
            checkObjectType('label', data.label, null, { cls: Label, name: 'Label' });
        }

        const labelAttributes = attrsAsAnObject(data.label.attributes);
        if (updated.attributes) {
            for (const [id, value] of Object.entries(data.attributes)) {
                if (id in labelAttributes) {
                    if (!validateAttributeValue(value, labelAttributes[id])) {
                        throw new ArgumentError(
                            `Trying to save an attribute attribute with id ${id} and invalid value ${value}`,
                        );
                    }
                } else {
                    throw new ArgumentError(
                        `The label of the object doesn't have the attribute with id ${id}`,
                    );
                }
            }
        }

        if (updated.descriptions) {
            if (!Array.isArray(data.descriptions) || data.descriptions.some((desc) => typeof desc !== 'string')) {
                throw new ArgumentError(
                    `Descriptions are expected to be an array of strings but got ${data.descriptions}`,
                );
            }
        }

        if (updated.occluded) {
            checkObjectType('occluded', data.occluded, 'boolean');
        }

        if (updated.outside) {
            checkObjectType('outside', data.outside, 'boolean');
        }

        if (updated.zOrder) {
            checkObjectType('zOrder', data.zOrder, 'integer');
        }

        if (updated.lock) {
            checkObjectType('lock', data.lock, 'boolean');
        }

        if (updated.pinned) {
            checkObjectType('pinned', data.pinned, 'boolean');
        }

        if (updated.color) {
            checkObjectType('color', data.color, 'string');
            if (!/^#[0-9A-F]{6}$/i.test(data.color)) {
                throw new ArgumentError(`Got invalid color value: "${data.color}"`);
            }
        }

        if (updated.hidden) {
            checkObjectType('hidden', data.hidden, 'boolean');
        }

        if (updated.keyframe) {
            checkObjectType('keyframe', data.keyframe, 'boolean');
            const tracksShapeContext = this as ImageObject & { shapes?: Record<number, TrackedShape> };
            if (
                tracksShapeContext.shapes &&
                Object.keys(tracksShapeContext.shapes).length === 1 &&
                data.frame in tracksShapeContext.shapes &&
                !data.keyframe
            ) {
                throw new ArgumentError(
                    `Can not remove the latest keyframe of an object "${data.label.name}".` +
                    'Consider removing the object instead',
                );
            }
        }
    }
}
