// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    shallowEqual, useDispatch, useSelector, useStore,
} from 'react-redux';
import React, {
    useCallback, useEffect, useReducer, useRef,
} from 'react';
import Layout, { SiderProps } from 'antd/lib/layout';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import InputNumber from 'antd/lib/input-number';
import Select from 'antd/lib/select';
import Alert from 'antd/lib/alert';
import Button from 'antd/lib/button';
import message from 'antd/lib/message';

import {
    ActiveControl, CombinedState, NavigationType, ObjectType,
} from 'reducers';
import { labelShapeType } from 'reducers/annotation-reducer';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import {
    Job, Label, LabelType, ShapeType,
} from 'cvat-core-wrapper';
import { ActionUnion, createAction } from 'utils/redux';
import {
    rememberObject, changeFrameAsync, setNavigationType,
    removeObjectAsync, finishCurrentJobAsync,
    changeHideActiveObjectAsync, updateActiveControl, ShapeTypeToControl,
} from 'actions/annotation-actions';
import LabelSelector from 'components/label-selector/label-selector';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';

enum ReducerActionType {
    SWITCH_AUTO_NEXT_FRAME = 'SWITCH_AUTO_NEXT_FRAME',
    SWITCH_AUTOSAVE_ON_FINISH = 'SWITCH_AUTOSAVE_ON_FINISH',
    SWITCH_COUNT_OF_POINTS_IS_PREDEFINED = 'SWITCH_COUNT_OF_POINTS_IS_PREDEFINED',
    SET_ACTIVE_LABEL = 'SET_ACTIVE_LABEL',
    SET_POINTS_COUNT = 'SET_POINTS_COUNT',
    SET_NEXT_FRAME = 'SET_NEXT_FRAME',
}

function cancelCurrentCanvasOp(state: CombinedState): void {
    const canvas = state.annotation.canvas.instance as Canvas;
    if (canvas.mode() !== CanvasMode.IDLE) {
        canvas.cancel();
    }
}

function makeMessage(label: Label, labelType: State['labelType'], pointsCount: number): JSX.Element {
    let readableShape = '';
    if (labelType === LabelType.POINTS) {
        readableShape = pointsCount === 1 ? 'one point' : `${pointsCount} points`;
    } else if (labelType === LabelType.ELLIPSE) {
        readableShape = 'an ellipse';
    } else {
        readableShape = `a ${labelType}`;
    }

    return (
        <>
            <Text>Annotate</Text>
            <Text strong>{` ${label.name} `}</Text>
            <Text>on the image, using</Text>
            <Text strong>{` ${readableShape} `}</Text>
        </>
    );
}

export const actionCreators = {
    switchAutoNextFrame: (autoNextFrame: boolean) => (
        createAction(ReducerActionType.SWITCH_AUTO_NEXT_FRAME, { autoNextFrame })
    ),
    switchAutoSaveOnFinish: () => (
        createAction(ReducerActionType.SWITCH_AUTOSAVE_ON_FINISH)
    ),
    switchCountOfPointsIsPredefined: () => (
        createAction(ReducerActionType.SWITCH_COUNT_OF_POINTS_IS_PREDEFINED)
    ),
    setActiveLabel: (label: Label, type: State['labelType']) => (
        createAction(ReducerActionType.SET_ACTIVE_LABEL, {
            label,
            labelType: type,
        })
    ),
    setNextFrame: (nextFrame: number | null) => (
        createAction(ReducerActionType.SET_NEXT_FRAME, {
            nextFrame,
        })
    ),
    setPointsCount: (pointsCount: number) => (
        createAction(ReducerActionType.SET_POINTS_COUNT, { pointsCount })
    ),
};

interface State {
    autoNextFrame: boolean;
    nextFrame: number | null;
    saveOnFinish: boolean;
    pointsCountIsPredefined: boolean;
    pointsCount: number;
    labels: Label[];
    label: Label | null;
    labelType: Exclude<LabelType, LabelType.TAG | LabelType.SKELETON>;
    initialNavigationType: NavigationType;
}

