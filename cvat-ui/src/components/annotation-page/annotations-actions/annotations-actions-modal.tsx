// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, {
    useEffect, useReducer, useRef, useState,
} from 'react';
import Button from 'antd/lib/button';
import { Col, Row } from 'antd/lib/grid';
import Progress from 'antd/lib/progress';
import Select from 'antd/lib/select';
import notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';

import config from 'config';
import { useIsMounted } from 'utils/hooks';
import { createAction, ActionUnion } from 'utils/redux';
import { getCVATStore } from 'cvat-store';
import { BaseSingleFrameAction, Job, getCore } from 'cvat-core-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';
import { fetchAnnotationsAsync, saveAnnotationsAsync } from 'actions/annotation-actions';
import { switchAutoSave } from 'actions/settings-actions';
import { Alert, InputNumber } from 'antd';
import { clamp } from 'utils/math';

const core = getCore();

interface State {
    actions: BaseSingleFrameAction[];
    activeAction: BaseSingleFrameAction | null;
    fetching: boolean;
    progress: number | null;
    progressMessage: string | null;
    cancelled: boolean;
    autoSaveEnabled: boolean;
    jobHasBeenSaved: boolean;
    frameFrom: number;
    frameTo: number;
    actionParameters: Record<string, string>;
    modalVisible: boolean;
}

enum ReducerActionType {
    SET_ANNOTATIONS_ACTIONS = 'SET_ANNOTATIONS_ACTIONS',
    SET_ACTIVE_ANNOTATIONS_ACTION = 'SET_ACTIVE_ANNOTATIONS_ACTION',
    UPDATE_PROGRESS = 'UPDATE_PROGRESS',
    RESET_BEFORE_RUN = 'RESET_BEFORE_RUN',
    RESET_AFTER_RUN = 'RESET_AFTER_RUN',
    CANCEL_ACTION = 'CANCEL_ACTION',
    SET_AUTOSAVE_DISABLED_FLAG = 'SET_AUTOSAVE_DISABLED_FLAG',
    SET_JOB_WAS_SAVED_FLAG = 'SET_JOB_WAS_SAVED_FLAG',
    UPDATE_FRAME_FROM = 'UPDATE_FRAME_FROM',
    UPDATE_FRAME_TO = 'UPDATE_FRAME_TO',
    UPDATE_ACTION_PARAMETER = 'UPDATE_ACTION_PARAMETER',
    SET_VISIBLE = 'SET_VISIBLE',
}

export const reducerActions = {
    setAnnotationsActions: (actions: BaseSingleFrameAction[]) => (
        createAction(ReducerActionType.SET_ANNOTATIONS_ACTIONS, { actions })
    ),
    setActiveAnnotationsAction: (activeAction: BaseSingleFrameAction) => (
        createAction(ReducerActionType.SET_ACTIVE_ANNOTATIONS_ACTION, { activeAction })
    ),
    updateProgress: (progress: number | null, progressMessage: string | null) => (
        createAction(ReducerActionType.UPDATE_PROGRESS, { progress, progressMessage })
    ),
    resetBeforeRun: () => (
        createAction(ReducerActionType.RESET_BEFORE_RUN)
    ),
    resetAfterRun: () => (
        createAction(ReducerActionType.RESET_AFTER_RUN)
    ),
    cancelAction: () => (
        createAction(ReducerActionType.CANCEL_ACTION)
    ),
    setAutoSaveDisabledFlag: () => (
        createAction(ReducerActionType.SET_AUTOSAVE_DISABLED_FLAG)
    ),
    setJobSavedFlag: (jobHasBeenSaved: boolean) => (
        createAction(ReducerActionType.SET_JOB_WAS_SAVED_FLAG, { jobHasBeenSaved })
    ),
    updateFrameFrom: (frameFrom: number) => (
        createAction(ReducerActionType.UPDATE_FRAME_FROM, { frameFrom })
    ),
    updateFrameTo: (frameTo: number) => (
        createAction(ReducerActionType.UPDATE_FRAME_TO, { frameTo })
    ),
    updateActionParameter: (name: string, value: string) => (
        createAction(ReducerActionType.UPDATE_ACTION_PARAMETER, { name, value })
    ),
    setVisible: (visible: boolean) => (
        createAction(ReducerActionType.SET_VISIBLE, { visible })
    ),
};

