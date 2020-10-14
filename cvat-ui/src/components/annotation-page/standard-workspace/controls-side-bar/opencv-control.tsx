// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Select, { OptionProps } from 'antd/lib/select';
import Tooltip from 'antd/lib/tooltip';
import Popover from 'antd/lib/popover';
import Icon from 'antd/lib/icon';
import Text from 'antd/lib/typography/Text';
import Tabs from 'antd/lib/tabs';
import Button from 'antd/lib/button';
import Progress from 'antd/lib/progress';
import Modal from 'antd/lib/modal';
import notification from 'antd/lib/notification';

import { OpenCVIcon } from 'icons';
import { Canvas, convertShapesForInteractor } from 'cvat-canvas-wrapper';
import getCore from 'cvat-core-wrapper';
import openCVWrapper, { Scissors, ScissorsState } from 'utils/opencv-wrapper';
import {
    CombinedState,
    ActiveControl,
    OpenCVTool,
    ObjectType,
} from 'reducers/interfaces';
import {
    interactWithCanvas,
    fetchAnnotationsAsync,
    updateAnnotationsAsync,
    createAnnotationsAsync,
} from 'actions/annotation-actions';

interface Props {
    labels: any[];
    canvasInstance: Canvas;
    jobInstance: any;
    isActivated: boolean;
    states: any[];
    frame: number;
    curZOrder: number;
}

interface DispatchToProps {
    onInteractionStart(activeInteractor: OpenCVTool, activeLabelID: number): void;
    updateAnnotations(statesToUpdate: any[]): void;
    createAnnotations(sessionInstance: any, frame: number, statesToCreate: any[]): void;
    fetchAnnotations(): void;
}

interface State {
    libraryInitialized: boolean;
    initializationError: boolean;
    initializationProgress: number;
    activeLabelID: number;
    processing: boolean;
}

const core = getCore();

function mapStateToProps(state: CombinedState): Props {
    const {
        annotation: {
            annotations: {
                states,
                zLayer: {
                    cur: curZOrder,
                },
            },
            job: {
                instance: jobInstance,
                labels,
            },
            canvas: {
                activeControl,
                instance: canvasInstance,
            },
            player: {
                frame: {
                    number: frame,
                },
            },
        },
    } = state;

    return {
        isActivated: activeControl === ActiveControl.OPENCV_TOOLS,
        canvasInstance,
        jobInstance,
        curZOrder,
        labels,
        states,
        frame,
    };
}

const mapDispatchToProps = {
    onInteractionStart: interactWithCanvas,
    updateAnnotations: updateAnnotationsAsync,
    fetchAnnotations: fetchAnnotationsAsync,
    createAnnotations: createAnnotationsAsync,
};


class OpenCVControlComponent extends React.PureComponent<Props & DispatchToProps, State> {
    private activeTool: Scissors | null;
    private toolState: ScissorsState | null;
    private interactiveStateID: number | null;
    private interactionIsDone: boolean;
    private interactionIsAborted: boolean;

    public constructor(props: Props & DispatchToProps) {
        super(props);
        const { labels } = props;

        this.activeTool = null;
        this.toolState = null;
        this.interactiveStateID = null;
        this.interactionIsDone = false;
        this.interactionIsAborted = false;

        this.state = {
            libraryInitialized: true,
            initializationError: false,
            initializationProgress: -1,
            activeLabelID: labels[0].id,
            processing: false,
        };
    }

    public componentDidMount(): void {
        const { canvasInstance } = this.props;
        canvasInstance.html().addEventListener('canvas.interacted', this.interactionListener);
        canvasInstance.html().addEventListener('canvas.canceled', this.cancelListener);
    }

    public componentDidUpdate(prevProps: Props): void {
        const { isActivated } = this.props;
        if (!prevProps.isActivated && isActivated) {
            // reset flags when before using a tool
            this.interactiveStateID = null;
            this.interactionIsDone = false;
            this.interactionIsAborted = false;
        }
    }

    public componentWillUnmount(): void {
        const { canvasInstance } = this.props;
        canvasInstance.html().removeEventListener('canvas.interacted', this.interactionListener);
        canvasInstance.html().removeEventListener('canvas.canceled', this.cancelListener);
    }

    private getInteractiveState(): any | null {
        const { states } = this.props;
        return states
            .filter((_state: any): boolean => (
                _state.clientID === this.interactiveStateID
            ))[0] || null;
    }

