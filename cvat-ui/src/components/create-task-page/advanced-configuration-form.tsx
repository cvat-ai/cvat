// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Input from 'antd/lib/input';
import Checkbox from 'antd/lib/checkbox';
import Tooltip from 'antd/lib/tooltip';
import Form, { FormComponentProps } from 'antd/lib/form/Form';
import Text from 'antd/lib/typography/Text';

import patterns from 'utils/validation-patterns';

export interface AdvancedConfiguration {
    bugTracker?: string;
    imageQuality?: number;
    overlapSize?: number;
    segmentSize?: number;
    startFrame?: number;
    stopFrame?: number;
    frameFilter?: string;
    lfs: boolean;
    repository?: string;
    useZipChunks: boolean;
    dataChunkSize?: number;
    useCache: boolean;
}

type Props = FormComponentProps & {
    onSubmit(values: AdvancedConfiguration): void;
    installedGit: boolean;
};

function isPositiveInteger(_: any, value: any, callback: any): void {
    if (!value) {
        callback();
        return;
    }

    const intValue = +value;
    if (Number.isNaN(intValue) || !Number.isInteger(intValue) || intValue < 1) {
        callback('Value must be a positive integer');
    }

    callback();
}

function isNonNegativeInteger(_: any, value: any, callback: any): void {
    if (!value) {
        callback();
        return;
    }

    const intValue = +value;
    if (Number.isNaN(intValue) || intValue < 0) {
        callback('Value must be a non negative integer');
    }

    callback();
}

function isIntegerRange(min: number, max: number, _: any, value: any, callback: any): void {
    if (!value) {
        callback();
        return;
    }

    const intValue = +value;
    if (Number.isNaN(intValue) || !Number.isInteger(intValue) || intValue < min || intValue > max) {
        callback(`Value must be an integer [${min}, ${max}]`);
    }

    callback();
}

class AdvancedConfigurationForm extends React.PureComponent<Props> {
    public submit(): Promise<void> {
        return new Promise((resolve, reject) => {
            const { form, onSubmit } = this.props;

            form.validateFields((error, values): void => {
                if (!error) {
                    const filteredValues = { ...values };
                    delete filteredValues.frameStep;

                    if (values.overlapSize && +values.segmentSize <= +values.overlapSize) {
                        reject(new Error('Segment size must be more than overlap size'));
                    }

                    if (
                        typeof values.startFrame !== 'undefined' &&
                        typeof values.stopFrame !== 'undefined' &&
                        +values.stopFrame < +values.startFrame
                    ) {
                        reject(new Error('Stop frame must be more or equal start frame'));
                    }

                    onSubmit({
                        ...values,
                        frameFilter: values.frameStep ? `step=${values.frameStep}` : undefined,
                    });
                    resolve();
                } else {
                    reject();
                }
            });
        });
    }

    public resetFields(): void {
        const { form } = this.props;
        form.resetFields();
    }

    private renderImageQuality(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label={<span>Image quality</span>}>
                <Tooltip title='Defines image quality level' mouseLeaveDelay={0}>
                    {form.getFieldDecorator('imageQuality', {
                        initialValue: 70,
                        rules: [
                            {
                                required: true,
                                message: 'The field is required.',
                            },
                            {
                                validator: isIntegerRange.bind(null, 5, 100),
                            },
                        ],
                    })(<Input size='large' type='number' suffix={<Icon type='percentage' />} />)}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderOverlap(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label={<span>Overlap size</span>}>
                <Tooltip title='Defines a number of intersected frames between different segments' mouseLeaveDelay={0}>
                    {form.getFieldDecorator('overlapSize', {
                        rules: [
                            {
                                validator: isNonNegativeInteger,
                            },
                        ],
                    })(<Input size='large' type='number' />)}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderSegmentSize(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label={<span>Segment size</span>}>
                <Tooltip title='Defines a number of frames in a segment' mouseLeaveDelay={0}>
                    {form.getFieldDecorator('segmentSize', {
                        rules: [
                            {
                                validator: isPositiveInteger,
                            },
                        ],
                    })(<Input size='large' type='number' />)}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderStartFrame(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label={<span>Start frame</span>}>
                {form.getFieldDecorator('startFrame', {
                    rules: [
                        {
                            validator: isNonNegativeInteger,
                        },
                    ],
                })(<Input size='large' type='number' min={0} step={1} />)}
            </Form.Item>
        );
    }

    private renderStopFrame(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label={<span>Stop frame</span>}>
                {form.getFieldDecorator('stopFrame', {
                    rules: [
                        {
                            validator: isNonNegativeInteger,
                        },
                    ],
                })(<Input size='large' type='number' min={0} step={1} />)}
            </Form.Item>
        );
    }

    private renderFrameStep(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label={<span>Frame step</span>}>
                {form.getFieldDecorator('frameStep', {
                    rules: [
                        {
                            validator: isPositiveInteger,
                        },
                    ],
                })(<Input size='large' type='number' min={1} step={1} />)}
            </Form.Item>
        );
    }