const reducer = (state: State, action: ActionUnion<typeof reducerActions>): State => {
    if (action.type === ReducerActionType.SET_ANNOTATIONS_ACTIONS) {
        return {
            ...state,
            actions: action.payload.actions,
            activeAction: action.payload.actions[0] || null,
            actionParameters: {},
        };
    }

    if (action.type === ReducerActionType.SET_ACTIVE_ANNOTATIONS_ACTION) {
        return {
            ...state,
            activeAction: action.payload.activeAction,
            actionParameters: {},
        };
    }

    if (action.type === ReducerActionType.UPDATE_PROGRESS) {
        return {
            ...state,
            progress: action.payload.progress,
            progressMessage: action.payload.progressMessage,
        };
    }

    if (action.type === ReducerActionType.RESET_BEFORE_RUN) {
        return {
            ...state,
            fetching: true,
            cancelled: false,
        };
    }

    if (action.type === ReducerActionType.RESET_AFTER_RUN) {
        return {
            ...state,
            fetching: false,
            cancelled: false,
            progress: null,
            progressMessage: null,
        };
    }

    if (action.type === ReducerActionType.CANCEL_ACTION) {
        return {
            ...state,
            cancelled: true,
        };
    }

    if (action.type === ReducerActionType.SET_AUTOSAVE_DISABLED_FLAG) {
        return {
            ...state,
            autoSaveEnabled: false,
        };
    }

    if (action.type === ReducerActionType.SET_JOB_WAS_SAVED_FLAG) {
        return {
            ...state,
            jobHasBeenSaved: action.payload.jobHasBeenSaved,
        };
    }

    if (action.type === ReducerActionType.UPDATE_FRAME_FROM) {
        return {
            ...state,
            frameFrom: action.payload.frameFrom,
            frameTo: Math.max(state.frameTo, action.payload.frameFrom),
        };
    }

    if (action.type === ReducerActionType.UPDATE_FRAME_TO) {
        return {
            ...state,
            frameFrom: Math.min(state.frameFrom, action.payload.frameTo),
            frameTo: action.payload.frameTo,
        };
    }

    if (action.type === ReducerActionType.UPDATE_ACTION_PARAMETER) {
        return {
            ...state,
            actionParameters: {
                ...state.actionParameters,
                [action.payload.name]: action.payload.value,
            },
        };
    }

    if (action.type === ReducerActionType.SET_VISIBLE) {
        return {
            ...state,
            modalVisible: action.payload.visible,
        };
    }

    return state;
};

type Props = NonNullable<BaseSingleFrameAction['parameters']>[keyof BaseSingleFrameAction['parameters']];

function ActionParameterComponent(props: Props & { onChange: (value: string) => void }): JSX.Element {
    const {
        defaultValue, type, values, onChange,
    } = props;
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        onChange(value);
    }, [value]);

    if (type === 'select') {
        return (
            <Select value={value} onChange={setValue}>
                {values.map((_value: string) => (
                    <Select.Option key={_value} value={_value}>{_value}</Select.Option>
                ))}
            </Select>
        );
    }

    const [min, max, step] = values.map((val) => +val);
    return (
        <InputNumber
            value={+value}
            min={min}
            max={max}
            step={step}
            onChange={(_value: number | null) => {
                if (typeof _value === 'number') {
                    if (Number.isInteger(step)) {
                        const updated = _value - (_value % step);
                        setValue(`${clamp(updated, min, max)}`);
                    } else {
                        setValue(`${clamp(_value, min, max)}`);
                    }
                }
            }}
        />
    );
}

