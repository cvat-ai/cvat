// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import React, {
    useCallback, useEffect, useReducer, useRef,
} from 'react';
import Layout, { SiderProps } from 'antd/lib/layout';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Checkbox from 'antd/lib/checkbox';
import InputNumber from 'antd/lib/input-number';
import Select from 'antd/lib/select';
import Paragraph from 'antd/lib/typography/Paragraph';

import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { getCVATStore } from 'cvat-store';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { CombinedState, Workspace } from 'reducers';
import { changeFrameAsync, changeWorkspace, saveAnnotationsAsync } from 'actions/annotation-actions';
import { Job, Label, LabelType } from 'cvat-core-wrapper';
import { ActionUnion, createAction } from 'utils/redux';
import LabelSelector from 'components/label-selector/label-selector';
import { Button } from 'antd';
import Icon from '@ant-design/icons/lib/components/Icon';
import { NextIcon, PreviousIcon } from 'icons';

const getState = (): CombinedState => getCVATStore().getState();

enum ReducerActionType {
    SWITCH_SIDEBAR_COLLAPSED = 'SWITCH_SIDEBAR_COLLAPSED',
    SWITCH_AUTO_NEXT_FRAME = 'SWITCH_AUTO_NEXT_FRAME',
    SWITCH_AUTOSAVE_ON_FINISH = 'SWITCH_AUTOSAVE_ON_FINISH',
    SWITCH_NAVIGATE_EMPTY_ONLY = 'SWITCH_NAVIGATE_EMPTY_ONLY',
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
    const {
        isCanvasReady,
        jobInstance,
    } = useSelector((_state: CombinedState) => ({
        isCanvasReady: _state.annotation.canvas.ready,
        jobInstance: _state.annotation.job.instance,
    }), shallowEqual);

    const [state, dispatch] = useReducer(reducer, {
        sidebarCollabased: false,
        autoNextFrame: true,
        saveOnFinish: true,
        navigateOnlyEmpty: true,
        pointsCount: 1,
        labels: (jobInstance as Job).labels.filter((label) => label.type !== LabelType.TAG),
        label: (jobInstance as Job).labels[0] || null,
        labelType: (jobInstance as Job).labels[0]?.type || LabelType.ANY,
        frames: [],
    });

    const nextFrame = useCallback((): boolean => {
        const frame = getState().annotation.player.frame.number;
        const next = state.frames.find((_frame) => _frame > frame) || null;
        if (typeof next === 'number') {
            appDispatch(changeFrameAsync(next));
            return true;
        }

        return false;
    }, [state.frames]);

    const prevFrame = useCallback((): boolean => {
        const frame = getState().annotation.player.frame.number;
        const prev = state.frames.findLast((_frame) => _frame < frame) || null;
        if (typeof prev === 'number') {
            appDispatch(changeFrameAsync(prev));
            return true;
        }

        return false;
    }, [state.frames]);

    const canvasInitializerRef = useRef<() => void | null>();
    canvasInitializerRef.current = (): void => {
        const canvas = getState().annotation.canvas.instance as Canvas;
        cancelCurrentCanvasOp(canvas);

        if (isCanvasReady && state.label && state.labelType !== LabelType.ANY) {
            canvas.draw({
                enabled: true,
                shapeType: state.labelType,
                numberOfPoints: state.pointsCount,
                crosshair: true,
            });
        }
    };

    useEffect(() => {
        const canvas = getState().annotation.canvas.instance as Canvas;
        cancelCurrentCanvasOp(canvas);
        return () => {
            cancelCurrentCanvasOp(canvas);
        };
    }, []);

    useEffect(() => {
        if (canvasInitializerRef.current) {
            canvasInitializerRef?.current();
        }
    }, [isCanvasReady, state.label, state.labelType, state.pointsCount]);

    useEffect(() => {
        (async () => {
            const job = jobInstance as Job;
            const framesToBeVisited = [];

            let frame = job.startFrame;
            while (frame !== null) {
                const foundFrame = await job.frames
                    .search({ notDeleted: true }, frame, job.stopFrame);
                if (foundFrame !== null) {
                    framesToBeVisited.push(foundFrame);
                    frame = foundFrame !== job.stopFrame ? foundFrame + 1 : null;
                    if (foundFrame !== job.stopFrame) {
                        frame = foundFrame + 1;
                    }
                }
            }

            dispatch(reducerActions.setFrames(framesToBeVisited));
            if (framesToBeVisited.length) {
                appDispatch(changeFrameAsync(framesToBeVisited[0]));
            }
        })();
    }, [state.navigateOnlyEmpty]);

    useEffect(() => {
        const canvas = getState().annotation.canvas.instance as Canvas;
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

    return (
        <Layout.Sider {...siderProps}>
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
            { state.label && [LabelType.POLYGON, LabelType.POLYLINE, LabelType.POINTS].includes(state.labelType) ? (
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
            <Row className='cvat-single-shape-annotation-sidebar-navigation-block'>
                <Col span={24}>
                    <Button size='large' onClick={prevFrame} icon={<Icon component={PreviousIcon} />}>Previous</Button>
                    <Button size='large' onClick={nextFrame} icon={<Icon component={NextIcon} />}>Next</Button>
                </Col>
            </Row>
            { state.label !== null && state.labelType !== LabelType.ANY && (
                <Row className='cvat-single-shape-annotation-sidebar-hint'>
                    <Col>
                        <hr />
                        <Paragraph type='secondary'>
                            <Text>Annotate</Text>
                            <Text strong>{` ${(state.label as Label).name} `}</Text>
                            <Text>on the image, using</Text>
                            <Text strong>{` ${message} `}</Text>
                        </Paragraph>
                        <hr />
                    </Col>
                </Row>
            )}
        </Layout.Sider>
    );
}

export default React.memo(SingleShapeSidebar);
