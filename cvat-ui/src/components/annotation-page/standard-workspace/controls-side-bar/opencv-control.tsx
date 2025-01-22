// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
import Alert from 'antd/lib/alert';

import { throttle } from 'lodash';

import { OpenCVIcon } from 'icons';
import { Canvas, convertShapesForInteractor } from 'cvat-canvas-wrapper';
import { getCore, Job, ObjectState } from 'cvat-core-wrapper';
import openCVWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { IntelligentScissors } from 'utils/opencv-wrapper/intelligent-scissors';
import {
    CombinedState, ActiveControl, ObjectType, ShapeType, ToolsBlockerState,
} from 'reducers';
import {
    interactWithCanvas,
    createAnnotationsAsync,
} from 'actions/annotation-actions';
import LabelSelector from 'components/label-selector/label-selector';
import CVATTooltip from 'components/common/cvat-tooltip';
import ApproximationAccuracy, {
    thresholdFromAccuracy,
} from 'components/annotation-page/standard-workspace/controls-side-bar/approximation-accuracy';
import { OpenCVTracker } from 'utils/opencv-wrapper/opencv-interfaces';
import { enableImageFilter as enableImageFilterAction, disableImageFilter as disableImageFilterAction } from 'actions/settings-actions';
import { ImageFilter, ImageFilterAlias, hasFilter } from 'utils/image-processing';
import { openAnnotationsActionModal } from 'components/annotation-page/annotations-actions/annotations-actions-modal';
import withVisibilityHandling from './handle-popover-visibility';

interface Props {
    labels: any[];
    canvasInstance: Canvas;
    canvasReady: boolean;
    jobInstance: Job;
    isActivated: boolean;
    frame: number;
    curZOrder: number;
    defaultApproxPolyAccuracy: number;
    frameData: any;
    toolsBlockerState: ToolsBlockerState;
    activeControl: ActiveControl;
    filters: ImageFilter[];
}

interface DispatchToProps {
    createAnnotations: (states: ObjectState[]) => Promise<void>;
    onInteractionStart: typeof interactWithCanvas;
    enableImageFilter: typeof enableImageFilterAction;
    disableImageFilter: typeof disableImageFilterAction;
}

interface State {
    libraryInitialized: boolean;
    initializationError: boolean;
    initializationProgress: number;
    activeLabelID: number;
    approxPolyAccuracy: number;
    activeTracker: OpenCVTracker | null;
    trackers: OpenCVTracker[];
}

const core = getCore();
const CustomPopover = withVisibilityHandling(Popover, 'opencv-control');

function mapStateToProps(state: CombinedState): Props {
    const {
        annotation: {
            annotations: {
                zLayer: { cur: curZOrder },
            },
            job: { instance: jobInstance, labels },
            canvas: { activeControl, instance: canvasInstance, ready: canvasReady },
            player: {
                frame: { number: frame, data: frameData },
            },
        },
        settings: {
            workspace: { defaultApproxPolyAccuracy, toolsBlockerState },
            imageFilters: filters,
        },
    } = state;

    return {
        isActivated: activeControl === ActiveControl.OPENCV_TOOLS,
        activeControl,
        canvasInstance: canvasInstance as Canvas,
        canvasReady,
        defaultApproxPolyAccuracy,
        jobInstance: jobInstance as Job,
        curZOrder,
        labels,
        frame,
        frameData,
        toolsBlockerState,
        filters,
    };
}

const mapDispatchToProps = {
    onInteractionStart: interactWithCanvas,
    createAnnotations: createAnnotationsAsync,
    enableImageFilter: enableImageFilterAction,
    disableImageFilter: disableImageFilterAction,
};

class OpenCVControlComponent extends React.PureComponent<Props & DispatchToProps, State> {
    private activeTool: IntelligentScissors | null;
    private latestPoints: number[];

    public constructor(props: Props & DispatchToProps) {
        super(props);
        const { labels, defaultApproxPolyAccuracy } = props;
        this.activeTool = null;
        this.latestPoints = [];

        this.state = {
            libraryInitialized: openCVWrapper.isInitialized,
            initializationError: false,
            initializationProgress: -1,
            approxPolyAccuracy: defaultApproxPolyAccuracy,
            activeLabelID: labels.length ? labels[0].id : null,
            trackers: openCVWrapper.isInitialized ? Object.values(openCVWrapper.tracking) : [],
            activeTracker: openCVWrapper.isInitialized ? Object.values(openCVWrapper.tracking)[0] : null,
        };
    }

