// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { MutableRefObject } from 'react';
import { connect } from 'react-redux';
import Icon from 'antd/lib/icon';
import Popover from 'antd/lib/popover';
import Select, { OptionProps } from 'antd/lib/select';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';
import Tabs from 'antd/lib/tabs';
import { Row, Col } from 'antd/lib/grid';
import notification from 'antd/lib/notification';
import Progress from 'antd/lib/progress';

import { AIToolsIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import range from 'utils/range';
import getCore from 'cvat-core-wrapper';
import { CombinedState, ActiveControl, Model, ObjectType, ShapeType } from 'reducers/interfaces';
import {
    interactWithCanvas,
    fetchAnnotationsAsync,
    updateAnnotationsAsync,
    createAnnotationsAsync,
} from 'actions/annotation-actions';
import { InteractionResult } from 'cvat-canvas/src/typescript/canvas';
import DetectorRunner from 'components/model-runner-modal/detector-runner';
import InputNumber from 'antd/lib/input-number';

interface StateToProps {
    canvasInstance: Canvas;
    labels: any[];
    states: any[];
    activeLabelID: number;
    jobInstance: any;
    isActivated: boolean;
    frame: number;
    interactors: Model[];
    detectors: Model[];
    trackers: Model[];
    curZOrder: number;
    aiToolsRef: MutableRefObject<any>;
}

interface DispatchToProps {
    onInteractionStart(activeInteractor: Model, activeLabelID: number): void;
    updateAnnotations(statesToUpdate: any[]): void;
    createAnnotations(sessionInstance: any, frame: number, statesToCreate: any[]): void;
    fetchAnnotations(): void;
}

const core = getCore();

function mapStateToProps(state: CombinedState): StateToProps {
    const { annotation } = state;
    const { number: frame } = annotation.player.frame;
    const { instance: jobInstance } = annotation.job;
    const { instance: canvasInstance, activeControl } = annotation.canvas;
    const { models } = state;
    const { interactors, detectors, trackers } = models;

    return {
        interactors,
        detectors,
        trackers,
        isActivated: activeControl === ActiveControl.AI_TOOLS,
        activeLabelID: annotation.drawing.activeLabelID,
        labels: annotation.job.labels,
        states: annotation.annotations.states,
        canvasInstance,
        jobInstance,
        frame,
        curZOrder: annotation.annotations.zLayer.cur,
        aiToolsRef: annotation.aiToolsRef,
    };
}

const mapDispatchToProps = {
    onInteractionStart: interactWithCanvas,
    updateAnnotations: updateAnnotationsAsync,
    fetchAnnotations: fetchAnnotationsAsync,
    createAnnotations: createAnnotationsAsync,
};

function convertShapesForInteractor(shapes: InteractionResult[]): number[][] {
    const reducer = (acc: number[][], _: number, index: number, array: number[]): number[][] => {
        if (!(index % 2)) {
            // 0, 2, 4
            acc.push([array[index], array[index + 1]]);
        }
        return acc;
    };

    return shapes
        .filter((shape: InteractionResult): boolean => shape.shapeType === 'points' && shape.button === 0)
        .map((shape: InteractionResult): number[] => shape.points)
        .flat()
        .reduce(reducer, []);
}

type Props = StateToProps & DispatchToProps;
interface State {
    activeInteractor: Model | null;
    activeLabelID: number;
    interactiveStateID: number | null;
    activeTracker: Model | null;
    trackingProgress: number | null;
    trackingFrames: number;
    fetching: boolean;
    mode: 'detection' | 'interaction' | 'tracking';
}

export class ToolsControlComponent extends React.PureComponent<Props, State> {
    private interactionIsAborted: boolean;

    private interactionIsDone: boolean;

    public constructor(props: Props) {
        super(props);
        this.state = {
            activeInteractor: props.interactors.length ? props.interactors[0] : null,
            activeTracker: props.trackers.length ? props.trackers[0] : null,
            activeLabelID: props.labels[0].id,
            interactiveStateID: null,
            trackingProgress: null,
            trackingFrames: 10,
            fetching: false,
            mode: 'interaction',
        };

        this.interactionIsAborted = false;
        this.interactionIsDone = false;
    }

    public componentDidMount(): void {
        const { canvasInstance, aiToolsRef } = this.props;
        aiToolsRef.current = this;
        canvasInstance.html().addEventListener('canvas.interacted', this.interactionListener);
        canvasInstance.html().addEventListener('canvas.canceled', this.cancelListener);
    }

    public componentDidUpdate(prevProps: Props): void {
        const { isActivated } = this.props;
        if (prevProps.isActivated && !isActivated) {
            window.removeEventListener('contextmenu', this.contextmenuDisabler);
        } else if (!prevProps.isActivated && isActivated) {
            // reset flags when start interaction/tracking
            this.interactionIsDone = false;
            this.interactionIsAborted = false;
            window.addEventListener('contextmenu', this.contextmenuDisabler);
        }
    }

    public componentWillUnmount(): void {
        const { canvasInstance, aiToolsRef } = this.props;
        aiToolsRef.current = undefined;
        canvasInstance.html().removeEventListener('canvas.interacted', this.interactionListener);
        canvasInstance.html().removeEventListener('canvas.canceled', this.cancelListener);
    }

    private getInteractiveState(): any | null {
        const { states } = this.props;
        const { interactiveStateID } = this.state;
        return states.filter((_state: any): boolean => _state.clientID === interactiveStateID)[0] || null;
    }

    private contextmenuDisabler = (e: MouseEvent): void => {
        if (
            e.target &&
            (e.target as Element).classList &&
            (e.target as Element).classList.toString().includes('ant-modal')
        ) {
            e.preventDefault();
        }
    };

    private cancelListener = async (): Promise<void> => {
        const { isActivated, jobInstance, frame, fetchAnnotations } = this.props;
        const { interactiveStateID, fetching } = this.state;

        if (isActivated) {
            if (fetching && !this.interactionIsDone) {
                // user pressed ESC
                this.setState({ fetching: false });
                this.interactionIsAborted = true;
            }

            if (interactiveStateID !== null) {
                const state = this.getInteractiveState();
                this.setState({ interactiveStateID: null });
                await state.delete(frame);
                fetchAnnotations();
            }

            await jobInstance.actions.freeze(false);
        }
    };

    private onInteraction = async (e: Event): Promise<void> => {
        const {
            frame,
            labels,
            curZOrder,
            jobInstance,
            isActivated,
            activeLabelID,
            fetchAnnotations,
            updateAnnotations,
        } = this.props;
        const { activeInteractor, interactiveStateID, fetching } = this.state;

        try {
            if (!isActivated) {
                throw Error('Canvas raises event "canvas.interacted" when interaction with it is off');
            }

            if (fetching) {
                this.interactionIsDone = (e as CustomEvent).detail.isDone;
                return;
            }

            const interactor = activeInteractor as Model;

            let result = [];
            if ((e as CustomEvent).detail.shapesUpdated) {
                this.setState({ fetching: true });
                try {
                    result = await core.lambda.call(jobInstance.task, interactor, {
                        frame,
                        points: convertShapesForInteractor((e as CustomEvent).detail.shapes),
                    });

                    if (this.interactionIsAborted) {
                        // while the server request
                        // user has cancelled interaction (for example pressed ESC)
                        return;
                    }
                } finally {
                    this.setState({ fetching: false });
                }
            }

            if (this.interactionIsDone) {
                // while the server request, user has done interaction (for example pressed N)
                const object = new core.classes.ObjectState({
                    frame,
                    objectType: ObjectType.SHAPE,
                    label: labels.filter((label: any) => label.id === activeLabelID)[0],
                    shapeType: ShapeType.POLYGON,
                    points: result.flat(),
                    occluded: false,
                    zOrder: curZOrder,
                });

                await jobInstance.annotations.put([object]);
                fetchAnnotations();
            } else {
                // no shape yet, then create it and save to collection
                if (interactiveStateID === null) {
                    // freeze history for interaction time
                    // (points updating shouldn't cause adding new actions to history)
                    await jobInstance.actions.freeze(true);
                    const object = new core.classes.ObjectState({
                        frame,
                        objectType: ObjectType.SHAPE,
                        label: labels.filter((label: any) => label.id === activeLabelID)[0],
                        shapeType: ShapeType.POLYGON,
                        points: result.flat(),
                        occluded: false,
                        zOrder: curZOrder,
                    });
                    // need a clientID of a created object to interact with it further
                    // so, we do not use createAnnotationAction
                    const [clientID] = await jobInstance.annotations.put([object]);

                    // update annotations on a canvas
                    fetchAnnotations();
                    this.setState({ interactiveStateID: clientID });
                    return;
                }

                const state = this.getInteractiveState();
                if ((e as CustomEvent).detail.isDone) {
                    const finalObject = new core.classes.ObjectState({
                        frame: state.frame,
                        objectType: state.objectType,
                        label: state.label,
                        shapeType: state.shapeType,
                        points: result.length ? result.flat() : state.points,
                        occluded: state.occluded,
                        zOrder: state.zOrder,
                    });
                    this.setState({ interactiveStateID: null });
                    await state.delete(frame);
                    await jobInstance.actions.freeze(false);
                    await jobInstance.annotations.put([finalObject]);
                    fetchAnnotations();
                } else {
                    state.points = result.flat();
                    updateAnnotations([state]);
                    fetchAnnotations();
                }
            }
        } catch (err) {
            notification.error({
                description: err.toString(),
                message: 'Interaction error occured',
            });
        }
    };

    private onTracking = async (e: Event): Promise<void> => {
        const { isActivated, jobInstance, frame, curZOrder, fetchAnnotations } = this.props;
        const { activeLabelID } = this.state;
        const [label] = jobInstance.task.labels.filter((_label: any): boolean => _label.id === activeLabelID);

        if (!(e as CustomEvent).detail.isDone) {
            return;
        }

        this.interactionIsDone = true;
        try {
            if (!isActivated) {
                throw Error('Canvas raises event "canvas.interacted" when interaction with it is off');
            }

            const { points } = (e as CustomEvent).detail.shapes[0];
            const state = new core.classes.ObjectState({
                shapeType: ShapeType.RECTANGLE,
                objectType: ObjectType.TRACK,
                zOrder: curZOrder,
                label,
                points,
                frame,
                occluded: false,
                source: 'auto',
                attributes: {},
            });

            const [clientID] = await jobInstance.annotations.put([state]);

            // update annotations on a canvas
            fetchAnnotations();

            const states = await jobInstance.annotations.get(frame);
            const [objectState] = states.filter((_state: any): boolean => _state.clientID === clientID);
            await this.trackState(objectState);
        } catch (err) {
            notification.error({
                description: err.toString(),
                message: 'Tracking error occured',
            });
        }
    };

    private interactionListener = async (e: Event): Promise<void> => {
        const { mode } = this.state;

        if (mode === 'interaction') {
            await this.onInteraction(e);
        }

        if (mode === 'tracking') {
            await this.onTracking(e);
        }
    };

    private setActiveInteractor = (key: string): void => {
        const { interactors } = this.props;
        this.setState({
            activeInteractor: interactors.filter((interactor: Model) => interactor.id === key)[0],
        });
    };

    private setActiveTracker = (key: string): void => {
        const { trackers } = this.props;
        this.setState({
            activeTracker: trackers.filter((tracker: Model) => tracker.id === key)[0],
        });
    };

    public async trackState(state: any): Promise<void> {
        const { jobInstance, frame } = this.props;
        const { activeTracker, trackingFrames } = this.state;
        const { clientID, points } = state;

        const tracker = activeTracker as Model;
        try {
            this.setState({ trackingProgress: 0, fetching: true });
            let response = await core.lambda.call(jobInstance.task, tracker, {
                task: jobInstance.task,
                frame,
                shape: points,
            });

            for (const offset of range(1, trackingFrames + 1)) {
                /* eslint-disable no-await-in-loop */
                const states = await jobInstance.annotations.get(frame + offset);
                const [objectState] = states.filter((_state: any): boolean => _state.clientID === clientID);
                response = await core.lambda.call(jobInstance.task, tracker, {
                    task: jobInstance.task,
                    frame: frame + offset,
                    shape: response.points,
                    state: response.state,
                });

                const reduced = response.shape.reduce(
                    (acc: number[], value: number, index: number): number[] => {
                        if (index % 2) {
                            // y
                            acc[1] = Math.min(acc[1], value);
                            acc[3] = Math.max(acc[3], value);
                        } else {
                            // x
                            acc[0] = Math.min(acc[0], value);
                            acc[2] = Math.max(acc[2], value);
                        }
                        return acc;
                    },
                    [
                        Number.MAX_SAFE_INTEGER,
                        Number.MAX_SAFE_INTEGER,
                        Number.MIN_SAFE_INTEGER,
                        Number.MIN_SAFE_INTEGER,
                    ],
                );

                objectState.points = reduced;
                await objectState.save();

                this.setState({ trackingProgress: offset / trackingFrames });
            }
        } finally {
            this.setState({ trackingProgress: null, fetching: false });
        }
    }

    public trackingAvailable(): boolean {
        const { activeTracker, trackingFrames } = this.state;
        const { trackers } = this.props;

        return !!trackingFrames && !!trackers.length && activeTracker !== null;
    }

    private renderLabelBlock(): JSX.Element {
        const { labels } = this.props;
        const { activeLabelID } = this.state;
        return (
            <>
                <Row type='flex' justify='start'>
                    <Col>
                        <Text className='cvat-text-color'>Label</Text>
                    </Col>
                </Row>
                <Row type='flex' justify='center'>
                    <Col span={24}>
                        <Select
                            style={{ width: '100%' }}
                            showSearch
                            filterOption={(input: string, option: React.ReactElement<OptionProps>) => {
                                const { children } = option.props;
                                if (typeof children === 'string') {
                                    return children.toLowerCase().includes(input.toLowerCase());
                                }

                                return false;
                            }}
                            value={`${activeLabelID}`}
                            onChange={(value: string) => {
                                this.setState({ activeLabelID: +value });
                            }}
                        >
                            {labels.map((label: any) => (
                                <Select.Option key={label.id} value={`${label.id}`}>
                                    {label.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            </>
        );
    }

    private renderTrackerBlock(): JSX.Element {
        const { trackers, canvasInstance, jobInstance, frame, onInteractionStart } = this.props;
        const { activeTracker, activeLabelID, fetching, trackingFrames } = this.state;

        if (!trackers.length) {
            return (
                <Row type='flex' justify='center' align='middle' style={{ marginTop: '5px' }}>
                    <Col>
                        <Text type='warning' className='cvat-text-color'>
                            No available trackers found
                        </Text>
                    </Col>
                </Row>
            );
        }

        return (
            <>
                <Row type='flex' justify='start'>
                    <Col>
                        <Text className='cvat-text-color'>Tracker</Text>
                    </Col>
                </Row>
                <Row type='flex' align='middle' justify='center'>
                    <Col span={24}>
                        <Select
                            style={{ width: '100%' }}
                            defaultValue={trackers[0].name}
                            onChange={this.setActiveTracker}
                        >
                            {trackers.map(
                                (interactor: Model): JSX.Element => (
                                    <Select.Option title={interactor.description} key={interactor.id}>
                                        {interactor.name}
                                    </Select.Option>
                                ),
                            )}
                        </Select>
                    </Col>
                </Row>
                <Row type='flex' align='middle' justify='start' style={{ marginTop: '5px' }}>
                    <Col>
                        <Text>Tracking frames</Text>
                    </Col>
                    <Col offset={2}>
                        <InputNumber
                            value={trackingFrames}
                            step={1}
                            min={1}
                            precision={0}
                            max={jobInstance.stopFrame - frame}
                            onChange={(value: number | undefined): void => {
                                if (typeof value !== 'undefined') {
                                    this.setState({
                                        trackingFrames: value,
                                    });
                                }
                            }}
                        />
                    </Col>
                </Row>
                <Row type='flex' align='middle' justify='end'>
                    <Col>
                        <Button
                            type='primary'
                            loading={fetching}
                            className='cvat-tools-track-button'
                            disabled={!activeTracker || fetching || frame === jobInstance.stopFrame}
                            onClick={() => {
                                this.setState({
                                    mode: 'tracking',
                                });

                                if (activeTracker) {
                                    canvasInstance.cancel();
                                    canvasInstance.interact({
                                        shapeType: 'rectangle',
                                        enabled: true,
                                    });

                                    onInteractionStart(activeTracker, activeLabelID);
                                }
                            }}
                        >
                            Track
                        </Button>
                    </Col>
                </Row>
            </>
        );
    }

    private renderInteractorBlock(): JSX.Element {
        const { interactors, canvasInstance, onInteractionStart } = this.props;
        const { activeInteractor, activeLabelID, fetching } = this.state;

        if (!interactors.length) {
            return (
                <Row type='flex' justify='center' align='middle' style={{ marginTop: '5px' }}>
                    <Col>
                        <Text type='warning' className='cvat-text-color'>
                            No available interactors found
                        </Text>
                    </Col>
                </Row>
            );
        }

        return (
            <>
                <Row type='flex' justify='start'>
                    <Col>
                        <Text className='cvat-text-color'>Interactor</Text>
                    </Col>
                </Row>
                <Row type='flex' align='middle' justify='center'>
                    <Col span={24}>
                        <Select
                            style={{ width: '100%' }}
                            defaultValue={interactors[0].name}
                            onChange={this.setActiveInteractor}
                        >
                            {interactors.map(
                                (interactor: Model): JSX.Element => (
                                    <Select.Option title={interactor.description} key={interactor.id}>
                                        {interactor.name}
                                    </Select.Option>
                                ),
                            )}
                        </Select>
                    </Col>
                </Row>
                <Row type='flex' align='middle' justify='end'>
                    <Col>
                        <Button
                            type='primary'
                            loading={fetching}
                            className='cvat-tools-interact-button'
                            disabled={!activeInteractor || fetching}
                            onClick={() => {
                                this.setState({
                                    mode: 'interaction',
                                });

                                if (activeInteractor) {
                                    canvasInstance.cancel();
                                    canvasInstance.interact({
                                        shapeType: 'points',
                                        enabled: true,
                                        ...activeInteractor.params.canvas,
                                    });

                                    onInteractionStart(activeInteractor, activeLabelID);
                                }
                            }}
                        >
                            Interact
                        </Button>
                    </Col>
                </Row>
            </>
        );
    }

    private renderDetectorBlock(): JSX.Element {
        const { jobInstance, detectors, curZOrder, frame, fetchAnnotations } = this.props;

        if (!detectors.length) {
            return (
                <Row type='flex' justify='center' align='middle' style={{ marginTop: '5px' }}>
                    <Col>
                        <Text type='warning' className='cvat-text-color'>
                            No available detectors found
                        </Text>
                    </Col>
                </Row>
            );
        }

        return (
            <DetectorRunner
                withCleanup={false}
                models={detectors}
                task={jobInstance.task}
                runInference={async (task: any, model: Model, body: object) => {
                    try {
                        this.setState({
                            mode: 'detection',
                        });

                        this.setState({ fetching: true });
                        const result = await core.lambda.call(task, model, {
                            ...body,
                            frame,
                        });

                        const states = result.map(
                            (data: any): any =>
                                new core.classes.ObjectState({
                                    shapeType: data.type,
                                    label: task.labels.filter((label: any): boolean => label.name === data.label)[0],
                                    points: data.points,
                                    objectType: ObjectType.SHAPE,
                                    frame,
                                    occluded: false,
                                    source: 'auto',
                                    attributes: {},
                                    zOrder: curZOrder,
                                }),
                        );

                        await jobInstance.annotations.put(states);
                        fetchAnnotations();
                    } catch (error) {
                        notification.error({
                            description: error.toString(),
                            message: 'Detection error occured',
                        });
                    } finally {
                        this.setState({ fetching: false });
                    }
                }}
            />
        );
    }

    private renderPopoverContent(): JSX.Element {
        return (
            <div className='cvat-tools-control-popover-content'>
                <Row type='flex' justify='start'>
                    <Col>
                        <Text className='cvat-text-color' strong>
                            AI Tools
                        </Text>
                    </Col>
                </Row>
                <Tabs type='card' tabBarGutter={8}>
                    <Tabs.TabPane key='interactors' tab='Interactors'>
                        {this.renderLabelBlock()}
                        {this.renderInteractorBlock()}
                    </Tabs.TabPane>
                    <Tabs.TabPane key='detectors' tab='Detectors'>
                        {this.renderDetectorBlock()}
                    </Tabs.TabPane>
                    <Tabs.TabPane key='trackers' tab='Trackers'>
                        {this.renderLabelBlock()}
                        {this.renderTrackerBlock()}
                    </Tabs.TabPane>
                </Tabs>
            </div>
        );
    }

    public render(): JSX.Element | null {
        const { interactors, detectors, trackers, isActivated, canvasInstance } = this.props;
        const { fetching, trackingProgress } = this.state;

        if (![...interactors, ...detectors, ...trackers].length) return null;

        const dynamcPopoverPros = isActivated
            ? {
                  overlayStyle: {
                      display: 'none',
                  },
              }
            : {};

        const dynamicIconProps = isActivated
            ? {
                  className: 'cvat-active-canvas-control cvat-tools-control',
                  onClick: (): void => {
                      canvasInstance.interact({ enabled: false });
                  },
              }
            : {
                  className: 'cvat-tools-control',
              };

        return (
            <>
                <Modal
                    title='Making a server request'
                    zIndex={Number.MAX_SAFE_INTEGER}
                    visible={fetching}
                    closable={false}
                    footer={[]}
                >
                    <Text>Waiting for a server response..</Text>
                    <Icon style={{ marginLeft: '10px' }} type='loading' />
                    {trackingProgress !== null && (
                        <Progress percent={+(trackingProgress * 100).toFixed(0)} status='active' />
                    )}
                </Modal>
                <Popover
                    {...dynamcPopoverPros}
                    placement='right'
                    overlayClassName='cvat-tools-control-popover'
                    content={this.renderPopoverContent()}
                >
                    <Icon {...dynamicIconProps} component={AIToolsIcon} />
                </Popover>
            </>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(ToolsControlComponent);
