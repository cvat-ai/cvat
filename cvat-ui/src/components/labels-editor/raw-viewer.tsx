// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Form,
    Input,
    Button,
    Tooltip,
} from 'antd';

import { FormComponentProps } from 'antd/lib/form/Form';

import {
    Label,
    Attribute,
} from './common';

type Props = FormComponentProps & {
    labels: Label[];
    onSubmit: (labels: Label[]) => void;
};

class RawViewer extends React.PureComponent<Props> {
    private validateLabels = (_: any, value: string, callback: any): void => {
        try {
            JSON.parse(value);
        } catch (error) {
            callback(error.toString());
        }

        callback();
    };

    private handleSubmit = (e: React.FormEvent): void => {
        const {
            form,
            onSubmit,
        } = this.props;

        e.preventDefault();
        form.validateFields((error, values): void => {
            if (!error) {
                onSubmit(JSON.parse(values.labels));
            }
        });
    };

    public render(): JSX.Element {
        const { labels } = this.props;
        const convertedLabels = labels.map((label: any): Label => (
            {
                ...label,
                id: label.id < 0 ? undefined : label.id,
                attributes: label.attributes.map((attribute: any): Attribute => (
                    {
                        ...attribute,
                        id: attribute.id < 0 ? undefined : attribute.id,
                    }
                )),
            }
        ));

        const textLabels = JSON.stringify(convertedLabels, null, 2);
        const { form } = this.props;

        return (
            <Form onSubmit={this.handleSubmit}>
                <Form.Item>
                    {form.getFieldDecorator('labels', {
                        initialValue: textLabels,
                        rules: [{
                            validator: this.validateLabels,
                        }],
                    })(<Input.TextArea rows={5} className='cvat-raw-labels-viewer' />)}
                </Form.Item>
                <Row type='flex' justify='start' align='middle'>
                    <Col>
                        <Tooltip title='Save labels and return'>
                            <Button
                                style={{ width: '150px' }}
                                type='primary'
                                htmlType='submit'
                            >
                                Done
                            </Button>
                        </Tooltip>
                    </Col>
                    <Col offset={1}>
                        <Tooltip title='Do not save the label and return'>
                            <Button
                                style={{ width: '150px' }}
                                type='danger'
                                onClick={(): void => {
                                    form.resetFields();
                                }}
                            >
                                Reset
                            </Button>
                        </Tooltip>
                    </Col>
                </Row>
            </Form>
        );
    }
}

export default Form.create<Props>()(RawViewer);