const reducer = (state: State, action: ActionUnion<typeof actionCreators>): State => {
    const getMinimalPoints = (labelType: LabelType): number => {
        let minimalPoints = 3;
        if (labelType === LabelType.POLYLINE) {
            minimalPoints = 2;
        } else if (labelType === LabelType.POINTS) {
            minimalPoints = 1;
        }

        return minimalPoints;
    };

    if (action.type === ReducerActionType.SWITCH_AUTO_NEXT_FRAME) {
        return {
            ...state,
            autoNextFrame: action.payload.autoNextFrame,
        };
    }

    if (action.type === ReducerActionType.SWITCH_AUTOSAVE_ON_FINISH) {
        return {
            ...state,
            saveOnFinish: !state.saveOnFinish,
        };
    }

    if (action.type === ReducerActionType.SWITCH_COUNT_OF_POINTS_IS_PREDEFINED) {
        return {
            ...state,
            pointsCountIsPredefined: !state.pointsCountIsPredefined,
        };
    }

    if (action.type === ReducerActionType.SET_ACTIVE_LABEL) {
        return {
            ...state,
            label: action.payload.label,
            labelType: action.payload.labelType,
            pointsCount: Math.max(state.pointsCount, getMinimalPoints(action.payload.labelType)),
        };
    }

    if (action.type === ReducerActionType.SET_POINTS_COUNT) {
        return {
            ...state,
            pointsCount: Math.max(action.payload.pointsCount, getMinimalPoints(state.labelType)),
        };
    }

    if (action.type === ReducerActionType.SET_NEXT_FRAME) {
        return {
            ...state,
            nextFrame: action.payload.nextFrame,
        };
    }

    return state;
};

const componentShortcuts = {
    SWITCH_DRAW_MODE_SINGLE_SHAPE: {
        name: 'Draw mode',
        description:
            'Repeat the latest procedure of drawing with the same parameters',
        sequences: ['n'],
        scope: ShortcutScope.SINGLE_SHAPE_ANNOTATION_WORKSPACE,
    },
    CANCEL_SINGLE_SHAPE: {
        name: 'Cancel',
        description: 'Cancel any active canvas mode',
        sequences: ['esc'],
        scope: ShortcutScope.SINGLE_SHAPE_ANNOTATION_WORKSPACE,
    },
    DELETE_OBJECT_SINGLE_SHAPE: {
        name: 'Delete object',
        description: 'Delete an active object. Use shift to force delete of locked objects',
        sequences: ['del', 'shift+del'],
        scope: ShortcutScope.SINGLE_SHAPE_ANNOTATION_WORKSPACE,
    },
    HIDE_MASK_SINGLE_SHAPE: {
        name: 'Hide mask',
        description: 'Hide currently edited mask',
        sequences: ['h'],
        scope: ShortcutScope.SINGLE_SHAPE_ANNOTATION_WORKSPACE,
    },
};

registerComponentShortcuts(componentShortcuts);

