// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Icon,
    Input,
    Button,
    Select,
    Tooltip,
    Checkbox,
} from 'antd';

import Form, { FormComponentProps } from 'antd/lib/form/Form';
import Text from 'antd/lib/typography/Text';
import patterns from 'utils/validation-patterns';

import {
    equalArrayHead,
    idGenerator,
    Label,
    Attribute,
} from './common';


export enum AttributeType {
    SELECT = 'SELECT',
    RADIO = 'RADIO',
    CHECKBOX = 'CHECKBOX',
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
}

type Props = FormComponentProps & {
    label: Label | null;
    onSubmit: (label: Label | null) => void;
};

class LabelForm extends React.PureComponent<Props, {}> {
    private continueAfterSubmit: boolean;

    constructor(props: Props) {
        super(props);
        this.continueAfterSubmit = false;
    }

    private handleSubmit = (e: React.FormEvent): void => {
        e.preventDefault();

        const {
            form,
            label,
            onSubmit,
        } = this.props;

        form.validateFields((error, formValues): void => {
            if (!error) {
                onSubmit({
                    name: formValues.labelName,
                    id: label ? label.id : idGenerator(),
                    attributes: formValues.keys.map((key: number, index: number): Attribute => {
                        let attrValues = formValues.values[key];
                        if (!Array.isArray(attrValues)) {
                            if (formValues.type[key] === AttributeType.NUMBER) {
                                attrValues = attrValues.split(';');
                            } else {
                                attrValues = [attrValues];
                            }
                        }

                        attrValues = attrValues.map((value: string) => value.trim());

                        return {
                            name: formValues.attrName[key],
                            type: formValues.type[key],
                            mutable: formValues.mutable[key],
                            id: label && index < label.attributes.length
                                ? label.attributes[index].id : key,
                            values: attrValues,
                        };
                    }),
                });

                form.resetFields();

                if (!this.continueAfterSubmit) {
                    onSubmit(null);
                }
            }
        });
    };

    private addAttribute = (): void => {
        const { form } = this.props;
        const keys = form.getFieldValue('keys');
        const nextKeys = keys.concat(idGenerator());
        form.setFieldsValue({
            keys: nextKeys,
        });
    };

    private removeAttribute = (key: number): void => {
        const { form } = this.props;
        const keys = form.getFieldValue('keys');
        form.setFieldsValue({
            keys: keys.filter((_key: number) => _key !== key),
        });
    };

    private renderAttributeNameInput(key: number, attr: Attribute | null): JSX.Element {
        const locked = attr ? attr.id >= 0 : false;
        const value = attr ? attr.name : '';
        const { form } = this.props;

        return (
            <Col span={5}>
                <Form.Item hasFeedback>
                    {form.getFieldDecorator(`attrName[${key}]`, {
                        initialValue: value,
                        rules: [{
                            required: true,
                            message: 'Please specify a name',
                        }, {
                            pattern: patterns.validateAttributeName.pattern,
                            message: patterns.validateAttributeName.message,
                        }],
                    })(<Input disabled={locked} placeholder='Name' />)}
                </Form.Item>
            </Col>
        );
    }

    private renderAttributeTypeInput(key: number, attr: Attribute | null): JSX.Element {
        const locked = attr ? attr.id >= 0 : false;
        const type = attr ? attr.type.toUpperCase() : AttributeType.SELECT;
        const { form } = this.props;

        return (
            <Col span={4}>
                <Form.Item>
                    <Tooltip title='An HTML element representing the attribute'>
                        { form.getFieldDecorator(`type[${key}]`, {
                            initialValue: type,
                        })(
                            <Select disabled={locked}>
                                <Select.Option value={AttributeType.SELECT}>
                                    Select
                                </Select.Option>
                                <Select.Option value={AttributeType.RADIO}>
                                    Radio
                                </Select.Option>
                                <Select.Option value={AttributeType.CHECKBOX}>
                                    Checkbox
                                </Select.Option>
                                <Select.Option value={AttributeType.TEXT}>
                                    Text
                                </Select.Option>
                                <Select.Option value={AttributeType.NUMBER}>
                                    Number
                                </Select.Option>
                            </Select>,
                        )}
                    </Tooltip>
                </Form.Item>
            </Col>
        );
    }

