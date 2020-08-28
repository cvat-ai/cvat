// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import Icon from 'antd/lib/icon';
import Popover from 'antd/lib/popover';
import Select, { OptionProps } from 'antd/lib/select';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import notification from 'antd/lib/notification';

import { AIToolsIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import getCore from 'cvat-core-wrapper';
import {
    CombinedState,
    ActiveControl,
    Model,
    ObjectType,
    ShapeType,
} from 'reducers/interfaces';
import { interactWithCanvas, fetchAnnotationsAsync, updateAnnotationsAsync } from 'actions/annotation-actions';
import { InteractionResult } from 'cvat-canvas/src/typescript/canvas';

interface StateToProps {
    canvasInstance: Canvas;
    labels: any[];
    states: any[];
    activeLabelID: number;
    jobInstance: any;
    isInteraction: boolean;
    frame: number;
    interactors: Model[];
}

interface DispatchToProps {
    onInteractionStart(activeInteractor: Model, activeLabelID: number): void;
    updateAnnotations(statesToUpdate: any[]): void;
    fetchAnnotations(): void;
}

const core = getCore();

function mapStateToProps(state: CombinedState): StateToProps {
    const { annotation } = state;
    const { number: frame } = annotation.player.frame;
    const { instance: jobInstance } = annotation.job;
    const { instance: canvasInstance, activeControl } = annotation.canvas;
    const { models } = state;
    const { interactors } = models;

    return {
        interactors,
        isInteraction: activeControl === ActiveControl.INTERACTION,
        activeLabelID: annotation.drawing.activeLabelID,
        labels: annotation.job.labels,
        states: annotation.annotations.states,
        canvasInstance,
        jobInstance,
        frame,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onInteractionStart(activeInteractor: Model, activeLabelID: number): void {
            dispatch(interactWithCanvas(activeInteractor, activeLabelID));
        },
        updateAnnotations(statesToUpdate: any[]): void {
            dispatch(updateAnnotationsAsync(statesToUpdate));
        },
        fetchAnnotations(): void {
            dispatch(fetchAnnotationsAsync());
        },
    };
}

function convertShapesForInteractor(shapes: InteractionResult[]): number[][] {
    const reducer = (acc: number[][], _: number, index: number, array: number[]): number[][] => {
        if (!(index % 2)) { // 0, 2, 4
            acc.push([
                array[index],
                array[index + 1],
            ]);
        }
        return acc;
    };

    return shapes.filter((shape: InteractionResult): boolean => shape.shapeType === 'points' && shape.button === 0)
        .map((shape: InteractionResult): number[] => shape.points)
        .flat().reduce(reducer, []);
}

type Props = StateToProps & DispatchToProps;
interface State {
    activeInteractor: Model | null;
    activeLabelID: number;
    interactiveStateID: number | null;
    fetching: boolean;
}

class ToolsControlComponent extends React.PureComponent<Props, State> {
    private interactionIsAborted: boolean;
    private interactionIsDone: boolean;

    public constructor(props: Props) {
        super(props);
        this.state = {
            activeInteractor: props.interactors.length ? props.interactors[0] : null,
            activeLabelID: props.labels[0].id,
            interactiveStateID: null,
            fetching: false,
        };

        this.interactionIsAborted = false;
        this.interactionIsDone = false;
    }

    public componentDidMount(): void {
        const { canvasInstance } = this.props;
        canvasInstance.html().addEventListener('canvas.interacted', this.interactionListener);
        canvasInstance.html().addEventListener('canvas.canceled', this.cancelListener);
    }

    public componentDidUpdate(prevProps: Props): void {
        const { isInteraction } = this.props;
        if (prevProps.isInteraction && !isInteraction) {
            window.removeEventListener('contextmenu', this.contextmenuDisabler);
        } else if (!prevProps.isInteraction && isInteraction) {
            this.interactionIsDone = false;
            this.interactionIsAborted = false;
            window.addEventListener('contextmenu', this.contextmenuDisabler);
        }
    }

    public componentWillUnmount(): void {
        const { canvasInstance } = this.props;
        canvasInstance.html().removeEventListener('canvas.interacted', this.interactionListener);
        canvasInstance.html().removeEventListener('canvas.canceled', this.cancelListener);
    }

    private getInteractiveState(): any | null {
        const { states } = this.props;
        const { interactiveStateID } = this.state;
        return states
            .filter((_state: any): boolean => _state.clientID === interactiveStateID)[0] || null;
    }

    private contextmenuDisabler = (e: MouseEvent): void => {
        if (e.target && (e.target as Element).classList
            && (e.target as Element).classList.toString().includes('ant-modal')) {
            e.preventDefault();
        }
    };

    private cancelListener = async (): Promise<void> => {
        const {
            isInteraction,
            jobInstance,
            frame,
            fetchAnnotations,
        } = this.props;
        const { interactiveStateID, fetching } = this.state;

        if (isInteraction) {
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

    private interactionListener = async (e: Event): Promise<void> => {
        const {
            frame,
            labels,
            jobInstance,
            isInteraction,
            activeLabelID,
            fetchAnnotations,
            updateAnnotations,
        } = this.props;
        const { activeInteractor, interactiveStateID, fetching } = this.state;

        try {
            if (!isInteraction) {
                throw Error('Canvas raises event "canvas.interacted" when interaction is off');
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
                        task: jobInstance.task,
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
                    label: labels
                        .filter((label: any) => label.id === activeLabelID)[0],
                    shapeType: ShapeType.POLYGON,
                    points: result.flat(),
                    occluded: false,
                    zOrder: (e as CustomEvent).detail.zOrder,
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
                        label: labels
                            .filter((label: any) => label.id === activeLabelID)[0],
                        shapeType: ShapeType.POLYGON,
                        points: result.flat(),
                        occluded: false,
                        zOrder: (e as CustomEvent).detail.zOrder,
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

    private setActiveInteractor = (key: string): void => {
        const { interactors } = this.props;
        this.setState({
            activeInteractor: interactors.filter(
                (interactor: Model) => interactor.id === key,
            )[0],
        });
    };

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
                            filterOption={
                                (input: string, option: React.ReactElement<OptionProps>) => {
                                    const { children } = option.props;
                                    if (typeof (children) === 'string') {
                                        return children.toLowerCase().includes(input.toLowerCase());
                                    }

                                    return false;
                                }
                            }
                            value={`${activeLabelID}`}
                            onChange={(value: string) => {
                                this.setState({ activeLabelID: +value });
                            }}
                        >
                            {
                                labels.map((label: any) => (
                                    <Select.Option key={label.id} value={`${label.id}`}>
                                        {label.name}
                                    </Select.Option>
                                ))
                            }
                        </Select>
                    </Col>
                </Row>
            </>
        );
    }

    private renderInteractorBlock(): JSX.Element {
        const { interactors, canvasInstance, onInteractionStart } = this.props;
        const { activeInteractor, activeLabelID, fetching } = this.state;

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
                            {interactors.map((interactor: Model): JSX.Element => (
                                <Select.Option title={interactor.description} key={interactor.id}>
                                    {interactor.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
                <Row type='flex' align='middle' justify='center'>
                    <Col offset={4} span={16}>
                        <Button
                            loading={fetching}
                            className='cvat-tools-interact-button'
                            disabled={!activeInteractor || fetching}
                            onClick={() => {
                                if (activeInteractor) {
                                    canvasInstance.cancel();
                                    canvasInstance.interact({
                                        shapeType: 'points',
                                        minPosVertices: 4, // TODO: Add parameter to interactor
                                        enabled: true,
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

    private renderPopoverContent(): JSX.Element {
        return (
            <div className='cvat-tools-control-popover-content'>
                <Row type='flex' justify='start'>
                    <Col>
                        <Text className='cvat-text-color' strong>AI Tools</Text>
                    </Col>
                </Row>
                { this.renderLabelBlock() }
                { this.renderInteractorBlock() }
            </div>
        );
    }

    public render(): JSX.Element | null {
        const { interactors, isInteraction, canvasInstance } = this.props;
        const { fetching } = this.state;

        if (!interactors.length) return null;

        const dynamcPopoverPros = isInteraction ? {
            overlayStyle: {
                display: 'none',
            },
        } : {};

        const dynamicIconProps = isInteraction ? {
            className: 'cvat-active-canvas-control cvat-tools-control',
            onClick: (): void => {
                canvasInstance.interact({ enabled: false });
            },
        } : {
            className: 'cvat-tools-control',
        };

        return (
            <>
                <Modal
                    title='Interaction request'
                    zIndex={Number.MAX_SAFE_INTEGER}
                    visible={fetching}
                    closable={false}
                    footer={[]}

                >
                    <Text>Waiting for a server response..</Text>
                    <Icon style={{ marginLeft: '10px' }} type='loading' />
                </Modal>
                <Popover
                    {...dynamcPopoverPros}
                    placement='right'
                    overlayClassName='cvat-tools-control-popover'
                    content={interactors.length && this.renderPopoverContent()}
                >
                    <Icon {...dynamicIconProps} component={AIToolsIcon} />
                </Popover>
            </>
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ToolsControlComponent);
