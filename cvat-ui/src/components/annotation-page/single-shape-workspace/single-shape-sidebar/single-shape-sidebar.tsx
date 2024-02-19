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
import Checkbox from 'antd/lib/checkbox';
import InputNumber from 'antd/lib/input-number';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';
import Alert from 'antd/lib/alert';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import Icon from '@ant-design/icons/lib/components/Icon';

import { NextIcon, PreviousIcon } from 'icons';
import { CombinedState, Workspace } from 'reducers';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { Job, Label, LabelType } from 'cvat-core-wrapper';
import { ActionUnion, createAction } from 'utils/redux';
import { changeFrameAsync, changeWorkspace, saveAnnotationsAsync } from 'actions/annotation-actions';
import LabelSelector from 'components/label-selector/label-selector';

import GlobalHotKeys from 'utils/mousetrap-react';
import CVATTooltip from 'components/common/cvat-tooltip';

enum ReducerActionType {
    SWITCH_SIDEBAR_COLLAPSED = 'SWITCH_SIDEBAR_COLLAPSED',
    SWITCH_AUTO_NEXT_FRAME = 'SWITCH_AUTO_NEXT_FRAME',
    SWITCH_AUTOSAVE_ON_FINISH = 'SWITCH_AUTOSAVE_ON_FINISH',
    SWITCH_NAVIGATE_EMPTY_ONLY = 'SWITCH_NAVIGATE_EMPTY_ONLY',
    SWITCH_COUNT_OF_POINTS_IS_PREDEFINED = 'SWITCH_COUNT_OF_POINTS_IS_PREDEFINED',
    SET_ACTIVE_LABEL = 'SET_ACTIVE_LABEL',
    SET_POINTS_COUNT = 'SET_POINTS_COUNT',
    SET_FRAMES = 'SET_FRAMES',
}

