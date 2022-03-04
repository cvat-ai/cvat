// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Popover from 'antd/lib/popover';
import Icon, { AreaChartOutlined, ScissorOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import Tabs from 'antd/lib/tabs';
import Button from 'antd/lib/button';
import Progress from 'antd/lib/progress';
import Select from 'antd/lib/select';
import notification from 'antd/lib/notification';
import message from 'antd/lib/message';

import { OpenCVIcon } from 'icons';
import { Canvas, convertShapesForInteractor } from 'cvat-canvas-wrapper';
import getCore from 'cvat-core-wrapper';
import openCVWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { IntelligentScissors } from 'utils/opencv-wrapper/intelligent-scissors';
import {
    CombinedState, ActiveControl, OpenCVTool, ObjectType, ShapeType, ToolsBlockerState,
} from 'reducers/interfaces';
import {
    interactWithCanvas,
    fetchAnnotationsAsync,
    updateAnnotationsAsync,
    createAnnotationsAsync,
    changeFrameAsync,
    switchNavigationBlocked as switchNavigationBlockedAction,
} from 'actions/annotation-actions';
import LabelSelector from 'components/label-selector/label-selector';
import CVATTooltip from 'components/common/cvat-tooltip';
import ApproximationAccuracy, {
    thresholdFromAccuracy,
} from 'components/annotation-page/standard-workspace/controls-side-bar/approximation-accuracy';
import { ImageProcessing, OpenCVTracker, TrackerModel } from 'utils/opencv-wrapper/opencv-interfaces';
import { switchToolsBlockerState } from 'actions/settings-actions';
import withVisibilityHandling from './handle-popover-visibility';

interface Props {
    labels: any[];
    canvasInstance: Canvas;
    jobInstance: any;
    isActivated: boolean;
    states: any[];
    frame: number;
    curZOrder: number;
    defaultApproxPolyAccuracy: number;
    frameData: any;
    toolsBlockerState: ToolsBlockerState;
    activeControl: ActiveControl;
}

interface DispatchToProps {
    onInteractionStart(activeInteractor: OpenCVTool, activeLabelID: number): void;
    updateAnnotations(statesToUpdate: any[]): void;
    createAnnotations(sessionInstance: any, frame: number, statesToCreate: any[]): void;
    fetchAnnotations(): void;
    changeFrame(toFrame: number, fillBuffer?: boolean, frameStep?: number, forceUpdate?: boolean):void;
    onSwitchToolsBlockerState(toolsBlockerState: ToolsBlockerState):void;
    switchNavigationBlocked(navigationBlocked: boolean): void;
}

interface TrackedShape {
    clientID: number;
    shapePoints: number[];
    trackerModel: TrackerModel;
}

interface State {
    libraryInitialized: boolean;
    initializationError: boolean;
    initializationProgress: number;
    activeLabelID: number;
    approxPolyAccuracy: number;
    activeImageModifiers: ImageModifier[];
    mode: 'interaction' | 'tracking';
    trackedShapes: TrackedShape[];
    activeTracker: OpenCVTracker | null;
    trackers: OpenCVTracker[]
}

interface ImageModifier {
    modifier: ImageProcessing,
    alias: string
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
                frame: { number: frame, data: frameData },
            },
        },
        settings: {
            workspace: { defaultApproxPolyAccuracy, toolsBlockerState },
        },
    } = state;

    return {
        isActivated: activeControl === ActiveControl.OPENCV_TOOLS,
        activeControl,
        canvasInstance: canvasInstance as Canvas,
        defaultApproxPolyAccuracy,
        jobInstance,
        curZOrder,
        labels,
        states,
        frame,
        frameData,
        toolsBlockerState,
    };
}

const mapDispatchToProps = {
    onInteractionStart: interactWithCanvas,
    updateAnnotations: updateAnnotationsAsync,
    fetchAnnotations: fetchAnnotationsAsync,
    createAnnotations: createAnnotationsAsync,
    changeFrame: changeFrameAsync,
    onSwitchToolsBlockerState: switchToolsBlockerState,
    switchNavigationBlocked: switchNavigationBlockedAction,
};

