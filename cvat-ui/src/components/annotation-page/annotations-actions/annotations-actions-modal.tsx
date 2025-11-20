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
    resetBeforeRun: () => createAction(ReducerActionType.RESET_BEFORE_RUN),
    resetAfterRun: () => createAction(ReducerActionType.RESET_AFTER_RUN),
    cancelAction: () => createAction(ReducerActionType.CANCEL_ACTION),
    updateFrameFrom: (frameFrom: number) => createAction(ReducerActionType.UPDATE_FRAME_FROM, { frameFrom }),
    updateFrameTo: (frameTo: number) => createAction(ReducerActionType.UPDATE_FRAME_TO, { frameTo }),
    updateTargetObjectState: (targetObjectState: ObjectState | null) => (
        createAction(ReducerActionType.UPDATE_TARGET_OBJECT_STATE, { targetObjectState })
    ),
    updateActionParameter: (name: string, value: string) => (
        createAction(ReducerActionType.UPDATE_ACTION_PARAMETER, { name, value })
    ),
    setVisible: (visible: boolean) => createAction(ReducerActionType.SET_VISIBLE, { visible }),
};

const defaultState: State = {
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
    switch (action.type) {
        case ReducerActionType.SET_ANNOTATIONS_ACTIONS: {
            const { actions } = action.payload;
            return { ...state, actions, activeAction: state.activeAction ?? actions[0] ?? null };
        }
        case ReducerActionType.SET_ACTIVE_ANNOTATIONS_ACTION: {
            const { activeAction } = action.payload;
            const { targetObjectState } = state;
            if (!targetObjectState || activeAction.isApplicableForObject(targetObjectState)) {
                return { ...state, activeAction };
            }
            return state;
        }
        case ReducerActionType.UPDATE_PROGRESS:
            return { ...state, progress: action.payload.progress, progressMessage: action.payload.progressMessage };
        case ReducerActionType.RESET_BEFORE_RUN:
            return { ...state, fetching: true, cancelled: false };
        case ReducerActionType.RESET_AFTER_RUN:
            return {
                ...state,
                fetching: false,
                cancelled: false,
                progress: null,
                progressMessage: null,
            };
        case ReducerActionType.CANCEL_ACTION:
            return { ...state, cancelled: true };
        case ReducerActionType.UPDATE_FRAME_FROM:
            return {
                ...state,
                frameFrom: action.payload.frameFrom,
                frameTo: Math.max(state.frameTo, action.payload.frameFrom),
            };
        case ReducerActionType.UPDATE_FRAME_TO:
            return {
                ...state,
                frameFrom: Math.min(state.frameFrom, action.payload.frameTo),
                frameTo: action.payload.frameTo,
            };
        case ReducerActionType.UPDATE_ACTION_PARAMETER: {
            const currentActionName = (state.activeAction as BaseAction).name;
            return {
                ...state,
                actionParameters: {
                    ...state.actionParameters,
                    [currentActionName]: {
                        ...state.actionParameters[currentActionName],
                        [action.payload.name]: action.payload.value,
                    },
                },
            };
        }
        case ReducerActionType.SET_VISIBLE:
            return { ...state, modalVisible: action.payload.visible };
        case ReducerActionType.UPDATE_TARGET_OBJECT_STATE: {
            const { targetObjectState } = action.payload;
            let { activeAction } = state;
            if (activeAction && targetObjectState && !activeAction.isApplicableForObject(targetObjectState)) {
                const filtered = state.actions.filter((_a) => _a.isApplicableForObject(targetObjectState));
                activeAction = filtered[0] ?? null;
            }
            return { ...state, activeAction, targetObjectState };
        }
        default:
            return state;
    }
};

const componentStorage = createStore(reducer, defaultState);

type ActionParameterProps = NonNullable<BaseAction['parameters']>[keyof BaseAction['parameters']];

function ActionParameterComponent(props: ActionParameterProps & { onChange: (value: string) => void }): JSX.Element {
    const { defaultValue, type, values, onChange } = props;
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
                {computedValues.map((_v: string) => (
                    <Select.Option key={_v} value={_v}>{_v}</Select.Option>
                ))}
            </Select>
        );
    }

    if (type === ActionParameterType.CHECKBOX) {
        return (
            <Switch
                checked={value.toLowerCase() === 'true'}
                onChange={(val: boolean) => setValue(String(val))}
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
            onChange={(_v: number | null) => {
                if (typeof _v === 'number') {
                    const updated = Number.isInteger(step)
                        ? _v - (_v % step)
                        : _v;
                    setValue(`${clamp(updated, min, max)}`);
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

    const filteredActions = targetObjectState ? actions.filter((_a) => _a.isApplicableForObject(targetObjectState)) : actions;
    const jobInstance = storage.getState().annotation.job.instance as Job;
    const currentFrameAction = activeAction instanceof BaseCollectionAction || targetObjectState !== null;

    useEffect(() => {
        core.actions.list().then((list: BaseAction[]) => {
            dispatch(reducerActions.setAnnotationsActions(list));
            if (defaultAnnotationAction) {
                const defaultAction = list.find((a) => a.name === defaultAnnotationAction);
                if (defaultAction && (!defaultTargetObjectState || defaultAction.isApplicableForObject(defaultTargetObjectState))) {
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
                    {fetching ? 'Cancel' : 'Close'}
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
                            const updateProgressWrapper = (_m: string, _p: number): void => {
                                dispatch(reducerActions.updateProgress(_p, _m));
                            };

                            const currentFrame = storage.getState().annotation.player.frame.number;
                            const actionPromise = targetObjectState
                                ? core.actions.call(
                                    jobInstance,
                                    activeAction,
                                    actionParameters[activeAction.name],
                                    currentFrame,
                                    [targetObjectState],
                                    updateProgressWrapper,
                                    () => cancellationRef.current,
                                )
                                : core.actions.run(
                                    jobInstance,
                                    activeAction,
                                    actionParameters[activeAction.name],
                                    currentFrameAction ? currentFrame : frameFrom,
                                    currentFrameAction ? currentFrame : frameTo,
                                    storage.getState().annotation.annotations.filters,
                                    updateProgressWrapper,
                                    () => cancellationRef.current,
                                );

                            // ✅ Fixed section below
                            actionPromise
                                .then(() => {
                                    if (!cancellationRef.current) {
                                        storage.dispatch(fetchAnnotationsAsync()).then(() => {
                                            canvasInstance.setup(frameData, []);
                                        });
                                        dispatch(reducerActions.setVisible(false));
                                        onClose();
                                        notification.success({
                                            message: 'Annotation completed successfully!',
                                            description: 'Canvas refreshed and ready for new annotations.',
                                        });
                                    }
                                })
                                .catch((error: unknown) => {
                                    if (error instanceof Error) {
                                        notification.error({
                                            message: error.message,
                                            description: 'Annotation action failed. Please retry or check logs.',
                                        });
                                    }
                                })
                                .finally(() => {
                                    dispatch(reducerActions.resetAfterRun());
                                });
                        }
                    }}
                >
                    Run
                </Button>
            </Col>
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

