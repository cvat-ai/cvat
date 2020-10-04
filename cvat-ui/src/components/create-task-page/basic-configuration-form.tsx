// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Input from 'antd/lib/input';
import Form, { FormComponentProps } from 'antd/lib/form/Form';

export interface BaseConfiguration {
    name: string;
    projectId: string;
}

type Props = FormComponentProps & {
    onSubmit(values: BaseConfiguration): void;
    onChange(values: {[name: string]: string}): void;
};

class BasicConfigurationForm extends React.PureComponent<Props> {
    public submit(): Promise<void> {
        return new Promise((resolve, reject) => {
            const {
                form,
                onSubmit,
            } = this.props;

            form.validateFields((error, values): void => {
                if (!error) {
                    onSubmit({
                        name: values.name,
                        projectId: values.projectId,
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

    public render(): JSX.Element {
        const { form } = this.props;
        const { getFieldDecorator } = form;

        return (
            <Form onSubmit={(e: React.FormEvent): void => e.preventDefault()}>
                <Form.Item hasFeedback label={<span>Name</span>}>
                    { getFieldDecorator('name', {
                        rules: [{
                            required: true,
                            message: 'Please, specify a name',
                        }],
                    })(
                        <Input />,
                    ) }
                </Form.Item>
                <Form.Item hasFeedback label={<span>Project Id (for develping only)</span>}>
                    { getFieldDecorator('projectId', {
                        rules: [{
                            pattern: /^[1-9]+[0-9]*$/,
                            message: 'Please, specify valid positive number',
                        }],
                    })(
                        <Input />,
                    ) }
                </Form.Item>
            </Form>
        );
    }
}

export default Form.create<Props>({
    onFieldsChange: (props, fields) => {
        const values: {[name: string]: string} = {};
        for (const field of Object.keys(fields)) {
            if (!(fields[field].dirty || fields[field].errors)) {
                values[field] = fields[field].value;
            }
        }
        if (values) {
            props.onChange(values);
        }
    },
})(BasicConfigurationForm);