    private cancelListener = async (): Promise<void> => {
        const { processing } = this.state;
        const {
            fetchAnnotations,
            isActivated,
            jobInstance,
            frame,
        } = this.props;

        if (isActivated) {
            if (processing && !this.interactionIsDone) {
                // user pressed ESC
                this.setState({ processing: false });
                this.interactionIsAborted = true;
            }

            if (this.interactiveStateID !== null) {
                const state = this.getInteractiveState();
                this.interactiveStateID = null;
                await state.delete(frame);
                fetchAnnotations();
            }

            await jobInstance.actions.freeze(false);
        }
    };

    private interactionListener = async (e: Event): Promise<void> => {
        const {
            fetchAnnotations,
            updateAnnotations,
            isActivated,
            jobInstance,
            frame,
            labels,
            curZOrder,
        } = this.props;
        const { activeLabelID, processing } = this.state;
        if (!isActivated || !this.activeTool) {
            return;
        }

        this.interactionIsDone = (e as CustomEvent).detail.isDone;
        if (processing) return;

        try {
            let points: number[] = [];
            if ((e as CustomEvent).detail.shapesUpdated) {
                this.setState({ processing: true });
                try {
                    // Getting image data
                    const canvas: HTMLCanvasElement | undefined = window.document
                        .getElementById('cvat_canvas_background') as HTMLCanvasElement | undefined;
                    if (!canvas) {
                        throw new Error('Element #cvat_canvas_background was not found');
                    }

                    const { width, height } = canvas;
                    const context = canvas.getContext('2d');
                    if (!context) {
                        throw new Error('Canvas context is empty');
                    }

                    const imageData = context.getImageData(0, 0, width, height);

                    // Handling via OpenCV.js
                    const result = await this.activeTool.run(
                        convertShapesForInteractor((e as CustomEvent).detail.shapes).flat(),
                        imageData,
                        500,
                        this.toolState,
                    );
                    this.toolState = result.state;
                    points = result.points;

                    // Increasing number of points artificially
                    let minNumberOfPoints = 1;
                    // eslint-disable-next-line: eslintdot-notation
                    if (this.activeTool.params.shape.shapeType === 'polyline') {
                        minNumberOfPoints = 2;
                    } else if (this.activeTool.params.shape.shapeType === 'polygon') {
                        minNumberOfPoints = 3;
                    }
                    while (points.length < minNumberOfPoints * 2) {
                        points.push(...points.slice(points.length - 2));
                    }

                    if (this.interactionIsAborted) {
                        // user has cancelled interaction (for example pressed ESC)
                        // while opencv was processing the request
                        return;
                    }
                } finally {
                    this.setState({ processing: false });
                }
            }

            if (this.interactiveStateID === null) {
                if (!this.interactionIsDone) {
                    await jobInstance.actions.freeze(true);
                }

                const object = new core.classes.ObjectState({
                    ...this.activeTool.params.shape,
                    frame,
                    objectType: ObjectType.SHAPE,
                    label: labels
                        .filter((label: any) => label.id === activeLabelID)[0],
                    points,
                    occluded: false,
                    zOrder: curZOrder,
                });
                // need a clientID of a created object to interact with it further
                // so, we do not use createAnnotationAction
                const [clientID] = await jobInstance.annotations.put([object]);
                this.interactiveStateID = clientID;

                // update annotations on a canvas
                fetchAnnotations();
                return;
            }

            const state = this.getInteractiveState();
            if ((e as CustomEvent).detail.isDone) {
                const finalObject = new core.classes.ObjectState({
                    frame: state.frame,
                    objectType: state.objectType,
                    label: state.label,
                    shapeType: state.shapeType,
                    points: state.points,
                    occluded: state.occluded,
                    zOrder: state.zOrder,
                });
                this.interactiveStateID = null;
                await state.delete(frame);
                await jobInstance.actions.freeze(false);
                await jobInstance.annotations.put([finalObject]);
                fetchAnnotations();
            } else {
                state.points = points;
                updateAnnotations([state]);
                fetchAnnotations();
            }
        } catch (error) {
            notification.error({
                description: error.toString(),
                message: 'Processing error occured',
            });
        } finally {
            this.setState({ processing: false });
        }
    };