class OpenCVControlComponent extends React.PureComponent<Props & DispatchToProps, State> {
    private activeTool: IntelligentScissors | null;
    private latestPoints: number[];
    private canvasForceUpdateWasEnabled: boolean;

    public constructor(props: Props & DispatchToProps) {
        super(props);
        const { labels, defaultApproxPolyAccuracy } = props;
        this.activeTool = null;
        this.latestPoints = [];
        this.canvasForceUpdateWasEnabled = false;

        this.state = {
            libraryInitialized: openCVWrapper.isInitialized,
            initializationError: false,
            initializationProgress: -1,
            approxPolyAccuracy: defaultApproxPolyAccuracy,
            activeLabelID: labels.length ? labels[0].id : null,
            activeImageModifiers: [],
            mode: 'interaction',
            trackedShapes: [],
            trackers: openCVWrapper.isInitialized ? Object.values(openCVWrapper.tracking) : [],
            activeTracker: openCVWrapper.isInitialized ? Object.values(openCVWrapper.tracking)[0] : null,
        };
    }

    public componentDidMount(): void {
        const { canvasInstance } = this.props;
        canvasInstance.html().addEventListener('canvas.interacted', this.interactionListener);
        canvasInstance.html().addEventListener('canvas.setup', this.runImageModifier);
    }

    public componentDidUpdate(prevProps: Props, prevState: State): void {
        const { approxPolyAccuracy } = this.state;
        const {
            isActivated, defaultApproxPolyAccuracy, canvasInstance, toolsBlockerState,
        } = this.props;

        if (!prevProps.isActivated && isActivated) {
            // reset flags & states before using a tool
            this.latestPoints = [];
            this.setState({
                approxPolyAccuracy: defaultApproxPolyAccuracy,
            });
            if (this.activeTool) {
                this.activeTool.switchBlockMode(toolsBlockerState.algorithmsLocked);
                this.activeTool.reset();
            }
        }

        if (prevState.approxPolyAccuracy !== approxPolyAccuracy) {
            if (isActivated) {
                const approx = openCVWrapper.contours.approxPoly(
                    this.latestPoints,
                    thresholdFromAccuracy(approxPolyAccuracy),
                );
                canvasInstance.interact({
                    enabled: true,
                    intermediateShape: {
                        shapeType: ShapeType.POLYGON,
                        points: approx.flat(),
                    },
                });
            }
        }
        if (prevProps.toolsBlockerState.algorithmsLocked !== toolsBlockerState.algorithmsLocked &&
            !!this.activeTool?.switchBlockMode) {
            this.activeTool.switchBlockMode(toolsBlockerState.algorithmsLocked);
        }
        this.checkTrackedStates(prevProps);
    }

    public componentWillUnmount(): void {
        const { canvasInstance } = this.props;
        canvasInstance.html().removeEventListener('canvas.interacted', this.interactionListener);
        canvasInstance.html().removeEventListener('canvas.setup', this.runImageModifier);
    }

    private interactionListener = async (e: Event): Promise<void> => {
        const { mode } = this.state;

        if (mode === 'interaction') {
            await this.onInteraction(e);
        }

        if (mode === 'tracking') {
            await this.onTracking(e);
        }
    };

