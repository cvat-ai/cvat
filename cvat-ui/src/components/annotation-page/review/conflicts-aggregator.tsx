// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

import { CombinedState } from 'reducers';
import { Canvas } from 'cvat-canvas/src/typescript/canvas';

import { AnnotationConflict, ObjectState, QualityConflict } from 'cvat-core-wrapper';
import ConflictLabel from './conflict-label';

export default function ConflictAggregatorComponent(): JSX.Element | null {
    const qualityConflicts = useSelector((state: CombinedState) => state.review.conflicts);
    const objectStates = useSelector((state: CombinedState) => state.annotation.annotations.states);
    const currentFrame = useSelector((state: CombinedState) => state.annotation.player.frame.number);
    const showConflicts = useSelector((state: CombinedState) => state.settings.shapes.showGroundTruth);
    const frameQualityConflicts = qualityConflicts.filter(
        (conflict: QualityConflict) => conflict.frame === currentFrame,
    );
    const conflicts = frameQualityConflicts.map((f: QualityConflict) => f.annotationConflicts[0]);

    const canvasInstance = useSelector((state: CombinedState) => state.annotation.canvas.instance);
    const canvasIsReady = useSelector((state: CombinedState): boolean => state.annotation.canvas.ready);
    const [geometry, setGeometry] = useState<Canvas['geometry'] | null>(null);
    const conflictLabels: JSX.Element[] = [];
    useEffect(() => {
        if (canvasInstance instanceof Canvas) {
            const { geometry: updatedGeometry } = canvasInstance;
            setGeometry(updatedGeometry);

            const geometryListener = (): void => {
                setGeometry(canvasInstance.geometry);
            };

            canvasInstance.html().addEventListener('canvas.zoom', geometryListener);
            canvasInstance.html().addEventListener('canvas.fit', geometryListener);
            canvasInstance.html().addEventListener('canvas.reshape', geometryListener);

            return () => {
                canvasInstance.html().removeEventListener('canvas.zoom', geometryListener);
                canvasInstance.html().removeEventListener('canvas.fit', geometryListener);
                canvasInstance.html().addEventListener('canvas.reshape', geometryListener);
            };
        }

        return () => {};
    }, [canvasInstance]);
    const [mapping, setMapping] = useState<any>([]);
    useEffect(() => {
        setTimeout(() => {
            if (canvasInstance instanceof Canvas && geometry && showConflicts) {
                const newMapping = conflicts.map((c: AnnotationConflict) => {
                    const state = objectStates.find((s: ObjectState) => s.jobID === c.jobId && s.serverID === c.objId);
                    if (state && canvasInstance) {
                        const points = canvasInstance.setupConflictsRegions(state);
                        if (points) {
                            return {
                                description: c.description,
                                importance: c.importance,
                                x: points[0],
                                y: points[1],
                            };
                        }
                    }
                    return [];
                }).filter((el) => !Array.isArray(el));
                setMapping(newMapping);
            } else {
                setMapping([]);
            }
        });
    }, [geometry, objectStates, showConflicts, currentFrame]);

    if (!(canvasInstance instanceof Canvas) || !canvasIsReady || !geometry) {
        return null;
    }

    for (const conflict of mapping) {
        conflictLabels.push(
            <ConflictLabel
                key={(Math.random() + 1).toString(36).substring(7)}
                text={conflict.description}
                top={conflict.y}
                left={conflict.x}
                angle={-geometry.angle}
                scale={1 / geometry.scale}
                onClick={() => {}}
                importance={conflict.importance}
            />,
        );
    }

    return (
        <>
            {conflictLabels}
        </>
    );
}
