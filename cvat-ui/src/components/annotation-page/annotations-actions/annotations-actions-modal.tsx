// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useEffect, useRef, useState } from 'react';
import { createStore } from 'redux';
import {
    Provider, shallowEqual, useDispatch, useSelector,
} from 'react-redux';
import { createRoot } from 'react-dom/client';
import Button from 'antd/lib/button';
import { Col, Row } from 'antd/lib/grid';
import Progress from 'antd/lib/progress';
import Select from 'antd/lib/select';
import notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';
import Alert from 'antd/lib/alert';
import InputNumber from 'antd/lib/input-number';
import Switch from 'antd/lib/switch';

import config from 'config';
import { createAction, ActionUnion } from 'utils/redux';
import { getCVATStore } from 'cvat-store';
import {
    BaseCollectionAction, BaseAction, Job, getCore,
    ObjectState, ActionParameterType,
} from 'cvat-core-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';
import { fetchAnnotationsAsync } from 'actions/annotation-actions';
import { clamp } from 'utils/math';

const core = getCore();

interface State {
    actions: BaseAction[];
    activeAction: BaseAction | null;
    fetching: boolean;
    progress: number | null;
    progressMessage: string | null;
    cancelled: boolean;
    frameFrom: number;
    frameTo: number;
    actionParameters: Record<string, Record<string, string>>;
    modalVisible: boolean;
    targetObjectState?: ObjectState | null;
}

enum ReducerActionType {
    SET_ANNOTATIONS_ACTIONS = 'SET_ANNOTATIONS_ACTIONS',
    SET_ACTIVE_ANNOTATIONS_ACTION = 'SET_ACTIVE_ANNOTATIONS_ACTION',
    UPDATE_PROGRESS = 'UPDATE_PROGRESS',
    RESET_BEFORE_RUN = 'RESET_BEFORE_RUN',
    RESET_AFTER_RUN = 'RESET_AFTER_RUN',
    CANCEL_ACTION = 'CANCEL_ACTION',
    UPDATE_FRAME_FROM = 'UPDATE_FRAME_FROM',
    UPDATE_FRAME_TO = 'UPDATE_FRAME_TO',
    UPDATE_TARGET_OBJECT_STATE = 'UPDATE_TARGET_OBJECT_STATE',
    UPDATE_ACTION_PARAMETER = 'UPDATE_ACTION_PARAMETER',
    SET_VISIBLE = 'SET_VISIBLE',
}

