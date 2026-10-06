// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import { connect } from 'react-redux';

import {
    activateObject as activateObjectAction,
    switchSimplifyVisibility as switchSimplifyVisibilityAction,
    updateAnnotationsAsync,
} from 'actions/annotation-actions';
import PolySimplifyControl from 'components/annotation-page/standard-workspace/controls-side-bar/poly-simplify-control';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { Job, ObjectState, ShapeType } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import openCVWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { getObjectStateByClientID } from 'utils/objects-sidebar';
import { ThunkDispatch } from 'utils/redux';

interface StateToProps {
    objectState: ObjectState | null;
    originalPoints: number[] | null;
    jobInstance: Job | null;
    canvasInstance: Canvas | Canvas3d | null;
    frameNumber: number;
    defaultApproxPolyAccuracy: number;
    repeatDrawShapeShortcut: { sequences: string[] };
}

interface DispatchToProps {
    activateObject(clientID: number): void;
    updateState(objectState: ObjectState): Promise<void>;
    close(clientID: number): void;
}

type Props = StateToProps & DispatchToProps;

interface SessionProps extends Omit<Props, 'objectState' | 'jobInstance'> {
    objectState: ObjectState;
    jobInstance: Job;
}

interface SessionControls {
    active: boolean;
    approxPolyAccuracy: number;
    onChangeAccuracy(value: number): void;
    apply(points: number[]): Promise<void>;
    cancel(): Promise<void>;
    updatePreview(points: number[]): Promise<void>;
}

interface SimplifySession extends Pick<SessionProps, 'objectState' | 'jobInstance' | 'updateState' | 'close'> {
    mounted: boolean;
    active: boolean;
    frozen: boolean;
    finished: boolean;
    finishing: boolean;
    needsRestore: boolean;
    pending: Promise<void>;
    frameNumber: number;
    originalPoints: number[];
}

// History belongs to the job, so a new session must wait for its predecessor's full cleanup.
const sessionCompletionByJob = new WeakMap<Job, Promise<void>>();

