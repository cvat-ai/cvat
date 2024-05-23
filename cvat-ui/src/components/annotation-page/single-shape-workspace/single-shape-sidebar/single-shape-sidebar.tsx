// Copyright (C) 2024 CVAT.ai Corporation
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
import Modal from 'antd/lib/modal';
import Button from 'antd/lib/button';

import { CombinedState, NavigationType, ObjectType } from 'reducers';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import {
    Job, JobState, Label, LabelType,
} from 'cvat-core-wrapper';
import { ActionUnion, createAction } from 'utils/redux';
import {
    rememberObject, changeFrameAsync, saveAnnotationsAsync, setNavigationType,
} from 'actions/annotation-actions';
import LabelSelector from 'components/label-selector/label-selector';
import GlobalHotKeys from 'utils/mousetrap-react';

enum ReducerActionType {
    SWITCH_AUTO_NEXT_FRAME = 'SWITCH_AUTO_NEXT_FRAME',
    SWITCH_AUTOSAVE_ON_FINISH = 'SWITCH_AUTOSAVE_ON_FINISH',
    SWITCH_COUNT_OF_POINTS_IS_PREDEFINED = 'SWITCH_COUNT_OF_POINTS_IS_PREDEFINED',
    SET_ACTIVE_LABEL = 'SET_ACTIVE_LABEL',
    SET_POINTS_COUNT = 'SET_POINTS_COUNT',
}

export const reducerActions = {
    switchAutoNextFrame: () => (
        createAction(ReducerActionType.SWITCH_AUTO_NEXT_FRAME)
    ),
    switchAutoSaveOnFinish: () => (
        createAction(ReducerActionType.SWITCH_AUTOSAVE_ON_FINISH)
    ),
    switchCountOfPointsIsPredefined: () => (
        createAction(ReducerActionType.SWITCH_COUNT_OF_POINTS_IS_PREDEFINED)
    ),
    setActiveLabel: (label: Label, type?: LabelType) => (
        createAction(ReducerActionType.SET_ACTIVE_LABEL, {
            label,
            labelType: type || label.type,
        })
    ),
    setPointsCount: (pointsCount: number) => (
        createAction(ReducerActionType.SET_POINTS_COUNT, { pointsCount })
    ),
};

interface State {
    autoNextFrame: boolean;
    saveOnFinish: boolean;
    pointsCountIsPredefined: boolean;
    pointsCount: number;
    labels: Label[];
    label: Label | null;
    labelType: LabelType;
    initialNavigationType: NavigationType;
}

const reducer = (state: State, action: ActionUnion<typeof reducerActions>): State => {
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
            autoNextFrame: !state.autoNextFrame,
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

    return state;
};