    private onInteraction = async (e: Event): Promise<void> => {
        const { approxPolyAccuracy } = this.state;
        const {
            createAnnotations, isActivated, jobInstance, frame, labels, curZOrder, canvasInstance, toolsBlockerState,
        } = this.props;
        const { activeLabelID } = this.state;
        if (!isActivated || !this.activeTool) {
            return;
        }

        const {
            shapesUpdated, isDone, threshold, shapes,
        } = (e as CustomEvent).detail;
        const pressedPoints = convertShapesForInteractor(shapes, 0).flat();
        try {
            if (shapesUpdated) {
                this.latestPoints = await this.runCVAlgorithm(pressedPoints,
                    toolsBlockerState.algorithmsLocked ? 0 : threshold);
                let points = [];
                if (toolsBlockerState.algorithmsLocked && this.latestPoints.length > 2) {
                    // disable approximation for lastest two points to disable fickering
                    const [x, y] = this.latestPoints.slice(-2);
                    this.latestPoints.splice(this.latestPoints.length - 2, 2);
                    points = openCVWrapper.contours.approxPoly(
                        this.latestPoints,
                        thresholdFromAccuracy(approxPolyAccuracy),
                        false,
                    );
                    points.push([x, y]);
                } else {
                    points = openCVWrapper.contours.approxPoly(
                        this.latestPoints,
                        thresholdFromAccuracy(approxPolyAccuracy),
                        false,
                    );
                }
                canvasInstance.interact({
                    enabled: true,
                    intermediateShape: {
                        shapeType: ShapeType.POLYGON,
                        points: points.flat(),
                    },
                });
            }

            if (isDone) {
                // need to recalculate without the latest sliding point
                const finalPoints = await this.runCVAlgorithm(pressedPoints,
                    toolsBlockerState.algorithmsLocked ? 0 : threshold);
                const finalObject = new core.classes.ObjectState({
                    frame,
                    objectType: ObjectType.SHAPE,
                    shapeType: ShapeType.POLYGON,
                    label: labels.filter((label: any) => label.id === activeLabelID)[0],
                    points: openCVWrapper.contours
                        .approxPoly(finalPoints, thresholdFromAccuracy(approxPolyAccuracy))
                        .flat(),
                    occluded: false,
                    zOrder: curZOrder,
                });
                createAnnotations(jobInstance, frame, [finalObject]);
            }
        } catch (error) {
            notification.error({
                description: error.toString(),
                message: 'OpenCV.js processing error occured',
                className: 'cvat-notification-notice-opencv-processing-error',
            });
        }
    };

    private onTracking = async (e: Event): Promise<void> => {
        const {
            isActivated, jobInstance, frame, curZOrder, fetchAnnotations,
        } = this.props;

        if (!isActivated) {
            return;
        }

        const { activeLabelID, trackedShapes, activeTracker } = this.state;
        const [label] = jobInstance.labels.filter((_label: any): boolean => _label.id === activeLabelID);

        const { isDone, shapesUpdated } = (e as CustomEvent).detail;
        if (!isDone || !shapesUpdated || !activeTracker) {
            return;
        }

        try {
            const { points } = (e as CustomEvent).detail.shapes[0];
            const imageData = this.getCanvasImageData();
            const trackerModel = activeTracker.model();
            trackerModel.init(imageData, points);
            const state = new core.classes.ObjectState({
                shapeType: ShapeType.RECTANGLE,
                objectType: ObjectType.TRACK,
                zOrder: curZOrder,
                label,
                points,
                frame,
                occluded: false,
                attributes: {},
                descriptions: [`Trackable (${activeTracker.name})`],
            });
            const [clientID] = await jobInstance.annotations.put([state]);
            this.setState({
                trackedShapes: [
                    ...trackedShapes,
                    {
                        clientID,
                        trackerModel,
                        shapePoints: points,
                    },
                ],
            });

            // update annotations on a canvas
            fetchAnnotations();
        } catch (err) {
            notification.error({
                description: err.toString(),
                message: 'Tracking error occured',
            });
        }
    };