function SingleShapeSidebar(): JSX.Element {
    const appDispatch = useDispatch();
    const store = useStore<CombinedState>();
    const {
        isCanvasReady,
        jobInstance,
        frame,
        normalizedKeyMap,
        keyMap,
        defaultLabel,
        defaultPointsCount,
        navigationType,
        annotations,
        activatedStateID,
        editedState,
        activeControl,
        activeObjectHidden,
    } = useSelector((_state: CombinedState) => ({
        isCanvasReady: _state.annotation.canvas.ready,
        jobInstance: _state.annotation.job.instance as Job,
        frame: _state.annotation.player.frame.number,
        normalizedKeyMap: _state.shortcuts.normalizedKeyMap,
        keyMap: _state.shortcuts.keyMap,
        defaultLabel: _state.annotation.job.queryParameters.defaultLabel,
        defaultPointsCount: _state.annotation.job.queryParameters.defaultPointsCount,
        navigationType: _state.annotation.player.navigationType,
        annotations: _state.annotation.annotations.states,
        activatedStateID: _state.annotation.annotations.activatedStateID,
        editedState: _state.annotation.editing.objectState,
        activeControl: _state.annotation.canvas.activeControl,
        activeObjectHidden: _state.annotation.canvas.activeObjectHidden,
    }), shallowEqual);

    const [state, dispatch] = useReducer(reducer, {
        autoNextFrame: true,
        nextFrame: null,
        saveOnFinish: true,
        pointsCountIsPredefined: defaultPointsCount !== null,
        pointsCount: defaultPointsCount ?? 1,
        labels: jobInstance.labels.filter((label) => label.type !== LabelType.TAG && label.type !== LabelType.SKELETON),
        label: null,
        labelType: LabelType.ANY,
        initialNavigationType: navigationType,
    });

    const unmountedRef = useRef(false);
    const savingRef = useRef(false);
    const canvasInitializerRef = useRef<() => void | null>(() => {});
    canvasInitializerRef.current = (): void => {
        const canvas = store.getState().annotation.canvas.instance as Canvas;
        if (isCanvasReady && canvas.mode() !== CanvasMode.DRAW && state.label && state.labelType !== LabelType.ANY) {
            appDispatch(updateActiveControl(
                ShapeTypeToControl[state.labelType],
            ));
            // we remember active object type and active label
            // to assign these values in default drawdone event listener
            appDispatch(rememberObject({
                activeObjectType: ObjectType.SHAPE,
                activeLabelID: state.label.id,
                activeShapeType: labelShapeType(state.label),
            }));

            canvas.draw({
                enabled: true,
                crosshair: true,
                shapeType: state.labelType,
                numberOfPoints: state.pointsCountIsPredefined ? state.pointsCount : undefined,
            });
        }
    };

    const getNextFrame = useCallback(() => {
        if (frame + 1 > jobInstance.stopFrame) {
            dispatch(actionCreators.setNextFrame(null));
            return;
        }

        jobInstance.annotations.search(frame + 1, jobInstance.stopFrame, {
            allowDeletedFrames: false,
            ...(navigationType === NavigationType.EMPTY ? {
                generalFilters: {
                    isEmptyFrame: true,
                },
            } : {}),
        }).then((_frame: number | null) => {
            dispatch(actionCreators.setNextFrame(_frame));
        });
        // implicitly depends on annotations because may use notEmpty filter
    }, [jobInstance, navigationType, frame, annotations]);

    const finishOnThisFrame = useCallback((forceSave = false): void => {
        if (typeof state.nextFrame === 'number') {
            appDispatch(changeFrameAsync(state.nextFrame));
        } else if ((forceSave || state.saveOnFinish) && !savingRef.current) {
            savingRef.current = true;

            appDispatch(finishCurrentJobAsync()).then(() => {
                message.open({
                    duration: 1,
                    type: 'success',
                    content: 'You tagged the job as completed',
                    className: 'cvat-annotation-job-finished-success',
                });
            }).finally(() => {
                appDispatch(setNavigationType(NavigationType.REGULAR));
                dispatch(actionCreators.switchAutoNextFrame(false));
                savingRef.current = false;
            });
        }
    }, [state.saveOnFinish, state.nextFrame, jobInstance]);

    useEffect(() => {
        const defaultLabelInstance = defaultLabel ? state.labels
            .find((_label) => _label.name === defaultLabel) ?? null : null;

        const labelInstance = defaultLabelInstance ?? state.labels[0];
        if (labelInstance) {
            dispatch(actionCreators.setActiveLabel(labelInstance, labelInstance.type as State['labelType']));
        }

        appDispatch(setNavigationType(NavigationType.EMPTY));
        cancelCurrentCanvasOp(store.getState());
        return () => {
            unmountedRef.current = true;
            appDispatch(setNavigationType(state.initialNavigationType));
            cancelCurrentCanvasOp(store.getState());
        };
    }, []);

    useEffect(() => {
        getNextFrame();
    }, [getNextFrame]);

    useEffect(() => {
        // when canvas finishes drawing object it first sends canvas.cancel then it sends canvas.drawn,
        // we do not need onCancel effect to be applied if object is drawn so, we introduce applied flag
        let drawDoneEffectApplied = false;

        const drawnObjects = annotations.filter((_state) => _state.objectType !== ObjectType.TAG);
        const canvas = store.getState().annotation.canvas.instance as Canvas;
        const onDrawDone = (): void => {
            drawDoneEffectApplied = true;
            if (!unmountedRef.current && state.autoNextFrame) {
                setTimeout(finishOnThisFrame, 30);
            }
        };

        const onCancel = (): void => {
            // canvas.drawn should be triggered after canvas.cancel
            // event in a usual scenario (when user drawn something)
            // but there are some cases when only canvas.cancel is triggered (e.g. when drawn shape was not correct)
            // in this case need to re-run drawing process
            setTimeout(() => {
                if (!unmountedRef.current && !drawDoneEffectApplied && !drawnObjects.length) {
                    canvasInitializerRef.current();
                }
            }, 50);
        };

        (canvas as Canvas).html().addEventListener('canvas.drawn', onDrawDone);
        (canvas as Canvas).html().addEventListener('canvas.canceled', onCancel);

        return (() => {
            (canvas as Canvas).html().removeEventListener('canvas.drawn', onDrawDone);
            (canvas as Canvas).html().removeEventListener('canvas.canceled', onCancel);
        });
    }, [finishOnThisFrame, annotations, state.autoNextFrame, state.saveOnFinish]);

    useEffect(() => {
        if (isCanvasReady) {
            const drawnObjects = annotations.filter((_state) => _state.objectType !== ObjectType.TAG);
            cancelCurrentCanvasOp(store.getState());
            if (!drawnObjects.length) {
                canvasInitializerRef.current();
            }
        }
    }, [
        isCanvasReady, annotations,
        state.label, state.labelType,
        state.pointsCount, state.pointsCountIsPredefined,
    ]);

    const siderProps: SiderProps = {
        className: 'cvat-single-shape-annotation-sidebar',
        theme: 'light',
        width: 300,
        collapsedWidth: 0,
        reverseArrow: true,
        collapsible: true,
        trigger: null,
    };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        CANCEL_SINGLE_SHAPE: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            (store.getState().annotation.canvas.instance as Canvas).cancel();
        },
        SWITCH_DRAW_MODE_SINGLE_SHAPE: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            const canvas = store.getState().annotation.canvas.instance as Canvas;
            canvas.draw({ enabled: false });
        },
        DELETE_OBJECT_SINGLE_SHAPE: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            const objectStateToRemove = annotations.find((_state) => _state.clientID === activatedStateID);
            if (objectStateToRemove) {
                appDispatch(removeObjectAsync(objectStateToRemove, event?.shiftKey || false));
            }
        },
        HIDE_MASK_SINGLE_SHAPE: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            if (editedState?.shapeType === ShapeType.MASK || activeControl === ActiveControl.DRAW_MASK) {
                const hide = editedState ? !editedState.hidden : !activeObjectHidden;
                appDispatch(changeHideActiveObjectAsync(hide));
            }
        },
    };

    if (!state.labels.length) {
        return (
            <Layout.Sider {...siderProps}>
                <div className='cvat-single-shape-annotation-sidebar-not-found-wrapper'>
                    <Text strong>No available labels found</Text>
                </div>
            </Layout.Sider>
        );
    }

    const isPolylabel = [LabelType.POINTS, LabelType.POLYGON, LabelType.POLYLINE].includes(state.labelType);
    const withLabelsSelector = state.labels.length > 1;
    const withLabelTypeSelector = state.label && state.label.type === 'any';

    return (
        <Layout.Sider {...siderProps}>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            { state.label !== null && state.labelType !== LabelType.ANY && (
                <Row>
                    <Col>
                        <Alert
                            className='cvat-single-shape-annotation-sidebar-hint'
                            type='info'
                            message={makeMessage(state.label, state.labelType, state.pointsCount)}
                        />
                        <Row justify='start' className='cvat-single-shape-annotation-sidebar-finish-frame-wrapper'>
                            <Col>
                                {typeof state.nextFrame === 'number' ? (
                                    <Button size='large' onClick={() => finishOnThisFrame(false)}>
                                        Skip
                                    </Button>
                                ) : (
                                    <Button size='large' type='primary' onClick={() => finishOnThisFrame(true)}>
                                        Submit Results
                                    </Button>
                                )}
                            </Col>
                        </Row>
                        <Alert
                            type='info'
                            className='cvat-single-shape-annotation-sidebar-ux-hints'
                            message={(
                                <ul>
                                    { typeof state.nextFrame === 'number' ? (
                                        <li>
                                            <Text>
                                                Click
                                                <Text strong>{' Skip '}</Text>
                                                if there is nothing to annotate
                                            </Text>
                                        </li>
                                    ) : (
                                        <li>
                                            <Text>
                                                Click
                                                <Text strong>{' Submit Results '}</Text>
                                                to finish the job
                                            </Text>
                                        </li>
                                    )}
                                    <li>
                                        <Text>
                                            Hold
                                            <Text strong>{' [Alt] '}</Text>
                                            button to avoid drag the image and avoid drawing
                                        </Text>
                                    </li>
                                    <li>
                                        <Text>
                                            Press
                                            <Text strong>{` ${normalizedKeyMap.UNDO} `}</Text>
                                            to undo a created object
                                        </Text>
                                    </li>
                                    { (!isPolylabel || !state.pointsCountIsPredefined || state.pointsCount > 1) && (
                                        <li>
                                            <Text>
                                                Press
                                                <Text strong>
                                                    {` ${
                                                        normalizedKeyMap.CANCEL_SINGLE_SHAPE
                                                    } `}
                                                </Text>
                                                to reset drawing process
                                            </Text>
                                        </li>
                                    ) }

                                    { (isPolylabel && (!state.pointsCountIsPredefined || state.pointsCount > 1)) && (
                                        <li>
                                            <Text>
                                                Press
                                                <Text strong>
                                                    {` ${
                                                        normalizedKeyMap.SWITCH_DRAW_MODE_SINGLE_SHAPE
                                                    } `}
                                                </Text>
                                                to finish drawing process
                                            </Text>
                                        </li>
                                    ) }
                                    { activatedStateID !== null && (
                                        <li>
                                            <Text>
                                                Press
                                                <Text strong>
                                                    {` ${
                                                        normalizedKeyMap.DELETE_OBJECT_SINGLE_SHAPE
                                                    } `}
                                                </Text>
                                                to delete current object
                                            </Text>
                                        </li>
                                    )}
                                </ul>
                            )}
                        />
                    </Col>
                </Row>
            )}
            { withLabelsSelector && (
                <>
                    <Row justify='start' className='cvat-single-shape-annotation-sidebar-label'>
                        <Col>
                            <Text strong>Label selector</Text>
                        </Col>
                    </Row>
                    <Row justify='start' className='cvat-single-shape-annotation-sidebar-label-select'>
                        <Col>
                            <LabelSelector
                                labels={state.labels}
                                value={state.label}
                                onChange={(label) => dispatch(actionCreators.setActiveLabel(label, label.type as State['labelType']))}
                            />
                        </Col>
                    </Row>
                </>
            )}
            { withLabelTypeSelector && (
                <>
                    <Row justify='start' className='cvat-single-shape-annotation-sidebar-label-type'>
                        <Col>
                            <Text strong>Label type selector</Text>
                        </Col>
                    </Row>
                    <Row justify='start' className='cvat-single-shape-annotation-sidebar-label-type-selector'>
                        <Col>
                            <Select
                                value={state.labelType}
                                onChange={(labelType: State['labelType']) => dispatch(
                                    actionCreators.setActiveLabel(state.label as Label, labelType),
                                )}
                            >
                                <Select.Option value={LabelType.RECTANGLE}>{LabelType.RECTANGLE}</Select.Option>
                                <Select.Option value={LabelType.POLYGON}>{LabelType.POLYGON}</Select.Option>
                                <Select.Option value={LabelType.POLYLINE}>{LabelType.POLYLINE}</Select.Option>
                                <Select.Option value={LabelType.POINTS}>{LabelType.POINTS}</Select.Option>
                                <Select.Option value={LabelType.ELLIPSE}>{LabelType.ELLIPSE}</Select.Option>
                                <Select.Option value={LabelType.CUBOID}>{LabelType.CUBOID}</Select.Option>
                                <Select.Option value={LabelType.MASK}>{LabelType.MASK}</Select.Option>
                            </Select>
                        </Col>
                    </Row>
                </>
            )}
            <Row className='cvat-single-shape-annotation-sidebar-auto-next-frame-checkbox'>
                <Col>
                    <Checkbox
                        checked={state.autoNextFrame}
                        onChange={(): void => {
                            (window.document.activeElement as HTMLInputElement)?.blur();
                            dispatch(actionCreators.switchAutoNextFrame(!state.autoNextFrame));
                        }}
                    >
                        Automatically go to the next frame
                    </Checkbox>
                </Col>
            </Row>
            <Row className='cvat-single-shape-annotation-sidebar-auto-save-checkbox'>
                <Col>
                    <Checkbox
                        checked={state.saveOnFinish}
                        onChange={(): void => {
                            (window.document.activeElement as HTMLInputElement)?.blur();
                            dispatch(actionCreators.switchAutoSaveOnFinish());
                        }}
                    >
                        Automatically save when finish
                    </Checkbox>
                </Col>
            </Row>
            <Row className='cvat-single-shape-annotation-sidebar-navigate-empty-checkbox'>
                <Col>
                    <Checkbox
                        checked={navigationType === NavigationType.EMPTY}
                        onChange={(event: CheckboxChangeEvent): void => {
                            (window.document.activeElement as HTMLInputElement)?.blur();
                            if (event.target.checked) {
                                appDispatch(setNavigationType(NavigationType.EMPTY));
                            } else {
                                appDispatch(setNavigationType(NavigationType.REGULAR));
                            }
                        }}
                    >
                        Navigate only empty frames
                    </Checkbox>
                </Col>
            </Row>
            { isPolylabel && (
                <Row className='cvat-single-shape-annotation-sidebar-predefined-pounts-count-checkbox'>
                    <Col>
                        <Checkbox
                            checked={state.pointsCountIsPredefined}
                            onChange={(): void => {
                                (window.document.activeElement as HTMLInputElement)?.blur();
                                dispatch(actionCreators.switchCountOfPointsIsPredefined());
                            }}
                        >
                            Predefined number of points
                        </Checkbox>
                    </Col>
                </Row>
            )}
            { isPolylabel && state.pointsCountIsPredefined ? (
                <>
                    <Row justify='start' className='cvat-single-shape-annotation-sidebar-points-count'>
                        <Col>
                            <Text strong>Number of points</Text>
                        </Col>
                    </Row>
                    <Row justify='start' className='cvat-single-shape-annotation-sidebar-points-count-input'>
                        <Col>
                            <InputNumber
                                value={state.pointsCount}
                                min={1}
                                step={1}
                                onChange={(value: number | null) => {
                                    if (value !== null) {
                                        dispatch(actionCreators.setPointsCount(value));
                                    }
                                }}
                            />
                        </Col>
                    </Row>
                </>
            ) : null }
        </Layout.Sider>
    );
}

export default React.memo(SingleShapeSidebar);
