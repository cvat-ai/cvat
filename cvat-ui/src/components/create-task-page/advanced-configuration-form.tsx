import React from 'react';

import {
    Row,
    Col,
    Icon,
    Input,
    Checkbox,
    Tooltip,
} from 'antd';

import Form, { FormComponentProps } from 'antd/lib/form/Form';
import Text from 'antd/lib/typography/Text';

import patterns from '../../utils/validation-patterns';

export interface AdvancedConfiguration {
    bugTracker?: string;
    zOrder: boolean;
    imageQuality?: number;
    overlapSize?: number;
    segmentSize?: number;
    startFrame?: number;
    stopFrame?: number;
    frameFilter?: string;
    lfs: boolean;
    repository?: string;
}

type Props = FormComponentProps & {
    onSubmit(values: AdvancedConfiguration): void
    installedGit: boolean;
};

class AdvancedConfigurationForm extends React.PureComponent<Props> {
    public submit() {
        return new Promise((resolve, reject) => {
            this.props.form.validateFields((error, values) => {
                if (!error) {
                    const filteredValues = { ...values };
                    delete filteredValues.frameStep;

                    this.props.onSubmit({
                        ...values,
                        frameFilter: values.frameStep ? `step=${values.frameStep}` : undefined,
                    });
                    resolve();
                } else {
                    reject();
                }
            });
        })
    }

    public resetFields() {
        this.props.form.resetFields();
    }

    private renderZOrder() {
        return (
            <Form.Item help='Enables order for shapes. Useful for segmentation tasks'>
                {this.props.form.getFieldDecorator('zOrder', {
                    initialValue: false,
                    valuePropName: 'checked',
                })(
                    <Checkbox>
                        <Text className='cvat-black-color'>
                            Z-order
                        </Text>
                    </Checkbox>
                )}
            </Form.Item>
        );
    }

    private renderImageQuality() {
        return (
            <Form.Item label='Image quality'>
                <Tooltip overlay='Defines image compression level'>
                    {this.props.form.getFieldDecorator('imageQuality', {
                        initialValue: 70,
                        rules: [{
                            required: true,
                            message: 'This field is required'
                        }],
                    })(
                        <Input
                            size='large'
                            type='number'
                            min={5}
                            max={100}
                            suffix={<Icon type='percentage'/>}
                        />
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderOverlap() {
        return (
            <Form.Item label='Overlap size'>
                <Tooltip overlay='Defines a number of intersected frames between different segments'>
                    {this.props.form.getFieldDecorator('overlapSize')(
                        <Input size='large' type='number'/>
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderSegmentSize() {
        return (
            <Form.Item label='Segment size'>
                <Tooltip overlay='Defines a number of frames in a segment'>
                    {this.props.form.getFieldDecorator('segmentSize')(
                        <Input size='large' type='number'/>
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderStartFrame() {
        return (
            <Form.Item label='Start frame'>
                {this.props.form.getFieldDecorator('startFrame')(
                    <Input
                        size='large'
                        type='number'
                        min={0}
                        step={1}
                    />
                )}
            </Form.Item>
        );
    }

    private renderStopFrame() {
        return (
            <Form.Item label='Stop frame'>
                {this.props.form.getFieldDecorator('stopFrame')(
                    <Input
                        size='large'
                        type='number'
                        min={0}
                        step={1}
                    />
                )}
            </Form.Item>
        );
    }

    private renderFrameStep() {
        return (
            <Form.Item label='Frame step'>
                {this.props.form.getFieldDecorator('frameStep')(
                    <Input
                        size='large'
                        type='number'
                        min={1}
                        step={1}
                    />
                )}
            </Form.Item>
        );
    }

    private renderGitLFSBox() {
        return (
            <Form.Item help='If annotation files are large, you can use git LFS feature'>
                {this.props.form.getFieldDecorator('lfs', {
                    valuePropName: 'checked',
                    initialValue: false,
                })(
                    <Checkbox>
                        <Text className='cvat-black-color'>
                            Use LFS (Large File Support):
                        </Text>
                    </Checkbox>
                )}
            </Form.Item>
        );
    }

    private renderGitRepositoryURL() {
        return (
            <Form.Item
                hasFeedback
                label='Dataset repository URL'
                extra='Attach a repository to store annotations there'
            >
                {this.props.form.getFieldDecorator('repository', {
                    rules: [{
                        validator: (_, value, callback) => {
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
                        }
                    }]
                })(
                    <Input size='large'
                        placeholder='e.g. https//github.com/user/repos [annotation/<anno_file_name>.zip]'
                    />
                )}
            </Form.Item>
        );
    }

    private renderGit() {
        return (
            <>
                <Row>
                    <Col>
                        {this.renderGitRepositoryURL()}
                    </Col>
                </Row>
                <Row>
                    <Col>
                        {this.renderGitLFSBox()}
                    </Col>
                </Row>
            </>
        );
    }

    private renderBugTracker() {
        return (
            <Form.Item
                hasFeedback
                label='Issue tracker'
                extra='Attach issue tracker where the task is described'
            >
                {this.props.form.getFieldDecorator('bugTracker', {
                    rules: [{
                        validator: (_, value, callback) => {
                            if (value && !patterns.validateURL.pattern.test(value)) {
                                callback('Issue tracker must be URL');
                            } else {
                                callback();
                            }
                        }
                    }]
                })(
                    <Input size='large'/>
                )}
            </Form.Item>
        )
    }

    public render() {
        return (
            <Form>
                <Row><Col>
                    {this.renderZOrder()}
                </Col></Row>

                <Row type='flex' justify='start'>
                    <Col span={7}>
                        {this.renderImageQuality()}
                    </Col>
                    <Col span={7} offset={1}>
                        {this.renderOverlap()}
                    </Col>
                    <Col span={7} offset={1}>
                        {this.renderSegmentSize()}
                    </Col>
                </Row>

                <Row type='flex' justify='start'>
                    <Col span={7}>
                        {this.renderStartFrame()}
                    </Col>
                    <Col span={7} offset={1}>
                        {this.renderStopFrame()}
                    </Col>
                    <Col span={7} offset={1}>
                        {this.renderFrameStep()}
                    </Col>
                </Row>

                { this.props.installedGit ? this.renderGit() : null}

                <Row>
                    <Col>
                       {this.renderBugTracker()}
                    </Col>
                </Row>
            </Form>
        );
    }
}

export default Form.create<Props>()(AdvancedConfigurationForm);
