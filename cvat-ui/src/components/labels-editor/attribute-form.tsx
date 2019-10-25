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

export enum AttributeType {
    SELECT = 'SELECT',
    RADIO = 'RADIO',
    CHECKBOX = 'CHECKBOX',
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
}

interface AttributeFormProps {
    id: number;
    instance: any;
    onSubmit: (values: any) => void;
    onDelete: (id: number) => void;
}

interface AttributeFormState {
    attributeType: AttributeType;
}

type Props = AttributeFormProps & FormComponentProps;
type State = AttributeFormState;

class AttributeForm extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            attributeType: AttributeType.SELECT,
        };
    }

    private handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        this.props.form.validateFields((error, values) => {
            if (!error) {
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
        return (
            <Form.Item hasFeedback>
                { this.props.form.getFieldDecorator('values', {
                    rules: [{
                        required: true,
                        message: 'Please specify values',
                    }],
                })(
                    <Select
                        mode='tags'
                        dropdownMenuStyle={{display: 'none'}}
                        placeholder='Attribute values'
                    />
                )}
            </Form.Item>
        );
    }

    private renderBooleanInput() {
        return (
            <Form.Item>
                { this.props.form.getFieldDecorator('booleanDefaultValue', {
                    initialValue: 'false',
                })(
                    <Select>
                        <Select.Option value='false'> False </Select.Option>
                        <Select.Option value='true'> True </Select.Option>
                    </Select>
                )}
            </Form.Item>
        );
    }

    private renderNumberRangeInput() {
        return (
            <Form.Item>
                { this.props.form.getFieldDecorator('numberRange', {
                    rules: [{
                        validator: this.validateRange,
                    }],
                })(
                    <Input placeholder='min;max;step'/>
                )}
            </Form.Item>
        );
    }

    private renderDefaultValueInput() {
        return (
            <Form.Item>
                { this.props.form.getFieldDecorator('defaulValue')(
                    <Input placeholder='Default value'/>
                )}
            </Form.Item>
        );
    }

    private renderAttributeNameInput() {
        return (
            <Form.Item hasFeedback> {
                this.props.form.getFieldDecorator('name', {
                    rules: [{
                        required: true,
                        message: 'Please specify a name',
                    }, {
                        validator: this.validateAttributeName,
                    }],
                })(<Input placeholder='Name'/>)
            } </Form.Item>
        );
    }

    private renderAttributeTypeSelector() {
        return (
            <Form.Item>
                <Tooltip overlay='An HTML element representing the attribute'>
                    {this.props.form.getFieldDecorator('type', {
                        initialValue: AttributeType.SELECT,
                    })(
                        <Select onChange={this.handleTypeChange}>
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
        return (
            <Form.Item>
                <Tooltip overlay='Can this attribute be changed frame to frame?'>
                    { this.props.form.getFieldDecorator('mutable', {
                        initialValue: false,
                        valuePropName: 'checked'
                    })(
                        <Checkbox> Mutable </Checkbox>
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderSaveButton() {
        return (
            <Form.Item>
                <Tooltip overlay='Save the attribute'>
                    <Button type='link' htmlType='submit'>
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
                    <Button type='link' onClick={() => {
                        this.props.onDelete(this.props.id);
                    }}>
                        <Icon type='minus-circle'/>
                    </Button>
                </Tooltip>
            </Form.Item>
        );
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
                        { this.renderSaveButton() }
                    </Col>
                    <Col span={2}>
                        { this.props.instance ? this.renderDeleteButton() : null }
                    </Col>
                </Row>
            </Form>
        );
    }
}

export default Form.create<Props>()(AttributeForm);