function usePolySimplifySession(props: SessionProps): SessionControls {
    const [active, setActive] = useState(false);
    const [approxPolyAccuracy, setApproxPolyAccuracy] = useState(props.defaultApproxPolyAccuracy);
    const propsRef = useRef(props);
    propsRef.current = props;
    const sessionRef = useRef<SimplifySession | null>(null);
    const isCurrentFrame = useCallback((session: SimplifySession): boolean => (
        session.frameNumber === propsRef.current.frameNumber && session.jobInstance === propsRef.current.jobInstance
    ), []);

    const enqueue = useCallback((currentSession: SimplifySession, operation: () => Promise<void>): Promise<void> => {
        const session = currentSession;
        const pending = session.pending.then(operation);
        // Keep cleanup runnable even if an earlier operation fails.
        session.pending = pending.catch(() => {});
        return pending;
    }, []);

    const unfreeze = useCallback(async (currentSession: SimplifySession): Promise<void> => {
        const session = currentSession;
        if (session.frozen) {
            session.frozen = false;
            await session.jobInstance.actions.freeze(false);
        }
    }, []);

    const restore = useCallback(async (currentSession: SimplifySession): Promise<void> => {
        const session = currentSession;
        const { objectState, updateState } = session;
        try {
            if (!session.finished && session.needsRestore) {
                objectState.points = [...session.originalPoints];
                await updateState(objectState);
                session.needsRestore = false;
            }
        } finally {
            await unfreeze(session);
            session.finished = true;
        }
    }, [unfreeze]);

    const cancel = useCallback(async (): Promise<void> => {
        const session = sessionRef.current;
        if (!session || session.finishing || session.finished) return;
        session.finishing = true;
        await enqueue(session, async (): Promise<void> => {
            try {
                await restore(session);
            } finally {
                if (session.mounted) session.close(session.objectState.clientID as number);
                session.finishing = false;
            }
        });
    }, [enqueue, restore]);

    const apply = useCallback(async (simplifiedPoints: number[]): Promise<void> => {
        const session = sessionRef.current;
        if (!session || !session.mounted || !session.active || session.finishing ||
            session.finished || !isCurrentFrame(session)) return;
        session.finishing = true;
        const { objectState, updateState, close } = session;
        await enqueue(session, async (): Promise<void> => {
            try {
                if (!openCVWrapper.isInitialized) {
                    await openCVWrapper.initialize(() => {});
                }
                if (!session.mounted || !isCurrentFrame(session)) return;

                // Restore while history is frozen, then record only the final simplification.
                objectState.points = [...session.originalPoints];
                await updateState(objectState);
                session.needsRestore = false;
                if (!session.mounted || !isCurrentFrame(session)) return;

                await unfreeze(session);
                if (!session.mounted || !isCurrentFrame(session)) return;

                objectState.points = [...simplifiedPoints];
                session.needsRestore = true;
                await updateState(objectState);
                // A final save already in flight completes the commit, even after unmount.
                session.finished = true;
                if (session.mounted) close(objectState.clientID as number);
            } catch (error) {
                await restore(session);
                if (session.mounted) close(objectState.clientID as number);
                throw error;
            } finally {
                session.finishing = false;
                // Navigation may have requested cancellation while Apply was still in flight.
                if (session.mounted && !isCurrentFrame(session)) cancel();
            }
        });
    }, [cancel, enqueue, isCurrentFrame, restore, unfreeze]);

    const updatePreview = useCallback(async (points: number[]): Promise<void> => {
        const session = sessionRef.current;
        if (!session || !session.mounted || !session.active || session.finishing ||
            session.finished || !isCurrentFrame(session)) return;
        await enqueue(session, async (): Promise<void> => {
            if (!session.mounted || session.finishing || session.finished || !isCurrentFrame(session)) return;
            const { objectState, updateState } = session;
            session.needsRestore = true;
            objectState.points = [...points];
            await updateState(objectState);
        });
    }, [enqueue, isCurrentFrame]);

    useEffect((): (() => void) => {
        const currentProps = propsRef.current;
        const {
            objectState, canvasInstance, activateObject, jobInstance, close,
        } = currentProps;
        const session: SimplifySession = {
            mounted: true,
            active: false,
            frozen: false,
            finished: false,
            finishing: false,
            needsRestore: false,
            pending: Promise.resolve(),
            // Track client IDs persist across frames; all mutations must use the originating state.
            objectState,
            jobInstance,
            updateState: currentProps.updateState,
            close,
            frameNumber: objectState.frame,
            originalPoints: [...(currentProps.originalPoints || objectState.points || [])],
        };
        sessionRef.current = session;
        const previousCompletion = sessionCompletionByJob.get(jobInstance);
        let completeSession: (() => void) | undefined;
        const completion = new Promise<void>((resolve) => {
            completeSession = resolve;
        });
        const queuedCompletion = (previousCompletion || Promise.resolve()).then(() => completion);
        sessionCompletionByJob.set(jobInstance, queuedCompletion);

        enqueue(session, async (): Promise<void> => {
            // Even superseded sessions wait, keeping subsequent sessions behind the same cleanup barrier.
            await previousCompletion;
            if (!session.mounted || session.finishing || !isCurrentFrame(session)) return;
            if (![ShapeType.POLYGON, ShapeType.POLYLINE].includes(objectState.shapeType)) {
                close(objectState.clientID as number);
                return;
            }
            activateObject(objectState.clientID as number);
            if (canvasInstance instanceof Canvas && canvasInstance.mode() !== CanvasMode.IDLE) {
                canvasInstance.cancel();
            }
            try {
                if (previousCompletion) {
                    const states = await jobInstance.annotations.get(session.frameNumber, false, []);
                    if (!session.mounted || session.finishing || !isCurrentFrame(session)) return;
                    const restoredState = getObjectStateByClientID(states, objectState.clientID as number);
                    if (!restoredState) {
                        close(objectState.clientID as number);
                        return;
                    }
                    // Returning to an object can carry a snapshot taken before its old preview was restored.
                    session.originalPoints = [...(restoredState.points || [])];
                    objectState.points = [...session.originalPoints];
                }
                await jobInstance.actions.freeze(true);
                session.frozen = true;
                if (session.mounted && !session.finishing && isCurrentFrame(session)) {
                    session.active = true;
                    setActive(true);
                }
            } catch (_error) {
                await unfreeze(session);
                if (session.mounted) close(objectState.clientID as number);
            }
        });

        return (): void => {
            session.mounted = false;
            if (!session.finished) close(objectState.clientID as number);
            // Wait for freeze/preview/Apply to settle before restoring and releasing history.
            enqueue(session, async (): Promise<void> => {
                try {
                    await restore(session);
                } finally {
                    completeSession?.();
                    if (sessionCompletionByJob.get(jobInstance) === queuedCompletion) {
                        sessionCompletionByJob.delete(jobInstance);
                    }
                }
            });
        };
    }, [enqueue, isCurrentFrame, restore, unfreeze]);

    useEffect((): void => {
        const session = sessionRef.current;
        if (session && (session.frameNumber !== props.frameNumber || session.jobInstance !== props.jobInstance)) {
            cancel();
        }
    }, [cancel, props.frameNumber, props.jobInstance]);

    useEffect((): void => {
        if (!active) setApproxPolyAccuracy(props.defaultApproxPolyAccuracy);
    }, [active, props.defaultApproxPolyAccuracy]);

    return {
        active, approxPolyAccuracy, onChangeAccuracy: setApproxPolyAccuracy, apply, cancel, updatePreview,
    };
}

