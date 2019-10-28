import React from 'react';

import { FormComponentProps } from 'antd/lib/form/Form';
import {
    Checkbox,
    Tooltip,
    Select,
    Input,
    Icon,
    Button,
    Form,
    Row,
    Col,
} from 'antd';

import patterns from '../../utils/validation-patterns';
import { Attribute } from './common';

export enum AttributeType {
    SELECT = 'SELECT',
    RADIO = 'RADIO',
    CHECKBOX = 'CHECKBOX',
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
}

interface AttributeFormProps {
    id: number;
    instance: Attribute | null;
    onSubmit: (values: any) => void;
    onDelete: (id: number) => void;
}

interface AttributeFormState {
    attributeType: AttributeType;
}

type Props = AttributeFormProps & FormComponentProps;
type State = AttributeFormState;

class AttributeForm extends React.PureComponent<Props, State> {
    private readonly disabled: boolean;

    constructor(props: Props) {
        super(props);

        this.disabled = props.id >= 0;

        this.state = {
            attributeType: props.instance
                ? props.instance.type.toUpperCase() as AttributeType : AttributeType.SELECT,
        };
    }

    private submitAfterValidation(values: any) {
        values.id = this.props.id;
        switch (values.type) {
            case AttributeType.SELECT:
            case AttributeType.RADIO:
                this.props.onSubmit(values)
                break;
            case AttributeType.CHECKBOX:
                values.values = [values.booleanDefaultValue]
                this.props.onSubmit(values);
                break;
            case AttributeType.TEXT:
                values.values = [values.defaulValue]
                this.props.onSubmit(values);
                break;
            case AttributeType.NUMBER:
                values.values = [values.numberRange]
                this.props.onSubmit(values);
                break;
        }
    }

