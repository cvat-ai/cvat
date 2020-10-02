// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Input from 'antd/lib/input';
import Form, { FormComponentProps } from 'antd/lib/form/Form';

export interface BaseConfiguration {
    name: string;
    project_id: string;
}

type Props = FormComponentProps & {
    onSubmit(values: BaseConfiguration): void;
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
                        project_id: values.project_id,
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
                    { getFieldDecorator('project_id', {
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
    onFieldsChange: (props, fields,) => console.log(props, fields, allFields),
})(BasicConfigurationForm);