function PolySimplifySession(props: SessionProps): JSX.Element | null {
    const { active, ...controls } = usePolySimplifySession(props);
    return active ? (
        <PolySimplifyControl
            objectState={props.objectState}
            approxPolyAccuracy={controls.approxPolyAccuracy}
            repeatDrawShapeShortcut={props.repeatDrawShapeShortcut}
            onChangeAccuracy={controls.onChangeAccuracy}
            onApply={controls.apply}
            onCancel={controls.cancel}
            onUpdatePreview={controls.updatePreview}
        />
    ) : null;
}

function PolySimplifyController(props: Props): JSX.Element | null {
    const { objectState, jobInstance } = props;
    return objectState && jobInstance ? (
        <PolySimplifySession
            {...props}
            key={`${jobInstance.id}-${objectState.clientID}`}
            objectState={objectState}
            jobInstance={jobInstance}
        />
    ) : null;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            simplify: { objectState: requestedState, originalPoints },
            annotations: { states },
            job: { instance: jobInstance },
            canvas: { instance: canvasInstance },
            player: { frame: { number: frameNumber } },
        },
        settings: { workspace: { defaultApproxPolyAccuracy } },
        shortcuts: { keyMap },
    } = state;

    return {
        objectState: requestedState ?
            getObjectStateByClientID(states, requestedState.clientID as number) || requestedState : null,
        originalPoints,
        jobInstance: jobInstance as Job | null,
        canvasInstance: canvasInstance as Canvas | Canvas3d | null,
        frameNumber,
        defaultApproxPolyAccuracy,
        repeatDrawShapeShortcut: keyMap.SWITCH_DRAW_MODE_STANDARD_CONTROLS,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        activateObject(clientID: number): void {
            dispatch(activateObjectAction(clientID, null, null));
        },
        updateState(objectState: ObjectState): Promise<void> {
            return dispatch(updateAnnotationsAsync([objectState]));
        },
        close(clientID: number): void {
            dispatch((innerDispatch, getState): void => {
                if (getState().annotation.simplify.objectState?.clientID === clientID) {
                    innerDispatch(switchSimplifyVisibilityAction(null));
                }
            });
        },
    };
}

export default connect<StateToProps, DispatchToProps, Record<string, unknown>, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(PolySimplifyController);