    private handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        this.props.form.validateFields((error, values) => {
            if (!error) {
                this.submitAfterValidation(values);
            }
        });
    }

    private handleTypeChange = (value: AttributeType) => {
        this.setState({
            attributeType: value,
        });
    }

    private validateAttributeName = (_: any, value: string, callback: any) => {
        if (value && !patterns.validateAttributeName.pattern.test(value)) {
            callback(patterns.validateAttributeName.message);
        }

        callback();
    }

    private validateRange(_: any, value: string, callback: any) {
        const numbers = value.split(';').map((number) => Number.parseFloat(number));
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
    }

    private renderValuesInput() {
        const value = this.props.instance ? this.props.instance.values : undefined;

        return (
            <Form.Item>
                { this.props.form.getFieldDecorator('values', {
                    initialValue: value,
                    rules: [{
                        required: true,
                        message: 'Please specify values',
                    }],
                })(
                    <Select
                        disabled={this.disabled}
                        mode='tags'
                        dropdownMenuStyle={{display: 'none'}}
                        placeholder='Attribute values'
                    />
                )}
            </Form.Item>
        );
    }

    private renderBooleanInput() {
        const value = this.props.instance ? this.props.instance.values[0] : 'false';

        return (
            <Form.Item>
                { this.props.form.getFieldDecorator('booleanDefaultValue', {
                    initialValue: value,
                })(
                    <Select disabled={this.disabled}>
                        <Select.Option value='false'> False </Select.Option>
                        <Select.Option value='true'> True </Select.Option>
                    </Select>
                )}
            </Form.Item>
        );
    }

    private renderNumberRangeInput() {
        const value = this.props.instance ? this.props.instance.values.join(';') : '';

        return (
            <Form.Item>
                { this.props.form.getFieldDecorator('numberRange', {
                    initialValue: value,
                    rules: [{
                        validator: this.validateRange,
                    }],
                })(
                    <Input disabled={this.disabled} placeholder='min;max;step'/>
                )}
            </Form.Item>
        );
    }

    private renderDefaultValueInput() {
        const value = this.props.instance ? this.props.instance.values[0] : '';

        return (
            <Form.Item>
                { this.props.form.getFieldDecorator('defaulValue', {
                    initialValue: value,
                })(
                    <Input disabled={this.disabled} placeholder='Default value'/>
                )}
            </Form.Item>
        );
    }

    private renderAttributeNameInput() {
        const value = this.props.instance ? this.props.instance.name : '';

        return (
            <Form.Item> {
                this.props.form.getFieldDecorator('name', {
                    initialValue: value,
                    rules: [{
                        required: true,
                        message: 'Please specify a name',
                    }, {
                        validator: this.validateAttributeName,
                    }],
                })(<Input disabled={this.disabled} placeholder='Name'/>)
            } </Form.Item>
        );
    }

    private renderAttributeTypeSelector() {
        const value = this.props.instance
            ? this.props.instance.type.toUpperCase() : AttributeType.SELECT;

        return (
            <Form.Item>
                <Tooltip overlay='An HTML element representing the attribute'>
                    {this.props.form.getFieldDecorator('type', {
                        initialValue: value,
                    })(
                        <Select disabled={this.disabled} onChange={this.handleTypeChange}>
                            <Select.Option value={AttributeType.SELECT}> Select </Select.Option>
                            <Select.Option value={AttributeType.RADIO}> Radio </Select.Option>
                            <Select.Option value={AttributeType.CHECKBOX}> Checkbox </Select.Option>
                            <Select.Option value={AttributeType.TEXT}> Text </Select.Option>
                            <Select.Option value={AttributeType.NUMBER}> Number </Select.Option>
                        </Select>
                    )
                }</Tooltip>
            </Form.Item>
        );
    }

    private renderMutable() {
        const value = this.props.instance ? this.props.instance.mutable : false;

        return (
            <Form.Item>
                <Tooltip overlay='Can this attribute be changed frame to frame?'>
                    { this.props.form.getFieldDecorator('mutable', {
                        initialValue: value,
                        valuePropName: 'checked'
                    })(
                        <Checkbox disabled={this.disabled}> Mutable </Checkbox>
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderSaveButton() {
        return (
            <Form.Item>
                <Tooltip overlay='Save the attribute'>
                    <Button
                        type='link'
                        htmlType='submit'
                        className='cvat-save-attribute-button'
                    >
                        <Icon type='plus-circle'/>
                    </Button>
                </Tooltip>
            </Form.Item>
        );
    }

    private renderDeleteButton() {
        return (
            <Form.Item>
                <Tooltip overlay='Delete the attribute'>
                    <Button
                        type='link'
                        className='cvat-delete-attribute-button'
                        onClick={() => {
                            this.props.onDelete(this.props.id);
                        }}
                    >
                        <Icon type='minus-circle'/>
                    </Button>
                </Tooltip>
            </Form.Item>
        );
    }

    public submitOutside() {
        return new Promise((resolve: any, reject: any) => {
            if (!this.props.instance || this.disabled) {
                resolve();
                return;
            }

            this.props.form.validateFields((error, values) => {
                if (error) {
                    // Add got fields
                    // If do not do it, input fields automatically get previous right values
                    for (const key in error) {
                        error[key].value = values[key];
                    }

                    // Draw error messages in UI
                    this.props.form.setFields(error);
                    reject(error);
                } else {
                    try {
                        this.submitAfterValidation(values);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                }
            });
        });
    }

    public render() {
        return (
            <Form onSubmit={this.handleSubmit} className='cvat-attribute-constructor-form'>
                <Row type='flex' justify='space-between' align='middle'>
                    <Col span={5}>
                        { this.renderAttributeNameInput() }
                    </Col>
                    <Col span={4}>
                        { this.renderAttributeTypeSelector() }
                    </Col>
                    <Col span={6}> {
                            [AttributeType.SELECT, AttributeType.RADIO]
                                .includes(this.state.attributeType) ?
                                    this.renderValuesInput()
                            : this.state.attributeType === AttributeType.CHECKBOX ?
                                this.renderBooleanInput()
                            : this.state.attributeType === AttributeType.NUMBER ?
                                this.renderNumberRangeInput()
                            : this.renderDefaultValueInput()
                    } </Col>
                    <Col span={5}>
                        { this.renderMutable() }
                    </Col>
                    <Col span={2}>
                        {   !this.disabled ?
                                this.props.instance ?
                                    this.renderDeleteButton() : this.renderSaveButton()
                                : null
                        }
                    </Col>
                </Row>
            </Form>
        );
    }
}

export default Form.create<Props>()(AttributeForm);
