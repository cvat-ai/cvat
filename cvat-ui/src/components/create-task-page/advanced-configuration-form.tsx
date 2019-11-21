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
            <Form.Item style={{marginBottom: '0px'}}>
                <Tooltip overlay='Enable order for shapes. Useful for segmentation tasks'>
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
                </Tooltip>
            </Form.Item>
        );
    }

    private renderImageQuality() {
        return (
            <Form.Item style={{marginBottom: '0px'}}>
                <Tooltip overlay='Defines image compression level'>
                    <Text className='cvat-black-color'>{'Image quality'}</Text>
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
            <Form.Item style={{marginBottom: '0px'}}>
                <Tooltip overlay='Defines a number of intersected frames between different segments'>
                    <Text className='cvat-black-color'>{'Overlap size'}</Text>
                    {this.props.form.getFieldDecorator('overlapSize')(
                        <Input size='large' type='number'/>
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderSegmentSize() {
        return (
            <Form.Item style={{marginBottom: '0px'}}>
                <Tooltip overlay='Defines a number of frames in a segment'>
                    <Text className='cvat-black-color'>{'Segment size'}</Text>
                    {this.props.form.getFieldDecorator('segmentSize')(
                        <Input size='large' type='number'/>
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderStartFrame() {
        return (
            <Form.Item style={{marginBottom: '0px'}}>
                <Text className='cvat-black-color'>{'Start frame'}</Text>
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
            <Form.Item style={{marginBottom: '0px'}}>
                <Text className='cvat-black-color'>{'Stop frame'}</Text>
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
            <Form.Item style={{marginBottom: '0px'}}>
                <Text className='cvat-black-color'>{'Frame step'}</Text>
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
            <Form.Item style={{marginBottom: '0px'}}>
                <Tooltip overlay='If annotation files are large, you can use git LFS feature'>
                    {this.props.form.getFieldDecorator('lfs', {
                        valuePropName: 'checked',
                        initialValue: false,
                    })(
                        <Checkbox>
                            <Text className='cvat-black-color'>
                                Use LFS (Large File Support)
                            </Text>
                        </Checkbox>
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderGitRepositoryURL() {
        return (
            <Form.Item style={{marginBottom: '0px'}}>
                <Tooltip overlay={`Attach a git repository to store annotations.
                                Path is specified in square brackets`}>
                    <Text className='cvat-black-color'>{'Dataset repository URL'}</Text>
                    {this.props.form.getFieldDecorator('repository', {
                        rules: [{
                            validator: (_, value, callback) => {
                                const [url, path] = value.split(/\s+/);
                                if (!patterns.validateURL.pattern.test(url)) {
                                    callback('Git URL is not a valid');
                                }

                                if (path && !patterns.validatePath.pattern.test(path)) {
                                    callback('Git path is not a valid');
                                }

                                callback();
                            }
                        }]
                    })(
                        <Input
                            placeholder='e.g. https//github.com/user/repos [annotation/<anno_file_name>.zip]'
                            size='large'
                        />
                    )}
                </Tooltip>
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
            <Form.Item style={{marginBottom: '0px'}}>
                <Tooltip overlay='Attach issue tracker where the task is described'>
                    <Text className='cvat-black-color'>{'Issue tracker'}</Text>
                    {this.props.form.getFieldDecorator('bugTracker', {
                        rules: [{
                            ...patterns.validateURL,
                        }]
                    })(
                        <Input
                            size='large'
                        />
                    )}
                </Tooltip>
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