    public componentDidMount(): void {
        const { canvasInstance } = this.props;
        canvasInstance.html().addEventListener('canvas.interacted', this.interactionListener);
    }

    public componentDidUpdate(prevProps: Props, prevState: State): void {
        const { approxPolyAccuracy } = this.state;
        const {
            isActivated, defaultApproxPolyAccuracy,
            canvasInstance, toolsBlockerState,
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

                // Getting image data
                type CanvasType = HTMLCanvasElement | undefined;
                const canvas: CanvasType = window.document.getElementById('cvat_canvas_background') as CanvasType;
                if (!canvas) {
                    throw new Error('Element #cvat_canvas_background was not found');
                }

                const { width, height } = canvas;
                const context = canvas.getContext('2d');
                if (!context) {
                    throw new Error('Canvas context is empty');
                }
                this.activeTool.setImage(context.getImageData(0, 0, width, height));
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
    }

    public componentWillUnmount(): void {
        const { canvasInstance } = this.props;

        canvasInstance.html().removeEventListener('canvas.interacted', this.interactionListener);
        openCVWrapper.removeProgressCallback();
    }

    private interactionListener = async (e: Event): Promise<void> => {
        await this.onInteraction(e);
    };

    private onInteraction = async (e: Event): Promise<void> => {
        const { approxPolyAccuracy } = this.state;
        const {
            createAnnotations, isActivated, frame,
            labels, curZOrder, canvasInstance, toolsBlockerState,
        } = this.props;

        const { activeLabelID } = this.state;
        if (!isActivated || !this.activeTool) {
            return;
        }

        const { shapesUpdated, isDone, shapes } = (e as CustomEvent).detail;
        const pressedPoints = convertShapesForInteractor(shapes, 'points', 0).flat();
        try {
            if (shapesUpdated) {
                this.latestPoints = await this.runCVAlgorithm(pressedPoints);
                let points = [];
                if (toolsBlockerState.algorithmsLocked && this.latestPoints.length > 2) {
                    // disable approximation for latest two points to disable fickering
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
                const finalPoints = await this.runCVAlgorithm(pressedPoints);
                if (finalPoints.length >= 6) {
                    const finalObject = new core.classes.ObjectState({
                        frame,
                        objectType: ObjectType.SHAPE,
                        shapeType: ShapeType.POLYGON,
                        source: core.enums.Source.SEMI_AUTO,
                        label: labels.filter((label: any) => label.id === activeLabelID)[0],
                        points: openCVWrapper.contours
                            .approxPoly(finalPoints, thresholdFromAccuracy(approxPolyAccuracy))
                            .flat(),
                        occluded: false,
                        zOrder: curZOrder,
                    });
                    createAnnotations([finalObject]);
                }
            }
        } catch (error: any) {
            notification.error({
                description: error.toString(),
                message: 'OpenCV.js processing error occurred',
                className: 'cvat-notification-notice-opencv-processing-error',
            });
        }
    };

    private setActiveTracker = (value: string): void => {
        const { trackers } = this.state;
        this.setState({
            activeTracker: trackers.filter((tracker: OpenCVTracker) => tracker.name === value)[0],
        });
    };

    private async runCVAlgorithm(pressedPoints: number[]): Promise<number[]> {
        if (!this.activeTool || pressedPoints.length === 0) {
            return [];
        }
        const points = await this.activeTool.run(pressedPoints);
        return points;
    }

    private async initializeOpenCV():Promise<void> {
        try {
            this.setState({
                initializationError: false,
                initializationProgress: 0,
            });
            await openCVWrapper.initialize(throttle((progress: number) => {
                this.setState({ initializationProgress: progress });
            }, 500));
            const trackers = Object.values(openCVWrapper.tracking);
            this.setState({
                libraryInitialized: true,
                activeTracker: trackers[0],
                trackers,
            });
        } catch (error: any) {
            notification.error({
                description: error.toString(),
                message: 'Could not initialize OpenCV library',
            });
            this.setState({
                initializationError: true,
                initializationProgress: -1,
            });
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
                                className='cvat-opencv-scissors-tool-button'
                                onClick={() => {
                                    this.activeTool = openCVWrapper.segmentation.intelligentScissorsFactory();

                                    canvasInstance.cancel();
                                    const interactorParameters = this.activeTool.params.canvas;
                                    onInteractionStart(this.activeTool, activeLabelID, interactorParameters);
                                    canvasInstance.interact({
                                        enabled: true,
                                        ...interactorParameters,
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
        const { enableImageFilter, disableImageFilter, filters } = this.props;
        return (
            <Row justify='start'>
                <Col>
                    <CVATTooltip title='Histogram equalization' className='cvat-opencv-image-tool'>
                        <Button
                            className={
                                hasFilter(filters, ImageFilterAlias.HISTOGRAM_EQUALIZATION) ?
                                    'cvat-opencv-histogram-tool-button cvat-opencv-image-tool-active' : 'cvat-opencv-histogram-tool-button'
                            }
                            onClick={(e: React.MouseEvent<HTMLElement>) => {
                                if (!hasFilter(filters, ImageFilterAlias.HISTOGRAM_EQUALIZATION)) {
                                    enableImageFilter({
                                        modifier: openCVWrapper.imgproc.hist(),
                                        alias: ImageFilterAlias.HISTOGRAM_EQUALIZATION,
                                    });
                                } else {
                                    const button = e.target as HTMLElement;
                                    button.blur();
                                    disableImageFilter(ImageFilterAlias.HISTOGRAM_EQUALIZATION);
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
        const { trackers, activeTracker } = this.state;
        const { canvasInstance, frame, jobInstance } = this.props;
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
                    <Col className='cvat-opencv-tracker-help-message'>
                        <Alert type='info' message='The tracker will be applied to drawn rectangles' />
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
                            className='cvat-tools-opencv-track-button'
                            disabled={!activeTracker || frame === jobInstance.stopFrame}
                            onClick={() => {
                                if (activeTracker) {
                                    canvasInstance.cancel();
                                    openAnnotationsActionModal({ defaultAnnotationAction: activeTracker.name });
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
                    <Tabs
                        tabBarGutter={8}
                        items={[{
                            key: 'drawing',
                            label: 'Drawing',
                            children: this.renderDrawingContent(),
                            className: 'cvat-opencv-control-tabpane',
                        }, {
                            key: 'image',
                            label: 'Image',
                            children: this.renderImageContent(),
                            className: 'cvat-opencv-control-tabpane',
                        }, {
                            key: 'tracking',
                            label: 'Tracking',
                            children: this.renderTrackingContent(),
                            className: 'cvat-opencv-control-tabpane',
                        }]}
                    />
                ) : (
                    <Row justify='start' align='middle'>
                        <Col>
                            {
                                initializationProgress >= 0 ?
                                    <Text>OpenCV is loading</Text> : (
                                        <Button
                                            className='cvat-opencv-initialization-button'
                                            onClick={() => { this.initializeOpenCV(); }}
                                        >
                                            Reload OpenCV
                                        </Button>
                                    )
                            }
                        </Col>
                        {initializationProgress >= 0 && (
                            <Col>
                                <Progress
                                    size='small'
                                    style={{ transform: 'scale(0.75)' }}
                                    percent={initializationProgress}
                                    type='circle'
                                    status={initializationError ? 'exception' : undefined}
                                />
                            </Col>
                        )}
                    </Row>
                )}
            </div>
        );
    }

    public render(): JSX.Element {
        const {
            isActivated, canvasInstance, labels, frameData,
        } = this.props;
        const { libraryInitialized, approxPolyAccuracy } = this.state;
        const dynamicPopoverProps = isActivated ?
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
                className: 'cvat-opencv-control',
            };

        return !labels.length || frameData.deleted ? (
            <Icon className='cvat-opencv-control cvat-disabled-canvas-control' component={OpenCVIcon} />
        ) : (
            <>
                <CustomPopover
                    {...dynamicPopoverProps}
                    placement='right'
                    overlayClassName='cvat-opencv-control-popover'
                    content={this.renderContent()}
                    onOpenChange={(visible: boolean) => {
                        const { initializationProgress } = this.state;
                        if (!visible || initializationProgress >= 0) return;

                        if (!openCVWrapper.isInitialized || openCVWrapper.initializationInProgress) {
                            this.initializeOpenCV();
                        } else if (libraryInitialized !== openCVWrapper.isInitialized) {
                            this.setState({
                                libraryInitialized: openCVWrapper.isInitialized,
                                trackers: Object.values(openCVWrapper.tracking),
                                activeTracker: Object.values(openCVWrapper.tracking)[0] || null,
                            });
                        }
                    }}
                >
                    <Icon {...dynamicIconProps} component={OpenCVIcon} />
                </CustomPopover>
                {isActivated ? (
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