function cancelCurrentCanvasOp(state: CombinedState): void {
    const canvas = state.annotation.canvas.instance as Canvas;
    if (canvas.mode() !== CanvasMode.IDLE) {
        canvas.cancel();
    }
}

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
    } = useSelector((_state: CombinedState) => ({
        isCanvasReady: _state.annotation.canvas.ready,
        jobInstance: _state.annotation.job.instance as Job,
        frame: _state.annotation.player.frame.number,
        keyMap: _state.shortcuts.keyMap,
        normalizedKeyMap: _state.shortcuts.normalizedKeyMap,
        defaultLabel: _state.annotation.job.queryParameters.defaultLabel,
        defaultPointsCount: _state.annotation.job.queryParameters.defaultPointsCount,
        navigationType: _state.annotation.player.navigationType,
    }), shallowEqual);

    const [state, dispatch] = useReducer(reducer, {
        autoNextFrame: true,
        saveOnFinish: true,
        pointsCountIsPredefined: true,
        pointsCount: defaultPointsCount || 1,
        labels: jobInstance.labels.filter((label) => label.type !== LabelType.TAG && label.type !== LabelType.SKELETON),
        label: null,
        labelType: LabelType.ANY,
        initialNavigationType: navigationType,
    });

    const savingRef = useRef(false);
    const nextFrame = useCallback((): void => {
        let promise = Promise.resolve(null);
        if (frame < jobInstance.stopFrame) {
            promise = jobInstance.annotations.search(frame + 1, jobInstance.stopFrame, {
                allowDeletedFrames: false,
                ...(navigationType === NavigationType.EMPTY ? {
                    generalFilters: {
                        isEmptyFrame: true,
                    },
                } : {}),
            });
        }

        promise.then((foundFrame: number | null) => {
            if (typeof foundFrame === 'number') {
                appDispatch(changeFrameAsync(foundFrame));
            } else if (state.saveOnFinish && !savingRef.current) {
                Modal.confirm({
                    title: 'You finished the job',
                    content: 'Please, confirm further action',
                    cancelText: 'Stay on the page',
                    okText: 'Submit results',
                    className: 'cvat-single-shape-annotation-submit-job-modal',
                    onOk: () => {
                        function reset(): void {
                            savingRef.current = false;
                        }

                        function showSubmittedInfo(): void {
                            Modal.info({
                                closable: false,
                                title: 'Annotations submitted',
                                content: 'You may close the window',
                                className: 'cvat-single-shape-annotation-submit-success-modal',
                            });
                        }

                        savingRef.current = true;
                        if (jobInstance.annotations.hasUnsavedChanges()) {
                            appDispatch(saveAnnotationsAsync(() => {
                                jobInstance.state = JobState.COMPLETED;
                                jobInstance.save().then(showSubmittedInfo).finally(reset);
                            })).catch(reset);
                        } else {
                            jobInstance.state = JobState.COMPLETED;
                            jobInstance.save().then(showSubmittedInfo).finally(reset);
                        }
                    },
                });
            }
        });
    }, [state.saveOnFinish, frame, jobInstance, navigationType]);

    const canvasInitializerRef = useRef<() => void | null>(() => {});
    canvasInitializerRef.current = (): void => {
        const canvas = store.getState().annotation.canvas.instance as Canvas;
        if (isCanvasReady && canvas.mode() !== CanvasMode.DRAW && state.label && state.labelType !== LabelType.ANY) {
            appDispatch(rememberObject({
                activeLabelID: state.label.id,
                activeObjectType: ObjectType.SHAPE,
            }));

            canvas.draw({
                enabled: true,
                shapeType: state.labelType,
                numberOfPoints: state.pointsCountIsPredefined ? state.pointsCount : undefined,
                crosshair: true,
            });
        }
    };

    useEffect(() => {
        const canvas = store.getState().annotation.canvas.instance as Canvas;
        const onDrawDone = (): void => {
            setTimeout(() => {
                if (state.autoNextFrame) {
                    nextFrame();
                } else {
                    canvasInitializerRef.current();
                }
            }, 100);
        };

        const onCancel = (): void => {
            // canvas.drawn should be triggered after canvas.cancel
            // event in a usual scenario (when user drawn something)
            // but there are some cases when only canvas.cancel is triggered (e.g. when drawn shape was not correct)
            // in this case need to re-run drawing process
            setTimeout(() => {
                canvasInitializerRef.current();
            });
        };

        (canvas as Canvas).html().addEventListener('canvas.drawn', onDrawDone);
        (canvas as Canvas).html().addEventListener('canvas.canceled', onCancel);
        return (() => {
            // should stay prior mount useEffect to remove event handlers before final cancel() is called

            (canvas as Canvas).html().removeEventListener('canvas.drawn', onDrawDone);
            (canvas as Canvas).html().removeEventListener('canvas.canceled', onCancel);
        });
    }, [nextFrame, state.autoNextFrame, state.saveOnFinish]);

    useEffect(() => {
        const labelInstance = (defaultLabel ? jobInstance.labels
            .find((_label) => _label.name === defaultLabel) : state.labels[0] || null);
        if (labelInstance) {
            dispatch(reducerActions.setActiveLabel(labelInstance));
        }

        appDispatch(setNavigationType(NavigationType.EMPTY));
        cancelCurrentCanvasOp(store.getState());
        return () => {
            appDispatch(setNavigationType(state.initialNavigationType));
            cancelCurrentCanvasOp(store.getState());
        };
    }, []);

    useEffect(() => {
        cancelCurrentCanvasOp(store.getState());
        canvasInitializerRef.current();
    }, [isCanvasReady, state.label, state.labelType, state.pointsCount, state.pointsCountIsPredefined]);

    let message = '';
    if (state.labelType === LabelType.POINTS) {
        message = `${state.pointsCount === 1 ? 'one point' : `${state.pointsCount} points`}`;
    } else {
        message = `${state.labelType === LabelType.ELLIPSE ? 'an ellipse' : `a ${state.labelType}`}`;
    }

    const siderProps: SiderProps = {
        className: 'cvat-single-shape-annotation-sidebar',
        theme: 'light',
        width: 300,
        collapsedWidth: 0,
        reverseArrow: true,
        collapsible: true,
        trigger: null,
    };

    const subKeyMap = {
        CANCEL: keyMap.CANCEL,
        SWITCH_DRAW_MODE: keyMap.SWITCH_DRAW_MODE,
    };

    const handlers = {
        CANCEL: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            (store.getState().annotation.canvas.instance as Canvas).cancel();
        },
        SWITCH_DRAW_MODE: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            const canvas = store.getState().annotation.canvas.instance as Canvas;
            canvas.draw({ enabled: false });
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
            <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} />
            { state.label !== null && state.labelType !== LabelType.ANY && (
                <Row>
                    <Col>
                        <Alert
                            className='cvat-single-shape-annotation-sidebar-hint'
                            type='info'
                            message={(
                                <>
                                    <Text>Annotate</Text>
                                    <Text strong>{` ${(state.label as Label).name} `}</Text>
                                    <Text>on the image, using</Text>
                                    <Text strong>{` ${message} `}</Text>
                                </>
                            )}
                        />
                        <Row justify='start' className='cvat-single-shape-annotation-sidebar-skip-wrapper'>
                            <Col>
                                <Button
                                    size='large'
                                    onClick={() => {
                                        savingRef.current = false;
                                        nextFrame();
                                    }}
                                >
                                    Skip
                                </Button>
                            </Col>
                        </Row>
                        <Alert
                            type='info'
                            className='cvat-single-shape-annotation-sidebar-ux-hints'
                            message={(
                                <ul>
                                    <li>
                                        <Text>Click</Text>
                                        <Text strong>{' Skip '}</Text>
                                        <Text>if there is nothing to annotate</Text>
                                    </li>
                                    <li>
                                        <Text>Hold</Text>
                                        <Text strong>{' [Alt] '}</Text>
                                        <Text>button to avoid drawing on click</Text>
                                    </li>
                                    <li>
                                        <Text>Press</Text>
                                        <Text strong>{` ${normalizedKeyMap.UNDO} `}</Text>
                                        <Text>to undo a created object</Text>
                                    </li>
                                    { (!isPolylabel || !state.pointsCountIsPredefined || state.pointsCount > 1) && (
                                        <li>
                                            <Text>Press</Text>
                                            <Text strong>{` ${normalizedKeyMap.CANCEL} `}</Text>
                                            <Text>to reset drawing process</Text>
                                        </li>
                                    ) }

                                    { (isPolylabel && (!state.pointsCountIsPredefined || state.pointsCount > 1)) && (
                                        <li>
                                            <Text>Press</Text>
                                            <Text strong>{` ${normalizedKeyMap.SWITCH_DRAW_MODE} `}</Text>
                                            <Text>to finish drawing process</Text>
                                        </li>
                                    ) }
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
                                onChange={(label) => dispatch(reducerActions.setActiveLabel(label))}
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
                                onChange={(labelType: LabelType) => dispatch(
                                    reducerActions.setActiveLabel(state.label as Label, labelType),
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
                            dispatch(reducerActions.switchAutoNextFrame());
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
                            dispatch(reducerActions.switchAutoSaveOnFinish());
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
                                dispatch(reducerActions.switchCountOfPointsIsPredefined());
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
                                        dispatch(reducerActions.setPointsCount(value));
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
