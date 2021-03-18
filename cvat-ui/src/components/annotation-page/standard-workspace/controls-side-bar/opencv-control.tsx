// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Popover from 'antd/lib/popover';
import Icon, { ScissorOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import Tabs from 'antd/lib/tabs';
import Button from 'antd/lib/button';
import Progress from 'antd/lib/progress';
import notification from 'antd/lib/notification';

import { OpenCVIcon } from 'icons';
import { Canvas, convertShapesForInteractor } from 'cvat-canvas-wrapper';
import getCore from 'cvat-core-wrapper';
import openCVWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { IntelligentScissors } from 'utils/opencv-wrapper/intelligent-scissors';
import {
    CombinedState, ActiveControl, OpenCVTool, ObjectType,
} from 'reducers/interfaces';
import {
    interactWithCanvas,
    fetchAnnotationsAsync,
    updateAnnotationsAsync,
    createAnnotationsAsync,
} from 'actions/annotation-actions';
import LabelSelector from 'components/label-selector/label-selector';
import CVATTooltip from 'components/common/cvat-tooltip';
import withVisibilityHandling from './handle-popover-visibility';

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
}

const core = getCore();
const CustomPopover = withVisibilityHandling(Popover, 'opencv-control');

function mapStateToProps(state: CombinedState): Props {
    const {
        annotation: {
            annotations: {
                states,
                zLayer: { cur: curZOrder },
            },
            job: { instance: jobInstance, labels },
            canvas: { activeControl, instance: canvasInstance },
            player: {
                frame: { number: frame },
            },
        },
    } = state;

    return {
        isActivated: activeControl === ActiveControl.OPENCV_TOOLS,
        canvasInstance: canvasInstance as Canvas,
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
    private activeTool: IntelligentScissors | null;
    private interactiveStateID: number | null;
    private interactionIsDone: boolean;

    public constructor(props: Props & DispatchToProps) {
        super(props);
        const { labels } = props;

        this.activeTool = null;
        this.interactiveStateID = null;
        this.interactionIsDone = false;

        this.state = {
            libraryInitialized: openCVWrapper.isInitialized,
            initializationError: false,
            initializationProgress: -1,
            activeLabelID: labels.length ? labels[0].id : null,
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
            if (this.activeTool) {
                this.activeTool.reset();
            }
            this.interactiveStateID = null;
            this.interactionIsDone = false;
        }
    }

    public componentWillUnmount(): void {
        const { canvasInstance } = this.props;
        canvasInstance.html().removeEventListener('canvas.interacted', this.interactionListener);
        canvasInstance.html().removeEventListener('canvas.canceled', this.cancelListener);
    }

    private getInteractiveState(): any | null {
        const { states } = this.props;
        return states.filter((_state: any): boolean => _state.clientID === this.interactiveStateID)[0] || null;
    }

    private cancelListener = async (): Promise<void> => {
        const {
            fetchAnnotations, isActivated, jobInstance, frame,
        } = this.props;

        if (isActivated) {
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
            fetchAnnotations, updateAnnotations, isActivated, jobInstance, frame, labels, curZOrder,
        } = this.props;
        const { activeLabelID } = this.state;
        if (!isActivated || !this.activeTool) {
            return;
        }

        const {
            shapesUpdated, isDone, threshold, shapes,
        } = (e as CustomEvent).detail;
        const pressedPoints = convertShapesForInteractor(shapes, 0).flat();
        this.interactionIsDone = isDone;

        try {
            let points: number[] = [];
            if (shapesUpdated) {
                points = await this.runCVAlgorithm(pressedPoints, threshold);
            }

            if (this.interactiveStateID === null) {
                if (!this.interactionIsDone) {
                    await jobInstance.actions.freeze(true);
                }

                const object = new core.classes.ObjectState({
                    ...this.activeTool.params.shape,
                    frame,
                    objectType: ObjectType.SHAPE,
                    label: labels.filter((label: any) => label.id === activeLabelID)[0],
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
                    // need to recalculate without the latest sliding point
                    points: points = await this.runCVAlgorithm(pressedPoints, threshold),
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
        }
    };

    private async runCVAlgorithm(pressedPoints: number[], threshold: number): Promise<number[]> {
        // Getting image data
        const canvas: HTMLCanvasElement | undefined = window.document.getElementById('cvat_canvas_background') as
            | HTMLCanvasElement
            | undefined;
        if (!canvas) {
            throw new Error('Element #cvat_canvas_background was not found');
        }

        const { width, height } = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Canvas context is empty');
        }

        const [x, y] = pressedPoints.slice(-2);
        const startX = Math.round(Math.max(0, x - threshold));
        const startY = Math.round(Math.max(0, y - threshold));
        const segmentWidth = Math.min(2 * threshold, width - startX);
        const segmentHeight = Math.min(2 * threshold, height - startY);
        const imageData = context.getImageData(startX, startY, segmentWidth, segmentHeight);

        if (!this.activeTool) return [];

        // Handling via OpenCV.js
        const points = await this.activeTool.run(pressedPoints, imageData, startX, startY);

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

        return points;
    }

    private renderDrawingContent(): JSX.Element {
        const { activeLabelID } = this.state;
        const { labels, canvasInstance, onInteractionStart } = this.props;

        return (
            <>
                <Row justify='center'>
                    <Col span={24}>
                        <LabelSelector
                            style={{ width: '100%' }}
                            labels={labels}
                            value={activeLabelID}
                            onChange={(label: any) => this.setState({ activeLabelID: label.id })}
                        />
                    </Col>
                </Row>
                <Row justify='start' className='cvat-opencv-drawing-tools'>
                    <Col>
                        <CVATTooltip title='Intelligent scissors' className='cvat-opencv-drawing-tool'>
                            <Button
                                onClick={() => {
                                    this.activeTool = openCVWrapper.segmentation.intelligentScissorsFactory();
                                    canvasInstance.cancel();
                                    onInteractionStart(this.activeTool, activeLabelID);
                                    canvasInstance.interact({
                                        enabled: true,
                                        ...this.activeTool.params.canvas,
                                    });
                                }}
                            >
                                <ScissorOutlined />
                            </Button>
                        </CVATTooltip>
                    </Col>
                </Row>
            </>
        );
    }

    private renderContent(): JSX.Element {
        const { libraryInitialized, initializationProgress, initializationError } = this.state;

        return (
            <div className='cvat-opencv-control-popover-content'>
                <Row justify='start'>
                    <Col>
                        <Text className='cvat-text-color' strong>
                            OpenCV
                        </Text>
                    </Col>
                </Row>
                {libraryInitialized ? (
                    <Tabs tabBarGutter={8}>
                        <Tabs.TabPane key='drawing' tab='Drawing' className='cvat-opencv-control-tabpane'>
                            {this.renderDrawingContent()}
                        </Tabs.TabPane>
                        <Tabs.TabPane disabled key='image' tab='Image' className='cvat-opencv-control-tabpane' />
                    </Tabs>
                ) : (
                    <>
                        <Row justify='start' align='middle'>
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
                            {initializationProgress >= 0 && (
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
        const { isActivated, canvasInstance, labels } = this.props;
        const dynamcPopoverPros = isActivated ?
            {
                overlayStyle: {
                    display: 'none',
                },
            } :
            {};

        const dynamicIconProps = isActivated ?
            {
                className: 'cvat-opencv-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.interact({ enabled: false });
                },
            } :
            {
                className: 'cvat-tools-control',
            };

        return !labels.length ? (
            <Icon className='cvat-opencv-control cvat-disabled-canvas-control' component={OpenCVIcon} />
        ) : (
            <CustomPopover
                {...dynamcPopoverPros}
                placement='right'
                overlayClassName='cvat-opencv-control-popover'
                content={this.renderContent()}
            >
                <Icon {...dynamicIconProps} component={OpenCVIcon} />
            </CustomPopover>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(OpenCVControlComponent);
