import React from 'react';

import {
    Input,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import Form, { FormComponentProps } from 'antd/lib/form/Form';

export interface BaseConfiguration {
    name: string;
}

type Props = FormComponentProps & {
    onSubmit(values: BaseConfiguration): void;
};

class BasicConfigurationForm extends React.PureComponent<Props> {
    public submit() {
        return new Promise((resolve, reject) => {
            this.props.form.validateFields((error, values) => {
                if (!error) {
                    this.props.onSubmit({
                        name: values.name,
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

    public render() {
        const { getFieldDecorator } = this.props.form;
        return (
            <Form onSubmit={(e: React.FormEvent) => e.preventDefault()}>
                <Text type='secondary'>Name</Text>
                <Form.Item style={{marginBottom: '0px'}}>
                    { getFieldDecorator('name', {
                        rules: [{
                            required: true,
                            message: 'Please, specify a name',
                        }]
                    })(
                        <Input/>
                    ) }
                </Form.Item>
            </Form>
        );
    }
}

export default Form.create<Props>()(BasicConfigurationForm);
