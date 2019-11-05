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
    Attribute,
    Label,
    equalArrayHead,
} from './common';



type Props = FormComponentProps & {
    labels: Label[];
    onSubmit: (labels: Label[]) => void;
}

interface State {
    labels: object[];
    valid: boolean;
}

class RawViewer extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);

        const labels = JSON.parse(JSON.stringify(this.props.labels));
        for (const label of labels) {
            for (const attr of label.attributes) {
                if (attr.id < 0) {
                    delete attr.id;
                }
            }

            if (label.id < 0) {
                delete label.id;
            }
        }

        this.state = {
            labels,
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
        const textLabels = JSON.stringify(this.state.labels, null, 2);

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
                    <Col span={4}>
                        <Tooltip overlay='Save labels and return'>
                            <Button
                                style={{width: '150px'}}
                                type='primary'
                                htmlType='submit'
                            > Done </Button>
                        </Tooltip>
                    </Col>
                    <Col span={1}/>
                    <Col span={4}>
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
