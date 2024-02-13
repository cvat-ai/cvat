// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useDispatch, useSelector } from 'react-redux';
import React, { useEffect, useReducer } from 'react';
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

const getState = (): CombinedState => getCVATStore().getState();

enum ReducerActionType {
    SWITCH_SIDEBAR_COLLAPSED = 'SWITCH_SIDEBAR_COLLAPSED',
    SWITCH_AUTO_NEXT_FRAME = 'SWITCH_AUTO_NEXT_FRAME',
    SWITCH_AUTOSAVE_ON_FINISH = 'SWITCH_AUTOSAVE_ON_FINISH',
    SET_ACTIVE_LABEL = 'SET_ACTIVE_LABEL',
    SET_POINTS_COUNT = 'SET_POINTS_COUNT',
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
    setActiveLabel: (label: Label, type?: LabelType) => (
        createAction(ReducerActionType.SET_ACTIVE_LABEL, {
            label,
            labelType: type || label.type,
        })
    ),
    setPointsCount: (pointsCount: number) => (
        createAction(ReducerActionType.SET_POINTS_COUNT, {
            pointsCount,
        })
    ),
};

interface State {
    sidebarCollabased: boolean;
    autoNextFrame: boolean;
    saveOnFinish: boolean;
    pointsCount: number;
    labels: Label[];
    label: Label | null;
    labelType: LabelType;
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

    return state;
};

function cancelCurrentCanvasOp(canvas: Canvas): void {
    if (canvas.mode() !== CanvasMode.IDLE) {
        canvas.cancel();
    }
}

function SingleShapeSidebar(): JSX.Element {
    const appDispatch = useDispatch();
    const isCanvasReady = useSelector((_state: CombinedState) => _state.annotation.canvas.ready);
    const jobInstance = useSelector((_state: CombinedState) => _state.annotation.job.instance);

    const [state, dispatch] = useReducer(reducer, {
        sidebarCollabased: false,
        autoNextFrame: true,
        saveOnFinish: true,
        pointsCount: 1,
        labels: (jobInstance as Job).labels.filter((label) => label.type !== LabelType.TAG),
        label: (jobInstance as Job).labels[0] || null,
        labelType: (jobInstance as Job).labels[0]?.type || LabelType.ANY,
    });

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

    const runDrawing = (): void => {
        const canvas = getState().annotation.canvas.instance;
        canvas?.draw({
            enabled: true,
            shapeType: state.labelType,
            numberOfPoints: state.pointsCount,
            crosshair: true,
        });
    };

    useEffect(() => {
        cancelCurrentCanvasOp(
            getState().annotation.canvas.instance as Canvas,
        );

        if (isCanvasReady && state.label && state.labelType !== LabelType.ANY) {
            runDrawing();
        }
    }, [isCanvasReady, state.label, state.labelType, state.pointsCount]);

    useEffect(() => {
        const canvas = getState().annotation.canvas.instance as Canvas;
        const onDrawDone = (): void => {
            const {
                annotation: {
                    player: {
                        frame: {
                            number: frame,
                        },
                    },
                },
            } = getState();

            const { stopFrame } = jobInstance as Job;
            if (frame < stopFrame) {
                if (state.autoNextFrame) {
                    appDispatch(changeFrameAsync(frame + 1));
                }
            } else {
                appDispatch(changeWorkspace(Workspace.STANDARD));
                if (state.saveOnFinish) {
                    appDispatch(saveAnnotationsAsync());
                }
            }
        };

        cancelCurrentCanvasOp(canvas);
        (canvas as Canvas).html().addEventListener('canvas.drawn', onDrawDone);

        return (() => {
            cancelCurrentCanvasOp(canvas);
            (canvas as Canvas).html().removeEventListener('canvas.drawn', onDrawDone);
        });
    }, []);

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
            { state.label !== null ? (
                <Row className='cvat-single-shape-annotation-sidebar-hint'>
                    <Col>
                        <Paragraph type='secondary'>
                            <Text>Annotate</Text>
                            <Text strong>{` ${(state.label as Label).name} `}</Text>
                            <Text>on the image, using</Text>
                            <Text strong>{` ${message} `}</Text>
                        </Paragraph>
                    </Col>
                </Row>
            ) : (
                <Row className='cvat-single-shape-annotation-sidebar-hint'>
                    <Col>
                        <Text>There are not any labels to annotate</Text>
                    </Col>
                </Row>
            )}
        </Layout.Sider>
    );
}

export default React.memo(SingleShapeSidebar);
