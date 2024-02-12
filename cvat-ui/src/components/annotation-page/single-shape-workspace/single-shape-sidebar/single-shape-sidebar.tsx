// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useReducer, useState } from 'react';
import Layout, { SiderProps } from 'antd/lib/layout';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { getCVATStore } from 'cvat-store';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { CombinedState, ObjectType, ShapeType, Workspace } from 'reducers';
import { useDispatch } from 'react-redux';
import { changeFrameAsync, changeWorkspace, createAnnotationsAsync, saveAnnotationsAsync } from 'actions/annotation-actions';
import { Job, Label, LabelType, getCore } from 'cvat-core-wrapper';
import { useSelector } from 'react-redux';
import { Checkbox, Select } from 'antd';
import { ActionUnion, createAction } from 'utils/redux';
import LabelSelector from 'components/label-selector/label-selector';

enum Mode {
    CONFIGURATION = 'configuration',
    ANNOTATION = 'annotation',
}

const cvat = getCore();

const getState = (): CombinedState => getCVATStore().getState();

enum ReducerActionType {
    SWITCH_SIDEBAR_COLLAPSED = 'SWITCH_SIDEBAR_COLLAPSED',
    SWITCH_AUTO_NEXT_FRAME = 'SWITCH_AUTO_NEXT_FRAME',
    SWITCH_AUTOSAVE_ON_FINISH = 'SWITCH_AUTOSAVE_ON_FINISH',
    UPDATE_ACTIVE_LABEL = 'UPDATE_ACTIVE_LABEL',
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
    setLabel: (label: Label, type?: LabelType) => (
        createAction(ReducerActionType.UPDATE_ACTIVE_LABEL, {
            label,
            labelType: type || label.type,
        })
    ),
};

interface State {
    sidebarCollabased: boolean;
    autoNextFrame: boolean;
    saveOnFinish: boolean;
    shapeType: ShapeType;
    label: Label | null;
    labelType: LabelType;
}

const reducer = (state: State, action: ActionUnion<typeof reducerActions>): State => {
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

    if (action.type === ReducerActionType.UPDATE_ACTIVE_LABEL) {
        return {
            ...state,
            label: action.payload.label,
            labelType: action.payload.label.type,
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
        shapeType: ShapeType.RECTANGLE,
        label: (jobInstance as Job).labels[0] || null,
        labelType: (jobInstance as Job).labels[0]?.type || LabelType.ANY,
    });

    // const [mode, setMode] = useState<Mode>(Mode.ANNOTATION);

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

    // todo: select label if more than one
    // todo: shape type if label is any

    // todo: check deleted frame
    // todo: skip button

    // todo: next frame delay??????//
    // todo: simpler navigation
    // todo: do not annotate if label is "any"?

    const runDrawing = (): void => {
        const canvas = getState().annotation.canvas.instance;
        canvas?.draw({
            enabled: true,
            shapeType: ShapeType.POINTS,
            numberOfPoints: 1,
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
    }, [isCanvasReady, state.label, state.labelType]);

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
                    <Text strong>Select label:</Text>
                </Col>
            </Row>
            <Row justify='start' className='cvat-single-shape-annotation-sidebar-label-select'>
                <Col>
                    <LabelSelector
                        labels={(jobInstance as Job).labels}
                        value={state.label}
                        onChange={(label) => dispatch(reducerActions.setLabel(label))}
                    />
                </Col>
            </Row>
            { state.label && state.labelType === 'any' ? (
                <>
                    <Row justify='start' className='cvat-single-shape-annotation-sidebar-label-type'>
                        <Col>
                            <Text strong>Select label type:</Text>
                        </Col>
                    </Row>
                    <Row justify='start' className='cvat-single-shape-annotation-sidebar-label-type-selector'>
                        <Col>
                            <Select
                                value={state.labelType}
                                onChange={(labelType) => dispatch(
                                    reducerActions.setLabel(state.label as Label, labelType),
                                )}
                            >
                                {Object.keys(LabelType).filter((key) => key !== 'ANY').map((key) => (
                                    <Select.Option key={key} value={key}>{key}</Select.Option>
                                ))}
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
                        Save automatically after finish
                    </Checkbox>
                </Col>
            </Row>
            { state.label !== null ? (
                <Row className='cvat-single-shape-annotation-sidebar-hint'>
                    <Col>
                        <Text>Please, click</Text>
                        <Text strong>{ `${(state.label as Label).name}` }</Text>
                        <Text>on the image</Text>
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
