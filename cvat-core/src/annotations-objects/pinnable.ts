// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { HistoryActions } from '../enums';
import type { AnnotationBase } from './annotation-common';
import type { Constructor } from './types';

type AnnotationBaseConstructor = Constructor<AnnotationBase>;
interface Pinnable {
    pinned: boolean;
    savePinned(pinned: boolean, frame: number | null): void;
}

type PinnableConstructor<TBase extends AnnotationBaseConstructor> =
    TBase & Constructor<InstanceType<TBase> & Pinnable>;

export function PinnableMixin<TBase extends AnnotationBaseConstructor>(
    Base: TBase,
): PinnableConstructor<TBase> {
    return class PinnableAnnotation extends Base {
        protected pinned: boolean;

        constructor(...args: any[]) {
            super(...args);
            this.pinned = false;
        }

        protected savePinned(pinned: boolean, frame: number | null): void {
            const undoPinned = this.pinned;
            const redoPinned = pinned;

            this.history.do(
                HistoryActions.CHANGED_PINNED,
                () => {
                    this.pinned = undoPinned;
                    this.updated = Date.now();
                },
                () => {
                    this.pinned = redoPinned;
                    this.updated = Date.now();
                },
                [this.clientID],
                frame,
            );

            this.pinned = pinned;
        }
    } as PinnableConstructor<TBase>;
}