    private renderAttributeValuesInput(key: number, attr: Attribute | null): JSX.Element {
        const locked = attr ? attr.id >= 0 : false;
        const existedValues = attr ? attr.values : [];
        const { form } = this.props;

        const validator = (_: any, values: string[], callback: any): void => {
            if (locked && existedValues) {
                if (!equalArrayHead(existedValues, values)) {
                    callback('You can only append new values');
                }
            }

            for (const value of values) {
                if (!patterns.validateAttributeValue.pattern.test(value)) {
                    callback(`Invalid attribute value: "${value}"`);
                }
            }

            callback();
        };

        return (
            <Tooltip title='Press enter to add a new value'>
                <Form.Item>
                    { form.getFieldDecorator(`values[${key}]`, {
                        initialValue: existedValues,
                        rules: [{
                            required: true,
                            message: 'Please specify values',
                        }, {
                            validator,
                        }],
                    })(
                        <Select
                            mode='tags'
                            dropdownMenuStyle={{ display: 'none' }}
                            placeholder='Attribute values'
                        />,
                    )}
                </Form.Item>
            </Tooltip>
        );
    }

    private renderBooleanValueInput(key: number, attr: Attribute | null): JSX.Element {
        const value = attr ? attr.values[0] : 'false';
        const { form } = this.props;

        return (
            <Tooltip title='Specify a default value'>
                <Form.Item>
                    { form.getFieldDecorator(`values[${key}]`, {
                        initialValue: value,
                    })(
                        <Select>
                            <Select.Option value='false'> False </Select.Option>
                            <Select.Option value='true'> True </Select.Option>
                        </Select>,
                    )}
                </Form.Item>
            </Tooltip>
        );
    }

    private renderNumberRangeInput(key: number, attr: Attribute | null): JSX.Element {
        const locked = attr ? attr.id >= 0 : false;
        const value = attr ? attr.values.join(';') : '';
        const { form } = this.props;

        const validator = (_: any, strNumbers: string, callback: any): void => {
            const numbers = strNumbers
                .split(';')
                .map((number): number => Number.parseFloat(number));
            if (numbers.length !== 3) {
                callback('Invalid input');
            }

            for (const number of numbers) {
                if (Number.isNaN(number)) {
                    callback('Invalid input');
                }
            }

            if (numbers[0] >= numbers[1]) {
                callback('Invalid input');
            }

            if (+numbers[1] - +numbers[0] < +numbers[2]) {
                callback('Invalid input');
            }

            callback();
        };

        return (
            <Form.Item>
                { form.getFieldDecorator(`values[${key}]`, {
                    initialValue: value,
                    rules: [{
                        required: true,
                        message: 'Please set a range',
                    }, {
                        validator,
                    }],
                })(
                    <Input disabled={locked} placeholder='min;max;step' />,
                )}
            </Form.Item>
        );
    }

    private renderDefaultValueInput(key: number, attr: Attribute | null): JSX.Element {
        const value = attr ? attr.values[0] : '';
        const { form } = this.props;

        return (
            <Form.Item>
                { form.getFieldDecorator(`values[${key}]`, {
                    initialValue: value,
                })(
                    <Input placeholder='Default value' />,
                )}
            </Form.Item>
        );
    }

