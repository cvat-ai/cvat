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
    onSubmit(values: AdvancedConfiguration): void;
    installedGit: boolean;
};

class AdvancedConfigurationForm extends React.PureComponent<Props> {
    public submit(): Promise<void> {
        return new Promise((resolve, reject) => {
            const {
                form,
                onSubmit,
            } = this.props;

            form.validateFields((error, values): void => {
                if (!error) {
                    const filteredValues = { ...values };
                    delete filteredValues.frameStep;

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

    private renderZOrder(): JSX.Element {
        const { form } = this.props;
        return (
            <Form.Item help='Enables order for shapes. Useful for segmentation tasks'>
                {form.getFieldDecorator('zOrder', {
                    initialValue: false,
                    valuePropName: 'checked',
                })(
                    <Checkbox>
                        <Text className='cvat-black-color'>
                            Z-order
                        </Text>
                    </Checkbox>,
                )}
            </Form.Item>
        );
    }

    private renderImageQuality(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label='Image quality'>
                <Tooltip overlay='Defines image compression level'>
                    {form.getFieldDecorator('imageQuality', {
                        initialValue: 70,
                        rules: [{
                            required: true,
                            message: 'This field is required',
                        }],
                    })(
                        <Input
                            size='large'
                            type='number'
                            min={5}
                            max={100}
                            suffix={<Icon type='percentage' />}
                        />,
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderOverlap(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label='Overlap size'>
                <Tooltip overlay='Defines a number of intersected frames between different segments'>
                    {form.getFieldDecorator('overlapSize')(
                        <Input size='large' type='number' />,
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderSegmentSize(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label='Segment size'>
                <Tooltip overlay='Defines a number of frames in a segment'>
                    {form.getFieldDecorator('segmentSize')(
                        <Input size='large' type='number' />,
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderStartFrame(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label='Start frame'>
                {form.getFieldDecorator('startFrame')(
                    <Input
                        size='large'
                        type='number'
                        min={0}
                        step={1}
                    />,
                )}
            </Form.Item>
        );
    }

    private renderStopFrame(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label='Stop frame'>
                {form.getFieldDecorator('stopFrame')(
                    <Input
                        size='large'
                        type='number'
                        min={0}
                        step={1}
                    />,
                )}
            </Form.Item>
        );
    }

    private renderFrameStep(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item label='Frame step'>
                {form.getFieldDecorator('frameStep')(
                    <Input
                        size='large'
                        type='number'
                        min={1}
                        step={1}
                    />,
                )}
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
                        <Text className='cvat-black-color'>
                            Use LFS (Large File Support):
                        </Text>
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
                label='Dataset repository URL'
                extra='Attach a repository to store annotations there'
            >
                {form.getFieldDecorator('repository', {
                    rules: [{
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
                    }],
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

    private renderBugTracker(): JSX.Element {
        const { form } = this.props;

        return (
            <Form.Item
                hasFeedback
                label='Issue tracker'
                extra='Attach issue tracker where the task is described'
            >
                {form.getFieldDecorator('bugTracker', {
                    rules: [{
                        validator: (_, value, callback): void => {
                            if (value && !patterns.validateURL.pattern.test(value)) {
                                callback('Issue tracker must be URL');
                            } else {
                                callback();
                            }
                        },
                    }],
                })(
                    <Input size='large' />,
                )}
            </Form.Item>
        );
    }

    public render(): JSX.Element {
        const { installedGit } = this.props;

        return (
            <Form>
                <Row>
                    <Col>
                        {this.renderZOrder()}
                    </Col>
                </Row>

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

                { installedGit ? this.renderGit() : null}

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
