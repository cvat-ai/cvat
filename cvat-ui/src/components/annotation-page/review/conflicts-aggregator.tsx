// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { CombinedState } from 'reducers';
import { Canvas } from 'cvat-canvas/src/typescript/canvas';

import { AnnotationConflict, ObjectState, QualityConflict } from 'cvat-core-wrapper';
import { highlightConflict } from 'actions/annotation-actions';
import ConflictLabel from './conflict-label';

export default function ConflictAggregatorComponent(): JSX.Element | null {
    const dispatch = useDispatch();

    const qualityConflicts = useSelector((state: CombinedState) => state.review.frameConflicts);
    const objectStates = useSelector((state: CombinedState) => state.annotation.annotations.states);
    const currentFrame = useSelector((state: CombinedState) => state.annotation.player.frame.number);
    const showConflicts = useSelector((state: CombinedState) => state.settings.shapes.showGroundTruth);
    const highlightedConflict = useSelector((state: CombinedState) => state.annotation.annotations.highlightedConflict);

    const onEnter = useCallback((conflict: QualityConflict) => {
        dispatch(highlightConflict(conflict));
    }, []);
    const onLeave = useCallback(() => {
        dispatch(highlightConflict(null));
    }, []);

    const highlightedObjectsIDs = highlightedConflict?.annotationConflicts?.map((c: AnnotationConflict) => c.clientID);

    const canvasInstance = useSelector((state: CombinedState) => state.annotation.canvas.instance);
    const canvasIsReady = useSelector((state: CombinedState): boolean => state.annotation.canvas.ready);
    const [geometry, setGeometry] = useState<Canvas['geometry'] | null>(null);
    const ready = useSelector((state: CombinedState) => state.annotation.canvas.ready);

    const conflictLabels: JSX.Element[] = [];
    useEffect(() => {
        if (canvasInstance instanceof Canvas) {
            const { geometry: updatedGeometry } = canvasInstance;
            setGeometry(updatedGeometry);

            const geometryListener = (): void => {
                dispatch(highlightConflict(null));
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
    }, [canvasInstance, ready]);
    const [mapping, setMapping] = useState<any>([]);
    useEffect(() => {
        if (canvasInstance instanceof Canvas && geometry && showConflicts) {
            const newMapping = qualityConflicts.map((conflict: QualityConflict) => {
                const c = conflict.annotationConflicts[0];
                const state = objectStates.find((s: ObjectState) => s.jobID === c.jobID && s.serverID === c.serverID);
                if (state && canvasInstance) {
                    const points = canvasInstance.setupConflictsRegions(state);
                    if (points) {
                        return {
                            description: conflict.description,
                            importance: conflict.importance,
                            x: points[0],
                            y: points[1],
                            clientID: c.clientID,
                            conflict,
                        };
                    }
                }
                return [];
            }).filter((el) => !Array.isArray(el));
            setMapping(newMapping);
        } else {
            setMapping([]);
        }
    }, [geometry, objectStates, showConflicts, currentFrame, canvasInstance, ready]);

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
                importance={conflict.importance}
                darken={!!highlightedConflict && !!highlightedObjectsIDs &&
                    (!highlightedObjectsIDs.includes(conflict.clientID))}
                conflict={conflict.conflict}
                onEnter={onEnter}
                onLeave={onLeave}
                tooltipVisible={!!highlightedConflict && !!highlightedObjectsIDs &&
                    highlightedObjectsIDs.includes(conflict.clientID)}
            />,
        );
    }

    return (
        <>
            {conflictLabels}
        </>
    );
}