function AnnotationsActionsModalContent(props: { onClose: () => void; }): JSX.Element {
    const { onClose } = props;
    const isMounted = useIsMounted();
    const storage = getCVATStore();
    const cancellationRef = useRef<boolean>(false);
    const jobInstance = storage.getState().annotation.job.instance as Job;

    const [state, dispatch] = useReducer(reducer, {
        actions: [],
        fetching: false,
        activeAction: null,
        progress: null,
        progressMessage: null,
        cancelled: false,
        autoSaveEnabled: storage.getState().settings.workspace.autoSave,
        jobHasBeenSaved: true,
        frameFrom: jobInstance.startFrame,
        frameTo: jobInstance.stopFrame,
        actionParameters: {},
        modalVisible: true,
    });

    useEffect(() => {
        core.actions.list().then((list: BaseSingleFrameAction[]) => {
            if (isMounted()) {
                dispatch(reducerActions.setJobSavedFlag(!jobInstance.annotations.hasUnsavedChanges()));
                dispatch(reducerActions.setAnnotationsActions(list));
            }
        });
    }, []);

    const {
        actions, activeAction, fetching, autoSaveEnabled, jobHasBeenSaved,
        progress, progressMessage, frameFrom, frameTo, actionParameters, modalVisible,
    } = state;

    return (
        <Modal
            closable={false}
            width={640}
            open={modalVisible}
            destroyOnClose
            footer={null}
            afterClose={onClose}
            className='cvat-action-runner-content'
        >
            <Row>
                <Col span={24} className='cvat-action-runner-info'>
                    <Alert
                        message={(
                            <div>
                                <Text>Actions allow executing certain algorithms on </Text>
                                <Text strong>
                                    <a
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        href={config.FILTERS_GUIDE_URL}
                                    >
                                        filtered
                                    </a>
                                </Text>
                                <Text> annotations. </Text>
                                <Text strong>It affects only the local browser state. </Text>
                                <Text>Once an action has finished, </Text>
                                <Text strong>it cannot be reverted. </Text>
                                <Text>You may reload the page to get annotations from the server. </Text>
                                <Text strong>It is strongly recommended to review the changes </Text>
                                <Text strong>before saving annotations to the server. </Text>
                            </div>
                        )}
                        type='info'
                        showIcon
                    />
                </Col>

                {!jobHasBeenSaved ? (
                    <Col span={24} className='cvat-action-runner-info'>
                        <Alert
                            message={(
                                <>
                                    <Text strong>Recommendation: </Text>
                                    <Button
                                        className='cvat-action-runner-save-job-recommendation'
                                        type='link'
                                        onClick={() => {
                                            storage.dispatch(
                                                saveAnnotationsAsync(() => {
                                                    dispatch(reducerActions.setJobSavedFlag(true));
                                                }),
                                            );
                                        }}
                                    >
                                        Click to save the job
                                    </Button>
                                </>
                            )}
                            type='warning'
                            showIcon
                        />
                    </Col>
                ) : null}

                {autoSaveEnabled ? (
                    <Col span={24} className='cvat-action-runner-info'>
                        <Alert
                            message={(
                                <>
                                    <Text strong>Recommendation: </Text>
                                    <Button
                                        className='cvat-action-runner-disable-autosave-recommendation'
                                        type='link'
                                        onClick={() => {
                                            storage.dispatch(switchAutoSave(false));
                                            dispatch(reducerActions.setAutoSaveDisabledFlag());
                                        }}
                                    >
                                        Click to disable automatic saving
                                    </Button>
                                </>
                            )}
                            type='warning'
                            showIcon
                        />
                    </Col>
                ) : null}

                <Col span={24} className='cvat-action-runner-list'>
                    <Row>
                        <Col span={24}>
                            <Text strong className='cvat-text-color'>1. Select action</Text>
                            <hr />
                        </Col>
                        <Col span={24}>
                            <Select
                                value={activeAction?.name}
                                onChange={(newActiveActionName: string) => {
                                    const newActiveAction = actions
                                        .find((action) => action.name === newActiveActionName);
                                    if (newActiveAction) {
                                        dispatch(reducerActions.setActiveAnnotationsAction(newActiveAction));
                                    }
                                }}
                            >
                                {actions.map(
                                    (annotationFunction: BaseSingleFrameAction): JSX.Element => (
                                        <Select.Option
                                            value={annotationFunction.name}
                                            title={annotationFunction.name}
                                            key={annotationFunction.name}
                                        >
                                            {annotationFunction.name}
                                        </Select.Option>
                                    ),
                                )}
                            </Select>
                        </Col>
                    </Row>
                </Col>

                {activeAction ? (
                    <>
                        <Col span={24} className='cvat-action-runner-frames'>
                            <Row>
                                <Col span={24}>
                                    <Text strong>2. Specify frames to apply the action </Text>
                                    <hr />
                                </Col>
                                <Col span={24}>
                                    <Text> Starting from frame </Text>
                                    <InputNumber
                                        value={frameFrom}
                                        min={(jobInstance as Job).startFrame}
                                        max={frameTo}
                                        step={1}
                                        onChange={(value) => {
                                            if (typeof value === 'number') {
                                                dispatch(reducerActions.updateFrameFrom(
                                                    clamp(Math.round(value), (jobInstance as Job).startFrame, frameTo),
                                                ));
                                            }
                                        }}
                                    />
                                    <Text> up to frame </Text>
                                    <InputNumber
                                        value={frameTo}
                                        min={frameFrom}
                                        max={(jobInstance as Job).stopFrame}
                                        step={1}
                                        onChange={(value) => {
                                            if (typeof value === 'number') {
                                                dispatch(reducerActions.updateFrameTo(
                                                    clamp(Math.round(value), frameFrom, (jobInstance as Job).stopFrame),
                                                ));
                                            }
                                        }}
                                    />
                                </Col>
                            </Row>
                        </Col>
                        <Col span={24} className='cvat-action-runner-frames-predefined'>
                            <Row>
                                <Col span={24}>
                                    <Text strong>Or choose one of predefined options </Text>
                                    <hr />
                                </Col>
                                <Col span={24}>
                                    <Button
                                        onClick={() => {
                                            const current = storage.getState().annotation.player.frame.number;
                                            dispatch(reducerActions.updateFrameFrom(current));
                                            dispatch(reducerActions.updateFrameTo(current));
                                        }}
                                    >
                                        Current frame
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            dispatch(reducerActions.updateFrameFrom(jobInstance.startFrame));
                                            dispatch(reducerActions.updateFrameTo(jobInstance.stopFrame));
                                        }}
                                    >
                                        All frames
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            const current = storage.getState().annotation.player.frame.number;
                                            dispatch(reducerActions.updateFrameFrom(current));
                                            dispatch(reducerActions.updateFrameTo(jobInstance.stopFrame));
                                        }}
                                    >
                                        From current
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            const current = storage.getState().annotation.player.frame.number;
                                            dispatch(reducerActions.updateFrameFrom(jobInstance.startFrame));
                                            dispatch(reducerActions.updateFrameTo(current));
                                        }}
                                    >
                                        Up to current
                                    </Button>
                                </Col>
                            </Row>
                        </Col>
                    </>
                ) : null}

                {activeAction?.parameters ? (
                    <Col span={24} className='cvat-action-runner-action-parameters'>
                        <Row>
                            <Col span={24}>
                                <Text strong>3. Setup action parameters </Text>
                                <hr />
                            </Col>
                            {Object.entries(activeAction.parameters)
                                .map(([name, { defaultValue, type, values }], idx) => (
                                    <Col key={idx} span={24} className='cvat-action-runner-action-parameter'>
                                        <Text>{name}</Text>
                                        <ActionParameterComponent
                                            onChange={(value: string) => {
                                                dispatch(reducerActions.updateActionParameter(name, value));
                                            }}
                                            defaultValue={defaultValue}
                                            type={type}
                                            values={values}
                                        />
                                    </Col>
                                ))}
                        </Row>
                    </Col>
                ) : null}

                {fetching && typeof progress === 'number' && (
                    <Col span={24}>
                        <Progress percent={progress} className='cvat-action-runner-progress' />
                        { progressMessage ? (
                            <Text className='cvat-action-runner-progress-message'>{progressMessage}</Text>
                        ) : null }

                    </Col>
                )}

                <Col span={24} className='cvat-action-runner-buttons'>
                    <Button
                        className='cvat-action-runner-cancel-btn'
                        loading={state.cancelled}
                        onClick={() => {
                            if (fetching) {
                                dispatch(reducerActions.cancelAction());
                                cancellationRef.current = true;
                            } else {
                                dispatch(reducerActions.setVisible(false));
                            }
                        }}
                    >
                        { fetching ? 'Cancel' : 'Close'}
                    </Button>
                    <Button
                        className='cvat-action-runner-run-btn'
                        type='primary'
                        loading={fetching}
                        disabled={!activeAction || fetching}
                        onClick={() => {
                            const appState = storage.getState();
                            const canvasInstance = appState.annotation.canvas.instance as Canvas;
                            const frameData = appState.annotation.player.frame.data;

                            if (activeAction) {
                                cancellationRef.current = false;
                                dispatch(reducerActions.resetBeforeRun());

                                core.actions.run(
                                    jobInstance,
                                    [activeAction],
                                    [actionParameters],
                                    frameFrom,
                                    frameTo,
                                    storage.getState().annotation.annotations.filters,
                                    (_message: string, _progress: number) => {
                                        if (isMounted()) {
                                            dispatch(reducerActions.updateProgress(_progress, _message));
                                        }
                                    },
                                    () => cancellationRef.current,
                                ).then(() => {
                                    if (!cancellationRef.current) {
                                        canvasInstance.setup(frameData, []);
                                        storage.dispatch(fetchAnnotationsAsync());
                                    }
                                }).finally(() => {
                                    if (isMounted()) {
                                        dispatch(reducerActions.resetAfterRun());
                                    }
                                }).catch((error: unknown) => {
                                    if (error instanceof Error) {
                                        notification.error({
                                            message: error.message,
                                        });
                                    }
                                });
                            }
                        }}
                    >
                        Run
                    </Button>
                </Col>
            </Row>
        </Modal>
    );
}

export default React.memo(AnnotationsActionsModalContent);
