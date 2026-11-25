// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SimilarityThresholdPolicy } from 'cvat-core/src/quality/server-response-types';

export type ThresholdCoordinates = { x: number; y: number };
export type EditableThresholdPoint = ThresholdCoordinates & { id: number };
export type EditableLinearThresholdPolicy = Omit<
    Extract<SimilarityThresholdPolicy, { mode: 'linear' }>, 'points'
> & { points: EditableThresholdPoint[] };
export type EditableThresholdPolicy = Extract<SimilarityThresholdPolicy, { mode: 'constant' }> |
EditableLinearThresholdPolicy;