export const reducerActions = {
    switchSidebarCollapsed: () => (
        createAction(ReducerActionType.SWITCH_SIDEBAR_COLLAPSED)
    ),
    switchAutoNextFrame: () => (
        createAction(ReducerActionType.SWITCH_AUTO_NEXT_FRAME)
    ),
    switchAutoSaveOnFinish: () => (
        createAction(ReducerActionType.SWITCH_AUTOSAVE_ON_FINISH)
    ),
    switchNavigateEmptyOnly: () => (
        createAction(ReducerActionType.SWITCH_NAVIGATE_EMPTY_ONLY)
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
    setFrames: (frames: number[]) => (
        createAction(ReducerActionType.SET_FRAMES, { frames })
    ),
};

interface State {
    sidebarCollabased: boolean;
    autoNextFrame: boolean;
    saveOnFinish: boolean;
    navigateOnlyEmpty: boolean;
    pointsCountIsPredefined: boolean;
    pointsCount: number;
    labels: Label[];
    label: Label | null;
    labelType: LabelType;
    frames: number[];
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

    if (action.type === ReducerActionType.SWITCH_SIDEBAR_COLLAPSED) {
        return {
            ...state,
            sidebarCollabased: !state.sidebarCollabased,
        };
    }

    if (action.type === ReducerActionType.SWITCH_AUTO_NEXT_FRAME) {
        return {
            ...state,
            autoNextFrame: !state.autoNextFrame,
        };
    }

    if (action.type === ReducerActionType.SWITCH_NAVIGATE_EMPTY_ONLY) {
        return {
            ...state,
            navigateOnlyEmpty: !state.navigateOnlyEmpty,
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

    if (action.type === ReducerActionType.SET_FRAMES) {
        return {
            ...state,
            frames: action.payload.frames,
        };
    }

    return state;
};

function cancelCurrentCanvasOp(canvas: Canvas): void {
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
    } = useSelector((_state: CombinedState) => ({
        isCanvasReady: _state.annotation.canvas.ready,
        jobInstance: _state.annotation.job.instance as Job,
        frame: _state.annotation.player.frame.number,
        keyMap: _state.shortcuts.keyMap,
        normalizedKeyMap: _state.shortcuts.normalizedKeyMap,
    }), shallowEqual);

    const [state, dispatch] = useReducer(reducer, {
        sidebarCollabased: false,
        autoNextFrame: true,
        saveOnFinish: true,
        navigateOnlyEmpty: true,
        pointsCountIsPredefined: true,
        pointsCount: 1,
        labels: jobInstance.labels.filter((label) => label.type !== LabelType.TAG),
        label: jobInstance.labels[0] || null,
        labelType: jobInstance.labels[0]?.type || LabelType.ANY,
        frames: [],
    });

    const nextFrame = useCallback((): boolean => {
        const next = state.frames.find((_frame) => _frame > frame);
        if (typeof next === 'number') {
            appDispatch(changeFrameAsync(next));
            return true;
        }

        if (state.saveOnFinish) {
            // if the latest image does not have objects to be annotated and user clicks "Next"
            // we should save the job
            appDispatch(changeWorkspace(Workspace.STANDARD));
            appDispatch(saveAnnotationsAsync());
        }

        return false;
    }, [state.frames, state.saveOnFinish, frame]);

    const prevFrame = useCallback((): boolean => {
        const prev = state.frames.findLast((_frame) => _frame < frame);
        if (typeof prev === 'number') {
            appDispatch(changeFrameAsync(prev));
            return true;
        }

        return false;
    }, [state.frames, frame]);

    const canvasInitializerRef = useRef<() => void | null>();
    canvasInitializerRef.current = (): void => {
        const canvas = store.getState().annotation.canvas.instance as Canvas;
        cancelCurrentCanvasOp(canvas);

        if (isCanvasReady && state.label && state.labelType !== LabelType.ANY) {
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
        cancelCurrentCanvasOp(canvas);
        return () => {
            cancelCurrentCanvasOp(canvas);
        };
    }, []);

    useEffect(() => {
        (canvasInitializerRef.current || (() => {}))();
    }, [isCanvasReady, state.label, state.labelType, state.pointsCount, state.pointsCountIsPredefined]);

    useEffect(() => {
        (async () => {
            const framesToBeVisited = [];

            let searchFrom: number | null = jobInstance.startFrame;
            while (searchFrom !== null) {
                const foundFrame: number | null = await jobInstance.annotations.search(
                    searchFrom,
                    jobInstance.stopFrame,
                    {
                        allowDeletedFrames: false,
                        ...(state.navigateOnlyEmpty ? {
                            generalFilters: {
                                isEmptyFrame: true,
                            },
                        } : {}),
                    },
                );

                if (foundFrame !== null) {
                    framesToBeVisited.push(foundFrame);
                    searchFrom = foundFrame < jobInstance.stopFrame ? foundFrame + 1 : null;
                } else {
                    searchFrom = null;
                }
            }

            dispatch(reducerActions.setFrames(framesToBeVisited));
            if (framesToBeVisited.length) {
                appDispatch(changeFrameAsync(framesToBeVisited[0]));
            }
        })();
    }, [state.navigateOnlyEmpty]);

    useEffect(() => {
        const canvas = store.getState().annotation.canvas.instance as Canvas;
        const onDrawDone = (): void => {
            setTimeout(() => {
                if (state.autoNextFrame) {
                    if (!nextFrame()) {
                        appDispatch(changeWorkspace(Workspace.STANDARD));
                        if (state.saveOnFinish) {
                            appDispatch(saveAnnotationsAsync());
                        }
                    }
                } else if (canvasInitializerRef?.current) {
                    canvasInitializerRef.current();
                }
            }, 100);
        };

        (canvas as Canvas).html().addEventListener('canvas.drawn', onDrawDone);
        return (() => {
            (canvas as Canvas).html().removeEventListener('canvas.drawn', onDrawDone);
        });
    }, [nextFrame, state.autoNextFrame, state.saveOnFinish]);

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
        collapsed: state.sidebarCollabased,
    };

    const subKeyMap = {
        CANCEL: keyMap.CANCEL,
        NEXT_FRAME: keyMap.NEXT_FRAME,
        PREV_FRAME: keyMap.PREV_FRAME,
        SWITCH_DRAW_MODE: keyMap.SWITCH_DRAW_MODE,
    };
    const handlers = {
        CANCEL: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            (canvasInitializerRef.current || (() => {}))();
        },
        NEXT_FRAME: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            nextFrame();
        },
        PREV_FRAME: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            prevFrame();
        },
        SWITCH_DRAW_MODE: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            const canvas = store.getState().annotation.canvas.instance as Canvas;
            canvas.draw({ enabled: false });
            (canvasInitializerRef.current || (() => {}))();
        },
    };

    return (
        <Layout.Sider {...siderProps}>
            <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} />
            {/* eslint-disable-next-line */}
            <span
                className={`cvat-objects-sidebar-sider
                    ant-layout-sider-zero-width-trigger
                    ant-layout-sider-zero-width-trigger-left`}
                onClick={() => {
                    dispatch(reducerActions.switchSidebarCollapsed());
                }}
            >
                {state.sidebarCollabased ? <MenuFoldOutlined title='Show' /> : <MenuUnfoldOutlined title='Hide' />}
            </span>
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
                        <Alert
                            type='info'
                            message={(
                                <ul>
                                    <li>
                                        <Text>Click</Text>
                                        <Text strong>{' Next '}</Text>
                                        <Text>if already annotated or there is nothing to be annotated</Text>
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
                                    <li>
                                        <Text>Press</Text>
                                        <Text strong>{` ${normalizedKeyMap.CANCEL} `}</Text>
                                        <Text>to reset drawing process</Text>
                                    </li>
                                    <li>
                                        <Text>Press</Text>
                                        <Text strong>{` ${normalizedKeyMap.SWITCH_DRAW_MODE} `}</Text>
                                        <Text>to finish drawing process</Text>
                                    </li>
                                </ul>
                            )}
                        />
                    </Col>
                </Row>
            )}
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
            { state.label && state.label.type === 'any' ? (
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
                                <Select value={LabelType.RECTANGLE}>{LabelType.RECTANGLE}</Select>
                                <Select value={LabelType.POLYGON}>{LabelType.POLYGON}</Select>
                                <Select value={LabelType.POLYLINE}>{LabelType.POLYLINE}</Select>
                                <Select value={LabelType.POINTS}>{LabelType.POINTS}</Select>
                                <Select value={LabelType.ELLIPSE}>{LabelType.ELLIPSE}</Select>
                                <Select value={LabelType.CUBOID}>{LabelType.CUBOID}</Select>
                                <Select value={LabelType.MASK}>{LabelType.MASK}</Select>
                                <Select value={LabelType.SKELETON}>{LabelType.SKELETON}</Select>
                            </Select>
                        </Col>
                    </Row>
                </>
            ) : null }
            <Row className='cvat-single-shape-annotation-sidebar-auto-next-frame-checkbox'>
                <Col>
                    <Checkbox
                        checked={state.autoNextFrame}
                        onChange={(): void => {
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
                            dispatch(reducerActions.switchAutoSaveOnFinish());
                        }}
                    >
                        Automatically save after the latest frame
                    </Checkbox>
                </Col>
            </Row>
            <Row className='cvat-single-shape-annotation-sidebar-navigate-empty-checkbox'>
                <Col>
                    <Checkbox
                        checked={state.navigateOnlyEmpty}
                        onChange={(): void => {
                            dispatch(reducerActions.switchNavigateEmptyOnly());
                        }}
                    >
                        Navigate only empty frames
                    </Checkbox>
                </Col>
            </Row>
            <Row className='cvat-single-shape-annotation-sidebar-predefined-pounts-count-checkbox'>
                <Col>
                    <Checkbox
                        checked={state.pointsCountIsPredefined}
                        onChange={(): void => {
                            dispatch(reducerActions.switchCountOfPointsIsPredefined());
                        }}
                    >
                        Predefined number of points
                    </Checkbox>
                </Col>
            </Row>
            { state.label &&
                [LabelType.POLYGON, LabelType.POLYLINE, LabelType.POINTS].includes(state.labelType) &&
                state.pointsCountIsPredefined ? (
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
            <Row className='cvat-single-shape-annotation-sidebar-navigation-block'>
                <Col span={24}>
                    <CVATTooltip title={`Previous frame ${normalizedKeyMap.PREV_FRAME}`}>
                        <Button
                            disabled={state.frames.length === 0 || state.frames[0] >= frame}
                            size='large'
                            onClick={prevFrame}
                            icon={<Icon component={PreviousIcon} />}
                        >
                            Previous
                        </Button>
                    </CVATTooltip>
                    <CVATTooltip title={`Next frame ${normalizedKeyMap.NEXT_FRAME}`}>
                        <Button
                            // allow clicking the button even if this is latest frame
                            // if automatic saving at the end is enabled
                            // e.g. when the latest frame does not contain objects to be annotated
                            disabled={state.frames.length === 0 ||
                                (
                                    !state.saveOnFinish &&
                                    !jobInstance.annotations.hasUnsavedChanges() &&
                                    state.frames[state.frames.length - 1] <= frame
                                )}
                            size='large'
                            onClick={nextFrame}
                            icon={<Icon component={NextIcon} />}
                        >
                            Next
                        </Button>
                    </CVATTooltip>
                </Col>
            </Row>
        </Layout.Sider>
    );
}

export default React.memo(SingleShapeSidebar);