export const reducerActions = {
    setAnnotationsActions: (actions: BaseAction[]) => (
        createAction(ReducerActionType.SET_ANNOTATIONS_ACTIONS, { actions })
    ),
    setActiveAnnotationsAction: (activeAction: BaseAction) => (
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
    updateFrameFrom: (frameFrom: number) => (
        createAction(ReducerActionType.UPDATE_FRAME_FROM, { frameFrom })
    ),
    updateFrameTo: (frameTo: number) => (
        createAction(ReducerActionType.UPDATE_FRAME_TO, { frameTo })
    ),
    updateTargetObjectState: (targetObjectState: ObjectState | null) => (
        createAction(ReducerActionType.UPDATE_TARGET_OBJECT_STATE, { targetObjectState })
    ),
    updateActionParameter: (name: string, value: string) => (
        createAction(ReducerActionType.UPDATE_ACTION_PARAMETER, { name, value })
    ),
    setVisible: (visible: boolean) => (
        createAction(ReducerActionType.SET_VISIBLE, { visible })
    ),
};

const defaultState = {
    actions: [],
    fetching: false,
    activeAction: null,
    progress: null,
    progressMessage: null,
    cancelled: false,
    frameFrom: 0,
    frameTo: 0,
    actionParameters: {},
    modalVisible: true,
    targetObjectState: null,
};

const reducer = (state: State = { ...defaultState }, action: ActionUnion<typeof reducerActions>): State => {
    if (action.type === ReducerActionType.SET_ANNOTATIONS_ACTIONS) {
        const { actions } = action.payload;

        return {
            ...state,
            actions,
            activeAction: state.activeAction ?? actions[0] ?? null,
        };
    }

    if (action.type === ReducerActionType.SET_ACTIVE_ANNOTATIONS_ACTION) {
        const { activeAction } = action.payload;
        const { targetObjectState } = state;

        if (!targetObjectState || activeAction.isApplicableForObject(targetObjectState)) {
            return {
                ...state,
                activeAction,
            };
        }

        return state;
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
        const currentActionName = (state.activeAction as BaseAction).name;
        return {
            ...state,
            actionParameters: {
                ...state.actionParameters,
                [currentActionName]: {
                    ...state.actionParameters[currentActionName] ?? {},
                    [action.payload.name]: action.payload.value,
                },
            },
        };
    }

    if (action.type === ReducerActionType.SET_VISIBLE) {
        return {
            ...state,
            modalVisible: action.payload.visible,
        };
    }

    if (action.type === ReducerActionType.UPDATE_TARGET_OBJECT_STATE) {
        const { targetObjectState } = action.payload;
        let { activeAction } = state;

        if (activeAction && targetObjectState && !activeAction.isApplicableForObject(targetObjectState)) {
            const filtered = state.actions.filter((_action) => _action.isApplicableForObject(targetObjectState));
            activeAction = filtered[0] ?? null;
        }

        return {
            ...state,
            activeAction,
            targetObjectState: action.payload.targetObjectState,
        };
    }

    return state;
};

type ActionParameterProps = NonNullable<BaseAction['parameters']>[keyof BaseAction['parameters']];

const componentStorage = createStore(reducer, {
    actions: [],
    fetching: false,
    activeAction: null,
    progress: null,
    progressMessage: null,
    cancelled: false,
    frameFrom: 0,
    frameTo: 0,
    actionParameters: {},
    modalVisible: true,
    targetObjectState: null,
});

function ActionParameterComponent(props: ActionParameterProps & { onChange: (value: string) => void }): JSX.Element {
    const {
        defaultValue, type, values, onChange,
    } = props;
    const store = getCVATStore();

    const job = store.getState().annotation.job.instance as Job;
    const computedDefaultValue = typeof defaultValue === 'function' ? defaultValue({ instance: job }) : defaultValue;
    const [value, setValue] = useState(computedDefaultValue);
    useEffect(() => {
        onChange(value);
    }, [value]);

    const computedValues = typeof values === 'function' ? values({ instance: job }) : values;

    if (type === ActionParameterType.SELECT) {
        return (
            <Select value={value} onChange={setValue}>
                {computedValues.map((_value: string) => (
                    <Select.Option key={_value} value={_value}>{_value}</Select.Option>
                ))}
            </Select>
        );
    }

    if (type === ActionParameterType.CHECKBOX) {
        return (
            <Switch
                checked={value.toLowerCase() === 'true'}
                onChange={(val: boolean) => {
                    setValue(String(val));
                }}
            />
        );
    }

    const [min, max, step] = computedValues.map((val) => +val);
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

interface Props {
    onClose: () => void;
    targetObjectState?: ObjectState;
    defaultAnnotationAction?: string;
}

function AnnotationsActionsModalContent(props: Props): JSX.Element {
    const { onClose, targetObjectState: defaultTargetObjectState, defaultAnnotationAction } = props;
    const dispatch = useDispatch();
    const storage = getCVATStore();
    const cancellationRef = useRef<boolean>(false);
    const {
        actions, activeAction, fetching, targetObjectState, cancelled,
        progress, progressMessage, frameFrom, frameTo, actionParameters, modalVisible,
    } = useSelector((state: State) => ({ ...state }), shallowEqual);

    const filteredActions = targetObjectState ? actions
        .filter((_action) => _action.isApplicableForObject(targetObjectState)) : actions;
    const jobInstance = storage.getState().annotation.job.instance as Job;
    const currentFrameAction = activeAction instanceof BaseCollectionAction || targetObjectState !== null;

    useEffect(() => {
        core.actions.list().then((list: BaseAction[]) => {
            dispatch(reducerActions.setAnnotationsActions(list));

            if (defaultAnnotationAction) {
                const defaultAction = list.find((action) => action.name === defaultAnnotationAction);
                if (
                    defaultAction &&
                    (!defaultTargetObjectState || defaultAction.isApplicableForObject(defaultTargetObjectState))
                ) {
                    dispatch(reducerActions.setActiveAnnotationsAction(defaultAction));
                }
            }

            dispatch(reducerActions.setVisible(true));
            dispatch(reducerActions.updateFrameFrom(jobInstance.startFrame));
            dispatch(reducerActions.updateFrameTo(jobInstance.stopFrame));
            dispatch(reducerActions.updateTargetObjectState(defaultTargetObjectState ?? null));
        });
    }, []);

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
                            targetObjectState ? (
                                <Text> Selected action will be applied to the current object </Text>
                            ) : (
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
                                </div>
                            )
                        )}
                        type='info'
                        showIcon
                    />
                </Col>

                <Col span={24} className='cvat-action-runner-list'>
                    <Row>
                        <Col span={24}>
                            <Text strong className='cvat-text-color'>Select action</Text>
                            <hr />
                        </Col>
                        <Col span={24}>
                            <Select
                                value={activeAction?.name}
                                onChange={(newActiveActionName: string) => {
                                    const newActiveAction = filteredActions
                                        .find((action) => action.name === newActiveActionName);
                                    if (newActiveAction) {
                                        dispatch(reducerActions.setActiveAnnotationsAction(newActiveAction));
                                    }
                                }}
                            >
                                {filteredActions.map(
                                    (annotationFunction: BaseAction): JSX.Element => (
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

                {activeAction && !currentFrameAction ? (
                    <>
                        <Col span={24} className='cvat-action-runner-frames'>
                            <Row>
                                <Col span={24}>
                                    <Text strong>Specify frames to apply the action </Text>
                                    <hr />
                                </Col>
                                <Col span={24}>
                                    <Text> Starting from frame </Text>
                                    <InputNumber
                                        value={frameFrom}
                                        min={jobInstance.startFrame}
                                        max={frameTo}
                                        step={1}
                                        onChange={(value) => {
                                            if (typeof value === 'number') {
                                                dispatch(reducerActions.updateFrameFrom(
                                                    clamp(
                                                        Math.round(value),
                                                        jobInstance.startFrame,
                                                        frameTo,
                                                    ),
                                                ));
                                            }
                                        }}
                                    />
                                    <Text> up to frame </Text>
                                    <InputNumber
                                        value={frameTo}
                                        min={frameFrom}
                                        max={jobInstance.stopFrame}
                                        step={1}
                                        onChange={(value) => {
                                            if (typeof value === 'number') {
                                                dispatch(reducerActions.updateFrameTo(
                                                    clamp(
                                                        Math.round(value),
                                                        frameFrom,
                                                        jobInstance.stopFrame,
                                                    ),
                                                ));
                                            }
                                        }}
                                    />
                                </Col>
                            </Row>
                        </Col>
                        {
                            !currentFrameAction ? (
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
                            ) : null
                        }
                    </>
                ) : null}

                {activeAction?.parameters ? (
                    <Col span={24} className='cvat-action-runner-action-parameters'>
                        <Row>
                            <Col span={24}>
                                <Text strong>Setup action parameters </Text>
                                <hr />
                            </Col>
                            {Object.entries(activeAction.parameters)
                                .map(([name, { defaultValue, type, values }], idx) => (
                                    <Col
                                        key={`${activeAction.name}_${idx}`}
                                        span={24}
                                        className='cvat-action-runner-action-parameter'
                                    >
                                        <Text>{name}</Text>
                                        <ActionParameterComponent
                                            onChange={(value: string) => {
                                                dispatch(reducerActions.updateActionParameter(name, value));
                                            }}
                                            defaultValue={actionParameters[activeAction.name]?.[name] ?? defaultValue}
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
                        loading={cancelled}
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
                                const updateProgressWrapper = (_message: string, _progress: number): void => {
                                    dispatch(reducerActions.updateProgress(_progress, _message));
                                };

                                const currentFrame = storage.getState().annotation.player.frame.number;
                                const actionPromise = targetObjectState ? core.actions.call(
                                    jobInstance,
                                    activeAction,
                                    actionParameters[activeAction.name],
                                    currentFrame,
                                    [targetObjectState],
                                    updateProgressWrapper,
                                    () => cancellationRef.current,
                                ) : core.actions.run(
                                    jobInstance,
                                    activeAction,
                                    actionParameters[activeAction.name],
                                    currentFrameAction ? currentFrame : frameFrom,
                                    currentFrameAction ? currentFrame : frameTo,
                                    storage.getState().annotation.annotations.filters,
                                    updateProgressWrapper,
                                    () => cancellationRef.current,
                                );

                                actionPromise.then(() => {
                                    if (!cancellationRef.current) {
                                        canvasInstance.setup(frameData, []);
                                        storage.dispatch(fetchAnnotationsAsync());
                                        if (targetObjectState !== null) {
                                            onClose();
                                        }
                                    }
                                }).finally(() => {
                                    dispatch(reducerActions.resetAfterRun());
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

const MemoizedAnnotationsActionsModalContent = React.memo(AnnotationsActionsModalContent);

export function openAnnotationsActionModal({
    defaultObjectState,
    defaultAnnotationAction,
}: {
    defaultObjectState?: ObjectState,
    defaultAnnotationAction?: string,
} = {}): void {
    window.document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    const div = window.document.createElement('div');
    window.document.body.append(div);
    const root = createRoot(div);
    root.render(
        <Provider store={componentStorage}>
            <MemoizedAnnotationsActionsModalContent
                targetObjectState={defaultObjectState}
                defaultAnnotationAction={defaultAnnotationAction}
                onClose={() => {
                    root.unmount();
                    div.remove();
                }}
            />
        </Provider>,
    );
}
