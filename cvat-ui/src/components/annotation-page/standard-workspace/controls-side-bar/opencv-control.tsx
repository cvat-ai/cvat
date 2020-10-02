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
import notification from 'antd/lib/notification';

import { OpenCVIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import { CombinedState, ActiveControl } from 'reducers/interfaces';
import OpenCVWrapper from 'utils/opencv-wrapper';

interface Props {
    labels: any[];
    canvasInstance: Canvas;
    isActivated: boolean;
}

interface State {
    libraryInitialized: boolean;
    initializationError: boolean;
    initializationProgress: number;
    activeLabelID: number;
}

function mapStateToProps(state: CombinedState): Props {
    const { annotation } = state;
    const { job, canvas } = annotation;
    const { activeControl } = canvas;

    return {
        labels: job.labels,
        canvasInstance: canvas.instance,
        isActivated: activeControl === ActiveControl.OPENCV_TOOLS,
    };
}

class OpenCVControlComponent extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        const { labels } = props;
        this.state = {
            libraryInitialized: false,
            initializationError: false,
            initializationProgress: -1,
            activeLabelID: labels[0].id,
        };
    }

    private renderDrawingContent(): JSX.Element {
        const { activeLabelID } = this.state;
        const { labels } = this.props;

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
                            <Button>
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
                        <Tabs.TabPane key='drawing' tab='Drawing'>
                            { this.renderDrawingContent() }
                        </Tabs.TabPane>
                        <Tabs.TabPane disabled key='image' tab='Image'>

                        </Tabs.TabPane>
                    </Tabs>
                ) : (
                    <>
                        <Row type='flex' justify='center'>
                            <Col>
                                <Button
                                    disabled={initializationProgress !== -1}
                                    className='cvat-opencv-initialization-button'
                                    onClick={async () => {
                                        try {
                                            this.setState({ initializationProgress: 0 });
                                            await OpenCVWrapper.initialize((progress: number) => {
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
                        </Row>
                        { initializationProgress >= 0 && (
                            <Row type='flex' justify='center'>
                                <Col style={{ width: 170 }}>
                                    <Progress
                                        percent={initializationProgress}
                                        size='small'
                                        status={initializationError ? 'exception' : undefined}
                                    />
                                </Col>
                            </Row>
                        )}
                    </>
                )}
            </div>
        );
    }

    public render(): JSX.Element {
        const { isActivated, canvasInstance } = this.props;
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
            <Popover
                {...dynamcPopoverPros}
                placement='right'
                overlayClassName='cvat-opencv-control-popover'
                content={this.renderContent()}
            >
                <Icon {...dynamicIconProps} component={OpenCVIcon} />
            </Popover>
        );
    }
}

export default connect(
    mapStateToProps,
)(OpenCVControlComponent);
