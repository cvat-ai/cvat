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
        // function compareAttributes(attr: Attribute, _attr: Attribute) {
        //     if (_attr.mutable !== attr.mutable) {
        //         throw('You cannot change attributes which are saved on the server');
        //     } else if (_attr.name !== attr.name) {
        //         throw('You cannot change attributes which are saved on the server');
        //     } else if (_attr.type !== attr.type) {
        //         throw('You cannot change attributes which are saved on the server');
        //     } else {
        //         const { type } = attr;
        //         if (type === 'select' || type === 'radio') {
        //             if (!equalArrayHead(attr.values, _attr.values)) {
        //                 throw('You can only append new values for attributes which are saved on the server');
        //             }
        //         } else if (type === 'number') {
        //             if (_attr.values.join(';') !== attr.values.join(';')) {
        //                 throw('You cannot change attributes which are saved on the server');
        //             }
        //         }
        //     }
        // }

        try {
            const labels: Label[] = JSON.parse(value);
            // for (const label of this.props.labels) {
            //     if (label.id >= 0) {
            //         const labelIdx = labels.map((_label) => _label.id).indexOf(label.id);
            //         if (labelIdx === -1) {
            //             callback('You cannot remove labels which are saved on the server');
            //             return;
            //         } else if (labels[labelIdx].name !== label.name) {
            //             callback('You cannot change labels which are saved on the server');
            //             return;
            //         }

            //         for (const attr of label.attributes) {
            //             if (attr.id >= 0) {
            //                 const attrIdx = labels[labelIdx]
            //                     .attributes.map((_attr) => _attr.id).indexOf(attr.id);

            //                 if (attrIdx === -1) {
            //                     throw('You cannot remove attributes which are saved on the server');
            //                 } else {
            //                     const _attr = labels[labelIdx].attributes[attrIdx];
            //                     compareAttributes(attr, _attr);
            //                 }
            //             }
            //         }
            //     }
            // }
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
