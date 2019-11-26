import React from 'react';

import {
    Row,
    Col,
    Form,
    Input,
    Tooltip,
    Checkbox,
} from 'antd';

import { FormComponentProps } from 'antd/lib/form/Form';
import Text from 'antd/lib/typography/Text';

type Props = FormComponentProps;

export class CreateModelForm extends React.PureComponent<Props> {
    public constructor(props: Props) {
        super(props);
    }

    public submit(): Promise<{name: string, global: boolean}> {
        return new Promise((resolve, reject) => {
            this.props.form.validateFields((errors, values) => {
                if (!errors) {
                    resolve({
                        name: values.name,
                        global: values.global,
                    });
                } else {
                    reject(errors);
                }
            });
        });
    }

    public resetFields() {
        this.props.form.resetFields();
    }

    public render() {
        const { getFieldDecorator } = this.props.form;

        return (
            <Form onSubmit={(e: React.FormEvent) => e.preventDefault()}>
                <Row>
                    <Col span={24}>
                        <Text type='danger'>* </Text>
                        <Text className='cvat-black-color'>Name:</Text>
                    </Col>
                    <Col span={14}>
                        <Form.Item hasFeedback>
                            { getFieldDecorator('name', {
                                rules: [{
                                    required: true,
                                    message: 'Please, specify a model name',
                                }],
                            })(<Input placeholder='Model name'/>)}
                        </Form.Item>
                    </Col>
                    <Col span={8} offset={2}>
                        <Form.Item>
                            <Tooltip overlay='Will this model be availabe for everyone?'>
                                { getFieldDecorator('global', {
                                    initialValue: false,
                                    valuePropName: 'checked',
                                })(<Checkbox>
                                    <Text className='cvat-black-color'>
                                        Load globally
                                    </Text>
                                </Checkbox>)}
                            </Tooltip>
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        );
    }
}

export default Form.create()(CreateModelForm);