    private getCanvasImageData = ():ImageData => {
        const canvas: HTMLCanvasElement | null = window.document.getElementById('cvat_canvas_background') as
        | HTMLCanvasElement
        | null;
        if (!canvas) {
            throw new Error('Element #cvat_canvas_background was not found');
        }
        const { width, height } = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Canvas context is empty');
        }
        return context.getImageData(0, 0, width, height);
    };

    private onChangeToolsBlockerState = (event:string):void => {
        const {
            isActivated, toolsBlockerState, onSwitchToolsBlockerState, canvasInstance,
        } = this.props;
        if (isActivated && event === 'keyup') {
            onSwitchToolsBlockerState({ algorithmsLocked: !toolsBlockerState.algorithmsLocked });
            canvasInstance.interact({
                enabled: true,
                crosshair: toolsBlockerState.algorithmsLocked,
                enableThreshold: toolsBlockerState.algorithmsLocked,
                onChangeToolsBlockerState: this.onChangeToolsBlockerState,
            });
        }
    };

    private runImageModifier = async ():Promise<void> => {
        const { activeImageModifiers } = this.state;
        const {
            frameData, states, curZOrder, canvasInstance, frame,
        } = this.props;

        try {
            if (activeImageModifiers.length !== 0 && activeImageModifiers[0].modifier.currentProcessedImage !== frame) {
                this.enableCanvasForceUpdate();
                const imageData = this.getCanvasImageData();
                const newImageData = activeImageModifiers
                    .reduce((oldImageData, activeImageModifier) => activeImageModifier
                        .modifier.processImage(oldImageData, frame), imageData);
                const imageBitmap = await createImageBitmap(newImageData);
                frameData.imageData = imageBitmap;
                canvasInstance.setup(frameData, states, curZOrder);
            }
        } catch (error) {
            notification.error({
                description: error.toString(),
                message: 'OpenCV.js processing error occured',
                className: 'cvat-notification-notice-opencv-processing-error',
            });
        } finally {
            this.disableCanvasForceUpdate();
        }
    };

    private applyTracking = (imageData: ImageData, shape: TrackedShape,
        objectState: any): Promise<void> => new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const stateIsRelevant =
                    objectState.points.length === shape.shapePoints.length &&
                    objectState.points.every(
                        (coord: number, index: number) => coord === shape.shapePoints[index],
                    );
                if (!stateIsRelevant) {
                    shape.trackerModel.reinit(objectState.points);
                    shape.shapePoints = objectState.points;
                }
                const { updated, points } = shape.trackerModel.update(imageData);
                if (updated) {
                    objectState.points = points;
                    objectState.save().then(() => {
                        shape.shapePoints = points;
                    }).catch((error) => {
                        reject(error);
                    });
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });

    private setActiveTracker = (value: string): void => {
        const { trackers } = this.state;
        this.setState({
            activeTracker: trackers.filter((tracker: OpenCVTracker) => tracker.name === value)[0],
        });
    };

    private checkTrackedStates(prevProps: Props): void {
        const {
            frame,
            states: objectStates,
            fetchAnnotations,
            switchNavigationBlocked,
        } = this.props;
        const { trackedShapes } = this.state;
        if (prevProps.frame !== frame && trackedShapes.length) {
            type AccumulatorType = {
                [index: string]: TrackedShape[];
            };
            const trackingData = trackedShapes.reduce<AccumulatorType>(
                (acc: AccumulatorType, trackedShape: TrackedShape): AccumulatorType => {
                    const [clientState] = objectStates.filter(
                        (_state: any): boolean => _state.clientID === trackedShape.clientID,
                    );
                    if (
                        !clientState ||
                        clientState.keyframes.prev !== frame - 1 ||
                        clientState.keyframes.last >= frame
                    ) {
                        return acc;
                    }

                    const { name: trackerName } = trackedShape.trackerModel;
                    if (!acc[trackerName]) {
                        acc[trackerName] = [];
                    }
                    acc[trackerName].push(trackedShape);
                    return acc;
                }, {},
            );

            if (Object.keys(trackingData).length === 0) {
                return;
            }

            try {
                switchNavigationBlocked(true);
                for (const trackerID of Object.keys(trackingData)) {
                    const numOfObjects = trackingData[trackerID].length;
                    const hideMessage = message.loading(
                        `${trackerID}: ${numOfObjects} ${
                            numOfObjects > 1 ? 'objects are' : 'object is'
                        } being tracked..`,
                        0,
                    );
                    const imageData = this.getCanvasImageData();
                    for (const shape of trackingData[trackerID]) {
                        const [objectState] = objectStates.filter(
                            (_state: any): boolean => _state.clientID === shape.clientID,
                        );

                        this.applyTracking(imageData, shape, objectState)
                            .catch((error) => {
                                notification.error({
                                    message: 'Tracking error',
                                    description: error.toString(),
                                });
                            });
                    }
                    setTimeout(() => {
                        if (hideMessage) hideMessage();
                    });
                }
            } finally {
                setTimeout(() => {
                    fetchAnnotations();
                    switchNavigationBlocked(false);
                });
            }
        }
    }

    private async runCVAlgorithm(pressedPoints: number[], threshold: number): Promise<number[]> {
        // Getting image data
        const canvas: HTMLCanvasElement | undefined = window.document.getElementById('cvat_canvas_background') as
            | HTMLCanvasElement
            | undefined;
        if (!canvas) {
            throw new Error('Element #cvat_canvas_background was not found');
        }
        if (!this.activeTool || pressedPoints.length === 0) return [];

        const { width, height } = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Canvas context is empty');
        }
        let imageData;
        const [x, y] = pressedPoints.slice(-2);
        const startX = Math.round(Math.max(0, x - threshold));
        const startY = Math.round(Math.max(0, y - threshold));
        if (threshold !== 0) {
            const segmentWidth = Math.min(2 * threshold, width - startX);
            const segmentHeight = Math.min(2 * threshold, height - startY);
            imageData = context.getImageData(startX, startY, segmentWidth, segmentHeight);
        } else {
            imageData = context.getImageData(0, 0, width, height);
        }
        // Handling via OpenCV.js
        const points = await this.activeTool.run(pressedPoints, imageData, startX, startY);
        return points;
    }

    private imageModifier(alias: string): ImageProcessing | null {
        const { activeImageModifiers } = this.state;
        return activeImageModifiers.find((imageModifier) => imageModifier.alias === alias)?.modifier || null;
    }

    private disableImageModifier(alias: string):void {
        const { activeImageModifiers } = this.state;
        const index = activeImageModifiers.findIndex((imageModifier) => imageModifier.alias === alias);
        if (index !== -1) {
            activeImageModifiers.splice(index, 1);
            this.setState({
                activeImageModifiers: [...activeImageModifiers],
            });
        }
    }

    private enableImageModifier(modifier: ImageProcessing, alias: string): void {
        this.setState((prev: State) => ({
            ...prev,
            activeImageModifiers: [...prev.activeImageModifiers, { modifier, alias }],
        }), () => {
            this.runImageModifier();
        });
    }

    private enableCanvasForceUpdate():void {
        const { canvasInstance } = this.props;
        canvasInstance.configure({ forceFrameUpdate: true });
        this.canvasForceUpdateWasEnabled = true;
    }

    private disableCanvasForceUpdate():void {
        if (this.canvasForceUpdateWasEnabled) {
            const { canvasInstance } = this.props;
            canvasInstance.configure({ forceFrameUpdate: false });
            this.canvasForceUpdateWasEnabled = false;
        }
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
                                    this.setState({ mode: 'interaction' });
                                    this.activeTool = openCVWrapper.segmentation
                                        .intelligentScissorsFactory(this.onChangeToolsBlockerState);
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

    private renderImageContent():JSX.Element {
        return (
            <Row justify='start'>
                <Col>
                    <CVATTooltip title='Histogram equalization' className='cvat-opencv-image-tool'>
                        <Button
                            className={this.imageModifier('histogram') ? 'cvat-opencv-image-tool-active' : ''}
                            onClick={(e: React.MouseEvent<HTMLElement>) => {
                                const modifier = this.imageModifier('histogram');
                                if (!modifier) {
                                    this.enableImageModifier(openCVWrapper.imgproc.hist(), 'histogram');
                                } else {
                                    const button = e.target as HTMLElement;
                                    button.blur();
                                    this.disableImageModifier('histogram');
                                    const { changeFrame } = this.props;
                                    const { frame } = this.props;
                                    this.enableCanvasForceUpdate();
                                    changeFrame(frame, false, 1, true);
                                }
                            }}
                        >
                            <AreaChartOutlined />
                        </Button>
                    </CVATTooltip>
                </Col>
            </Row>
        );
    }

    private renderTrackingContent(): JSX.Element {
        const { activeLabelID, trackers, activeTracker } = this.state;
        const {
            labels, canvasInstance, onInteractionStart, frame, jobInstance,
        } = this.props;
        if (!trackers.length) {
            return (
                <Row justify='center' align='middle' className='cvat-opencv-tracker-content'>
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
                <Row justify='start'>
                    <Col>
                        <Text className='cvat-text-color'>Label</Text>
                    </Col>
                </Row>
                <Row justify='center'>
                    <Col span={24}>
                        <LabelSelector
                            className='cvat-opencv-tracking-label-select'
                            labels={labels}
                            value={activeLabelID}
                            onChange={(value: any) => this.setState({ activeLabelID: value.id })}
                        />
                    </Col>
                </Row>
                <Row justify='start'>
                    <Col>
                        <Text className='cvat-text-color'>Tracker</Text>
                    </Col>
                </Row>
                <Row align='middle' justify='center'>
                    <Col span={24}>
                        <Select
                            className='cvat-opencv-tracker-select'
                            defaultValue={trackers[0].name}
                            onChange={this.setActiveTracker}
                        >
                            {trackers.map(
                                (tracker: OpenCVTracker): JSX.Element => (
                                    <Select.Option value={tracker.name} title={tracker.description} key={tracker.name}>
                                        {tracker.name}
                                    </Select.Option>
                                ),
                            )}
                        </Select>
                    </Col>
                </Row>
                <Row align='middle' justify='end'>
                    <Col>
                        <Button
                            type='primary'
                            className='cvat-tools-track-button'
                            disabled={!activeTracker || frame === jobInstance.stopFrame}
                            onClick={() => {
                                this.setState({ mode: 'tracking' });

                                if (activeTracker) {
                                    canvasInstance.cancel();
                                    canvasInstance.interact({
                                        shapeType: 'rectangle',
                                        enabled: true,
                                    });

                                    onInteractionStart(activeTracker as OpenCVTracker, activeLabelID);
                                    const { onSwitchToolsBlockerState } = this.props;
                                    onSwitchToolsBlockerState({ buttonVisible: false });
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
                        <Tabs.TabPane key='image' tab='Image' className='cvat-opencv-control-tabpane'>
                            {this.renderImageContent()}
                        </Tabs.TabPane>
                        <Tabs.TabPane key='tracking' tab='Tracking' className='cvat-opencv-control-tabpane'>
                            {this.renderTrackingContent()}
                        </Tabs.TabPane>
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
                                            const trackers = Object.values(openCVWrapper.tracking);
                                            this.setState({
                                                libraryInitialized: true,
                                                activeTracker: trackers[0],
                                                trackers,
                                            });
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
        const { libraryInitialized, approxPolyAccuracy, mode } = this.state;
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
            <>
                <CustomPopover
                    {...dynamcPopoverPros}
                    placement='right'
                    overlayClassName='cvat-opencv-control-popover'
                    content={this.renderContent()}
                    afterVisibleChange={() => {
                        if (libraryInitialized !== openCVWrapper.isInitialized) {
                            this.setState({
                                libraryInitialized: openCVWrapper.isInitialized,
                            });
                        }
                    }}
                >
                    <Icon {...dynamicIconProps} component={OpenCVIcon} />
                </CustomPopover>
                {isActivated && mode !== 'tracking' ? (
                    <ApproximationAccuracy
                        approxPolyAccuracy={approxPolyAccuracy}
                        onChange={(value: number) => {
                            this.setState({ approxPolyAccuracy: value });
                        }}
                    />
                ) : null}
            </>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(OpenCVControlComponent);