    private renderGitLFSBox(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item help='If annotation files are large, you can use git LFS feature'>
                {form.getFieldDecorator('lfs', {
                    valuePropName: 'checked',
                    initialValue: false,
                })(
                    <Checkbox>
                        <Text className='cvat-text-color'>Use LFS (Large File Support):</Text>
                    </Checkbox>,
                )}
            </Form.Item>
        );
    }

    private renderGitRepositoryURL(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item
                hasFeedback
                label={<span>Dataset repository URL</span>}
                extra='Attach a repository to store annotations there'
            >
                {form.getFieldDecorator('repository', {
                    rules: [
                        {
                            validator: (_, value, callback): void => {
                                if (!value) {
                                    callback();
                                } else {
                                    const [url, path] = value.split(/\s+/);
                                    if (!patterns.validateURL.pattern.test(url)) {
                                        callback('Git URL is not a valid');
                                    }

                                    if (path && !patterns.validatePath.pattern.test(path)) {
                                        callback('Git path is not a valid');
                                    }

                                    callback();
                                }
                            },
                        },
                    ],
                })(
                    <Input
                        size='large'
                        placeholder='e.g. https//github.com/user/repos [annotation/<anno_file_name>.zip]'
                    />,
                )}
            </Form.Item>
        );
    }

    private renderGit(): JSX.Element {
        return (
            <>
                <Row>
                    <Col>{this.renderGitRepositoryURL()}</Col>
                </Row>
                <Row>
                    <Col>{this.renderGitLFSBox()}</Col>
                </Row>
            </>
        );
    }

    private renderBugTracker(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item
                hasFeedback
                label={<span>Issue tracker</span>}
                extra='Attach issue tracker where the task is described'
            >
                {form.getFieldDecorator('bugTracker', {
                    rules: [
                        {
                            validator: (_, value, callback): void => {
                                if (value && !patterns.validateURL.pattern.test(value)) {
                                    callback('Issue tracker must be URL');
                                } else {
                                    callback();
                                }
                            },
                        },
                    ],
                })(<Input size='large' />)}
            </Form.Item>
        );
    }

    private renderUzeZipChunks(): JSX.Element {
        const { form } = this.props;
        return (
            <Form.Item help='Force to use zip chunks as compressed data. Actual for videos only.'>
                {form.getFieldDecorator('useZipChunks', {
                    initialValue: true,
                    valuePropName: 'checked',
                })(
                    <Checkbox>
                        <Text className='cvat-text-color'>Use zip chunks</Text>
                    </Checkbox>,
                )}
            </Form.Item>
        );
    }

    private renderCreateTaskMethod(): JSX.Element {
        const { form } = this.props;
        return (
            <Form.Item help='Using cache to store data.'>
                {form.getFieldDecorator('useCache', {
                    initialValue: true,
                    valuePropName: 'checked',
                })(
                    <Checkbox>
                        <Text className='cvat-text-color'>Use cache</Text>
                    </Checkbox>,
                )}
            </Form.Item>
        );
    }

    private renderChunkSize(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label={<span>Chunk size</span>}>
                <Tooltip
                    title={
                        <>
                            Defines a number of frames to be packed in a chunk when send from client to server. Server
                            defines automatically if empty.
                            <br />
                            Recommended values:
                            <br />
                            1080p or less: 36
                            <br />
                            2k or less: 8 - 16
                            <br />
                            4k or less: 4 - 8
                            <br />
                            More: 1 - 4
                        </>
                    }
                    mouseLeaveDelay={0}
                >
                    {form.getFieldDecorator('dataChunkSize', {
                        rules: [
                            {
                                validator: isPositiveInteger,
                            },
                        ],
                    })(<Input size='large' type='number' />)}
                </Tooltip>
            </Form.Item>
        );
    }

    public render(): JSX.Element {
        const { installedGit } = this.props;

        return (
            <Form>
                <Row>
                    <Col>{this.renderUzeZipChunks()}</Col>
                </Row>

                <Row>
                    <Col>{this.renderCreateTaskMethod()}</Col>
                </Row>

                <Row type='flex' justify='start'>
                    <Col span={7}>{this.renderImageQuality()}</Col>
                    <Col span={7} offset={1}>
                        {this.renderOverlap()}
                    </Col>
                    <Col span={7} offset={1}>
                        {this.renderSegmentSize()}
                    </Col>
                </Row>

                <Row type='flex' justify='start'>
                    <Col span={7}>{this.renderStartFrame()}</Col>
                    <Col span={7} offset={1}>
                        {this.renderStopFrame()}
                    </Col>
                    <Col span={7} offset={1}>
                        {this.renderFrameStep()}
                    </Col>
                </Row>

                <Row type='flex' justify='start'>
                    <Col span={7}>{this.renderChunkSize()}</Col>
                </Row>

                {installedGit ? this.renderGit() : null}

                <Row>
                    <Col>{this.renderBugTracker()}</Col>
                </Row>
            </Form>
        );
    }
}

export default Form.create<Props>()(AdvancedConfigurationForm);
