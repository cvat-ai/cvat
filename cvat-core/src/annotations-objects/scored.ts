// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { AnnotationContext } from './annotation-context';

type Constructor<T = object> = new (...args: any[]) => T;
type AnnotationContextConstructor = Constructor<AnnotationContext>;

export type Scored = {
    score: number;
    votes: number;
};

export function ScoredMixin<TBase extends AnnotationContextConstructor>(
    Base: TBase,
): TBase & Constructor<InstanceType<TBase> & Scored> {
    return class ScoredAnnotation extends Base {
        public score: number;
        public votes: number;

        constructor(...args: any[]) {
            super(...args);
            const [data] = args as [{ score: number }];
            const { replicasCount } = this;
            this.score = data.score ?? 1;
            this.votes = replicasCount !== undefined ? Math.round(this.score * replicasCount) : 0;
        }
    } as TBase & Constructor<InstanceType<TBase> & Scored>;
}