    private renderMutableAttributeInput(key: number, attr: Attribute | null): JSX.Element {
        const locked = attr ? attr.id >= 0 : false;
        const value = attr ? attr.mutable : false;
        const { form } = this.props;

        return (
            <Form.Item>
                <Tooltip title='Can this attribute be changed frame to frame?'>
                    { form.getFieldDecorator(`mutable[${key}]`, {
                        initialValue: value,
                        valuePropName: 'checked',
                    })(
                        <Checkbox disabled={locked}> Mutable </Checkbox>,
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderDeleteAttributeButton(key: number, attr: Attribute | null): JSX.Element {
        const locked = attr ? attr.id >= 0 : false;

        return (
            <Form.Item>
                <Tooltip title='Delete the attribute'>
                    <Button
                        type='link'
                        className='cvat-delete-attribute-button'
                        disabled={locked}
                        onClick={(): void => {
                            this.removeAttribute(key);
                        }}
                    >
                        <Icon type='close-circle' />
                    </Button>
                </Tooltip>
            </Form.Item>
        );
    }

    private renderAttribute = (key: number, index: number): JSX.Element => {
        const {
            label,
            form,
        } = this.props;

        const attr = (label && index < label.attributes.length
            ? label.attributes[index]
            : null);

        return (
            <Form.Item key={key}>
                <Row type='flex' justify='space-between' align='middle'>
                    { this.renderAttributeNameInput(key, attr) }
                    { this.renderAttributeTypeInput(key, attr) }
                    <Col span={6}>
                        {((): JSX.Element => {
                            const type = form.getFieldValue(`type[${key}]`);
                            let element = null;
                            if ([AttributeType.SELECT, AttributeType.RADIO].includes(type)) {
                                element = this.renderAttributeValuesInput(key, attr);
                            } else if (type === AttributeType.CHECKBOX) {
                                element = this.renderBooleanValueInput(key, attr);
                            } else if (type === AttributeType.NUMBER) {
                                element = this.renderNumberRangeInput(key, attr);
                            } else {
                                element = this.renderDefaultValueInput(key, attr);
                            }

                            return element;
                        })()}
                    </Col>
                    <Col span={5}>
                        { this.renderMutableAttributeInput(key, attr) }
                    </Col>
                    <Col span={2}>
                        { this.renderDeleteAttributeButton(key, attr) }
                    </Col>
                </Row>
            </Form.Item>
        );
    };

    private renderLabelNameInput(): JSX.Element {
        const {
            label,
            form,
        } = this.props;
        const value = label ? label.name : '';
        const locked = label ? label.id >= 0 : false;

        return (
            <Col span={10}>
                <Form.Item hasFeedback>
                    {form.getFieldDecorator('labelName', {
                        initialValue: value,
                        rules: [{
                            required: true,
                            message: 'Please specify a name',
                        }, {
                            pattern: patterns.validateAttributeName.pattern,
                            message: patterns.validateAttributeName.message,
                        }],
                    })(<Input disabled={locked} placeholder='Label name' />)}
                </Form.Item>
            </Col>
        );
    }

    private renderNewAttributeButton(): JSX.Element {
        return (
            <Col span={3}>
                <Form.Item>
                    <Button type='ghost' onClick={this.addAttribute}>
                        Add an attribute
                        <Icon type='plus' />
                    </Button>
                </Form.Item>
            </Col>
        );
    }

    private renderDoneButton(): JSX.Element {
        return (
            <Col>
                <Tooltip title='Save the label and return'>
                    <Button
                        style={{ width: '150px' }}
                        type='primary'
                        htmlType='submit'
                        onClick={(): void => {
                            this.continueAfterSubmit = false;
                        }}
                    >
                        Done
                    </Button>
                </Tooltip>
            </Col>
        );
    }

    private renderContinueButton(): JSX.Element {
        const { label } = this.props;

        return (
            label ? <div />
                : (
                    <Col offset={1}>
                        <Tooltip title='Save the label and create one more'>
                            <Button
                                style={{ width: '150px' }}
                                type='primary'
                                htmlType='submit'
                                onClick={(): void => {
                                    this.continueAfterSubmit = true;
                                }}
                            >
                                Continue
                            </Button>
                        </Tooltip>
                    </Col>
                )
        );
    }

    private renderCancelButton(): JSX.Element {
        const { onSubmit } = this.props;

        return (
            <Col offset={1}>
                <Tooltip title='Do not save the label and return'>
                    <Button
                        style={{ width: '150px' }}
                        type='danger'
                        onClick={(): void => {
                            onSubmit(null);
                        }}
                    >
                        Cancel
                    </Button>
                </Tooltip>
            </Col>
        );
    }

    public render(): JSX.Element {
        const {
            label,
            form,
        } = this.props;

        form.getFieldDecorator('keys', {
            initialValue: label
                ? label.attributes.map((attr: Attribute): number => attr.id)
                : [],
        });

        const keys = form.getFieldValue('keys');
        const attributeItems = keys.map(this.renderAttribute);

        return (
            <Form onSubmit={this.handleSubmit}>
                <Row type='flex' justify='start' align='middle'>
                    { this.renderLabelNameInput() }
                    <Col span={1} />
                    { this.renderNewAttributeButton() }
                </Row>
                { attributeItems.length > 0
                    && (
                        <Row type='flex' justify='start' align='middle'>
                            <Col>
                                <Text>Attributes</Text>
                            </Col>
                        </Row>
                    )}
                { attributeItems.reverse() }
                <Row type='flex' justify='start' align='middle'>
                    { this.renderDoneButton() }
                    { this.renderContinueButton() }
                    { this.renderCancelButton() }
                </Row>
            </Form>
        );
    }
}

export default Form.create<Props>()(LabelForm);
