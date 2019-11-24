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
} from './common';

type Props = FormComponentProps & {
    labels: Label[];
    onSubmit: (labels: Label[]) => void;
}

interface State {
    valid: boolean;
}

class RawViewer extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);

        this.state = {
            valid: true,
        };
    }

    private validateLabels = (_: any, value: string, callback: any) => {
        try {
            JSON.parse(value);
        } catch (error) {
            callback(error.toString());
        }

        callback();
    }

    private handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        this.props.form.validateFields((error, values) => {
            if (!error) {
                this.props.onSubmit(JSON.parse(values.labels));
            }
        });
    }

    public render() {
        const labels = this.props.labels.map((label: any) => {
            return {
                ...label,
                id: label.id < 0 ? undefined : label.id,
                attributes: label.attributes.map((attribute: any) => {
                    return {
                        ...attribute,
                        id: attribute.id < 0 ? undefined : attribute.id,
                    };
                }),
            };
        });

        const textLabels = JSON.stringify(labels, null, 2);

        return (
            <Form onSubmit={this.handleSubmit}>
                <Form.Item> {
                    this.props.form.getFieldDecorator('labels', {
                        initialValue: textLabels,
                        rules: [{
                            validator: this.validateLabels,
                        }]
                    })( <Input.TextArea rows={5} className='cvat-raw-labels-viewer'/> )
                } </Form.Item>
                <Row type='flex' justify='start' align='middle'>
                    <Col>
                        <Tooltip overlay='Save labels and return'>
                            <Button
                                style={{width: '150px'}}
                                type='primary'
                                htmlType='submit'
                            > Done </Button>
                        </Tooltip>
                    </Col>
                    <Col offset={1}>
                        <Tooltip overlay='Do not save the label and return'>
                            <Button
                                style={{width: '150px'}}
                                type='danger'
                                onClick={() => {
                                    this.props.form.resetFields();
                                }}
                            > Reset </Button>
                        </Tooltip>
                    </Col>
                </Row>
            </Form>
        );
    }
}

export default Form.create<Props>()(RawViewer);