    private renderDrawingContent(): JSX.Element {
        const { activeLabelID } = this.state;
        const { labels, canvasInstance, onInteractionStart } = this.props;

        return (
            <>
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
                                labels.map((label: any): JSX.Element => (
                                    <Select.Option key={label.id} value={`${label.id}`}>
                                        {label.name}
                                    </Select.Option>
                                ))
                            }
                        </Select>
                    </Col>
                </Row>
                <Row type='flex' justify='start' className='cvat-opencv-drawing-tools'>
                    <Col>
                        <Tooltip title='Intelligent scissors' className='cvat-opencv-drawing-tool'>
                            <Button
                                onClick={() => {
                                    this.activeTool = openCVWrapper.scissors();
                                    this.toolState = null;
                                    canvasInstance.cancel();
                                    onInteractionStart(this.activeTool, activeLabelID);
                                    canvasInstance.interact({
                                        enabled: true,
                                        ...this.activeTool.params.canvas,
                                    });
                                }}
                            >
                                <Icon type='scissor' />
                            </Button>
                        </Tooltip>
                    </Col>
                </Row>
            </>
        );
    }

    private renderContent(): JSX.Element {
        const { libraryInitialized, initializationProgress, initializationError } = this.state;

        return (
            <div className='cvat-opencv-control-popover-content'>
                <Row type='flex' justify='start'>
                    <Col>
                        <Text className='cvat-text-color' strong>OpenCV.js</Text>
                    </Col>
                </Row>
                { libraryInitialized ? (
                    <Tabs type='card' tabBarGutter={8}>
                        <Tabs.TabPane key='drawing' tab='Drawing' className='cvat-opencv-control-tabpane'>
                            { this.renderDrawingContent() }
                        </Tabs.TabPane>
                        <Tabs.TabPane disabled key='image' tab='Image' className='cvat-opencv-control-tabpane'>

                        </Tabs.TabPane>
                    </Tabs>
                ) : (
                    <>
                        <Row type='flex' justify='start' align='middle'>
                            <Col span={initializationProgress >= 0 ? 17 : 24}>
                                <Button
                                    disabled={initializationProgress !== -1}
                                    className='cvat-opencv-initialization-button'
                                    onClick={async () => {
                                        try {
                                            this.setState({
                                                initializationError: false,
                                                initializationProgress: 0,
                                            });
                                            await openCVWrapper.initialize((progress: number) => {
                                                this.setState({ initializationProgress: progress });
                                            });
                                            this.setState({ libraryInitialized: true });
                                        } catch (error) {
                                            notification.error({
                                                description: error.toString(),
                                                message: 'Could not initialize OpenCV library',
                                            });
                                            this.setState({
                                                initializationError: true,
                                                initializationProgress: -1,
                                            });
                                        }
                                    }}
                                >
                                    Load OpenCV
                                </Button>
                            </Col>
                            { initializationProgress >= 0 && (
                                <Col span={6} offset={1}>
                                    <Progress
                                        width={8 * 5}
                                        percent={initializationProgress}
                                        type='circle'
                                        status={initializationError ? 'exception' : undefined}
                                    />
                                </Col>
                            )}
                        </Row>
                    </>
                )}
            </div>
        );
    }

    public render(): JSX.Element {
        const { isActivated, canvasInstance } = this.props;
        const { processing } = this.state;
        const dynamcPopoverPros = isActivated ? {
            overlayStyle: {
                display: 'none',
            },
        } : {};

        const dynamicIconProps = isActivated ? {
            className: 'cvat-active-canvas-control cvat-opencv-control',
            onClick: (): void => {
                canvasInstance.interact({ enabled: false });
            },
        } : {
            className: 'cvat-tools-control',
        };

        return (
            <>
                <Modal
                    title='The request is being processed'
                    zIndex={Number.MAX_SAFE_INTEGER}
                    visible={processing}
                    closable={false}
                    footer={[]}

                >
                    <Text>OpenCV handles your request. Please wait..</Text>
                    <Icon style={{ marginLeft: '10px' }} type='loading' />
                </Modal>
                <Popover
                    {...dynamcPopoverPros}
                    placement='right'
                    overlayClassName='cvat-opencv-control-popover'
                    content={this.renderContent()}
                >
                    <Icon {...dynamicIconProps} component={OpenCVIcon} />
                </Popover>
            </>
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(OpenCVControlComponent);
