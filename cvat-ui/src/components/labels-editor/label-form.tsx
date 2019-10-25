import React from 'react';

import { FormComponentProps } from 'antd/lib/form/Form';
import {
    Input,
    Form,
} from 'antd';

import patterns from '../../utils/validation-patterns';

export enum AttributeType {
    SELECT = 'SELECT',
    RADIO = 'RADIO',
    CHECKBOX = 'CHECKBOX',
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
}

interface AttributeFormProps {
    id: string;
    onSubmit: (name: string) => void;
}

type Props = AttributeFormProps & FormComponentProps;

class LabelForm extends React.PureComponent<Props> {

    private handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        this.props.form.validateFields((error, values) => {
            if (!error) {
                this.props.form.resetFields();
                this.props.onSubmit(values.name);
            }
        });
    }

    private validateLabelName = (_: any, value: string, callback: any) => {
        if (value && !patterns.validateLabelName.pattern.test(value)) {
            callback(patterns.validateLabelName.message);
        }

        callback();
    }

    public render() {
        return (
            <Form id={this.props.id} onSubmit={this.handleSubmit}>
                <Form.Item hasFeedback> {
                    this.props.form.getFieldDecorator('name', {
                        rules: [{
                            required: true,
                            message: 'Please specify a name',
                        }, {
                            validator: this.validateLabelName,
                        }],
                    })(<Input placeholder='Name'/>)
                } </Form.Item>
            </Form>
        );
    }
}

export default Form.create<Props>()(LabelForm);
