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
};

class AdvancedConfigurationForm extends React.PureComponent<Props> {
    public async submit() {
        return new Promise((resolve, reject) => {
            this.props.form.validateFields((error, values) => {
                if (!error) {
                    //this.props.onSubmit();
                    resolve();
                } else {
                    reject();
                }
            });
        })
    }

    public render() {
        const { getFieldDecorator } = this.props.form;

        return (
            <Form>
                <Row>
                    <Col>
                        <Form.Item style={{marginBottom: '0px'}}>
                            <Tooltip overlay='Enable order for shapes. Useful for segmentation tasks'>
                                {getFieldDecorator('zOrder', {
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
                    </Col>
                </Row>

                <Row type='flex' justify='start'>
                    <Col span={4}>
                        <Form.Item style={{marginBottom: '0px'}}>
                            {getFieldDecorator('imageQuality')(
                                <Tooltip overlay='Defines image compression level'>
                                    <Text className='cvat-black-color'> Image quality </Text>
                                    <Input
                                        size='large'
                                        type='number'
                                        min={0}
                                        max={100}
                                        suffix={<Icon type='percentage'/>}
                                    />
                                </Tooltip>
                            )}
                        </Form.Item>
                    </Col>

                    <Col span={4} offset={1}>
                        <Form.Item style={{marginBottom: '0px'}}>
                            {getFieldDecorator('overlapSize')(
                                <Tooltip overlay='Defines a number of intersected frames between different segments'>
                                    <Text className='cvat-black-color'> Overlap size </Text>
                                    <Input size='large' type='number'/>
                                </Tooltip>
                            )}
                        </Form.Item>
                    </Col>

                    <Col span={4} offset={1}>
                        <Form.Item style={{marginBottom: '0px'}}>
                            {getFieldDecorator('segmentSize')(
                                <Tooltip overlay='Defines a number of frames in a segment'>
                                    <Text className='cvat-black-color'> Segment size </Text>
                                    <Input size='large' type='number'/>
                                </Tooltip>
                            )}
                        </Form.Item>
                    </Col>
                </Row>

                <Row type='flex' justify='start'>
                    <Col span={4}>
                        <Form.Item style={{marginBottom: '0px'}}>
                            {getFieldDecorator('startFrame')(
                                <>
                                    <Text className='cvat-black-color'> Start frame </Text>
                                    <Input
                                        size='large'
                                        type='number'
                                        min={0}
                                        step={1}
                                    />
                                </>
                            )}
                        </Form.Item>
                    </Col>

                    <Col span={4} offset={1}>
                        <Form.Item style={{marginBottom: '0px'}}>
                            {getFieldDecorator('stopFrame')(
                                <>
                                    <Text className='cvat-black-color'> Stop frame </Text>
                                    <Input
                                        size='large'
                                        type='number'
                                        min={0}
                                        step={1}
                                    />
                                </>
                            )}
                        </Form.Item>
                    </Col>

                    <Col span={4} offset={1}>
                        <Form.Item style={{marginBottom: '0px'}}>
                            {getFieldDecorator('frameStep')(
                                <>
                                    <Text className='cvat-black-color'> Frame step </Text>
                                    <Input
                                        size='large'
                                        type='number'
                                        min={1}
                                        step={1}
                                    />
                                </>
                            )}
                        </Form.Item>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <Form.Item style={{marginBottom: '0px'}}>
                            {getFieldDecorator('repository', {
                                // TODO: Add pattern
                            })(
                                <Tooltip overlay={`Attach a git repository to store annotations.
                                                    Path is specified in square brackets`}>
                                    <Text className='cvat-black-color'> Dataset repository URL </Text>
                                    <Input
                                        placeholder='e.g. https//github.com/user/repos [annotation/<anno_file_name>.zip]'
                                        size='large'
                                    />
                                </Tooltip>
                            )}
                        </Form.Item>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Form.Item style={{marginBottom: '0px'}}>
                            <Tooltip overlay='If annotation files are large, you can use git LFS feature'>
                                {getFieldDecorator('lfs', {
                                    valuePropName: 'checked',
                                })(
                                    <Checkbox>
                                        <Text className='cvat-black-color'>
                                            Use LFS (Large File Support)
                                        </Text>
                                    </Checkbox>
                                )}
                            </Tooltip>
                        </Form.Item>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <Form.Item style={{marginBottom: '0px'}}>
                            {getFieldDecorator('bugTracker', {
                                // TODO: Add pattern
                            })(
                                <Tooltip overlay='Attach issue tracker where the task is described'>
                                    <Text className='cvat-black-color'> Issue tracker </Text>
                                    <Input
                                        size='large'
                                    />
                                </Tooltip>
                            )}
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        );
    }
}

export default Form.create<Props>()(AdvancedConfigurationForm);
