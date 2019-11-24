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

import {
    equalArrayHead,
    idGenerator,
    Label,
    Attribute,
} from './common';
import patterns from '../../utils/validation-patterns';

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

interface State {

}

class LabelForm extends React.PureComponent<Props, State> {
    private continueAfterSubmit: boolean;

    constructor(props: Props) {
        super(props);

        this.continueAfterSubmit = false;
    }

    private handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        this.props.form.validateFields((error, values) => {
            if (!error) {
                this.props.onSubmit({
                    name: values.labelName,
                    id: this.props.label ? this.props.label.id : idGenerator(),
                    attributes: values.keys.map((key: number, index: number) => {
                        return {
                            name: values.attrName[key],
                            type: values.type[key],
                            mutable: values.mutable[key],
                            id: this.props.label && index < this.props.label.attributes.length
                                ? this.props.label.attributes[index].id : key,
                            values: Array.isArray(values.values[key])
                                ? values.values[key] : [values.values[key]]
                        };
                    }),
                });

                this.props.form.resetFields();

                if (!this.continueAfterSubmit) {
                    this.props.onSubmit(null);
                }
            }
        });
    }

    private addAttribute = () => {
        const { form } = this.props;
        const keys = form.getFieldValue('keys');
        const nextKeys = keys.concat(idGenerator());
        form.setFieldsValue({
            keys: nextKeys,
        });
    }

    private removeAttribute = (key: number) => {
        const { form } = this.props;
        const keys = form.getFieldValue('keys');
        form.setFieldsValue({
            keys: keys.filter((_key: number) => _key !== key),
        });
    }

    private renderAttributeNameInput(key: number, attr: Attribute | null) {
        const locked = attr ? attr.id >= 0 : false;
        const value = attr ? attr.name : '';

        return (
            <Col span={5}>
                <Form.Item hasFeedback> {
                    this.props.form.getFieldDecorator(`attrName[${key}]`, {
                        initialValue: value,
                        rules: [{
                            required: true,
                            message: 'Please specify a name',
                        }, {
                            pattern: patterns.validateAttributeName.pattern,
                            message: patterns.validateAttributeName.message,
                        }],
                    })(<Input disabled={locked} placeholder='Name'/>)
                } </Form.Item>
            </Col>
        );
    }

    private renderAttributeTypeInput(key: number, attr: Attribute | null) {
        const locked = attr ? attr.id >= 0 : false;
        const type = attr ? attr.type.toUpperCase() : AttributeType.SELECT;

        return (
            <Col span={4}>
                <Form.Item>
                    <Tooltip overlay='An HTML element representing the attribute'>
                        {this.props.form.getFieldDecorator(`type[${key}]`, {
                            initialValue: type,
                        })(
                            <Select disabled={locked}>
                                <Select.Option value={AttributeType.SELECT}> Select </Select.Option>
                                <Select.Option value={AttributeType.RADIO}> Radio </Select.Option>
                                <Select.Option value={AttributeType.CHECKBOX}> Checkbox </Select.Option>
                                <Select.Option value={AttributeType.TEXT}> Text </Select.Option>
                                <Select.Option value={AttributeType.NUMBER}> Number </Select.Option>
                            </Select>
                        )
                    }</Tooltip>
                </Form.Item>
            </Col>
        );
    }

    private renderAttributeValuesInput(key: number, attr: Attribute | null) {
        const locked = attr ? attr.id >= 0 : false;
        const existedValues = attr ? attr.values : [];

        const validator = (_: any, values: string[], callback: any) => {
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
        }

        return (
            <Form.Item>
                { this.props.form.getFieldDecorator(`values[${key}]`, {
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
                        dropdownMenuStyle={{display: 'none'}}
                        placeholder='Attribute values'
                    />
                )}
            </Form.Item>
        );
    }

    private renderBooleanValueInput(key: number, attr: Attribute | null) {
        const value = attr ? attr.values[0] : 'false';

        return (
            <Form.Item>
                { this.props.form.getFieldDecorator(`values[${key}]`, {
                    initialValue: value,
                })(
                    <Select>
                        <Select.Option value='false'> False </Select.Option>
                        <Select.Option value='true'> True </Select.Option>
                    </Select>
                )}
            </Form.Item>
        );
    }

    private renderNumberRangeInput(key: number, attr: Attribute | null) {
        const locked = attr ? attr.id >= 0 : false;
        const value = attr ? attr.values[0] : '';

        const validator = (_: any, value: string, callback: any) => {
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

        return (
            <Form.Item>
                { this.props.form.getFieldDecorator(`values[${key}]`, {
                    initialValue: value,
                    rules: [{
                        required: true,
                        message: 'Please set a range',
                    }, {
                        validator,
                    }]
                })(
                    <Input disabled={locked} placeholder='min;max;step'/>
                )}
            </Form.Item>
        );
    }

    private renderDefaultValueInput(key: number, attr: Attribute | null) {
        const value = attr ? attr.values[0] : '';

        return (
            <Form.Item>
                { this.props.form.getFieldDecorator(`values[${key}]`, {
                    initialValue: value,
                })(
                    <Input placeholder='Default value'/>
                )}
            </Form.Item>
        );
    }

    private renderMutableAttributeInput(key: number, attr: Attribute | null) {
        const locked = attr ? attr.id >= 0 : false;
        const value = attr ? attr.mutable : false;

        return (
            <Form.Item>
                <Tooltip overlay='Can this attribute be changed frame to frame?'>
                    { this.props.form.getFieldDecorator(`mutable[${key}]`, {
                        initialValue: value,
                        valuePropName: 'checked',
                    })(
                        <Checkbox disabled={locked}> Mutable </Checkbox>
                    )}
                </Tooltip>
            </Form.Item>
        );
    }

    private renderDeleteAttributeButton(key: number, attr: Attribute | null) {
        const locked = attr ? attr.id >= 0 : false;

        return (
            <Form.Item>
                <Tooltip overlay='Delete the attribute'>
                    <Button
                        type='link'
                        className='cvat-delete-attribute-button'
                        disabled={locked}
                        onClick={() => {
                            this.removeAttribute(key);
                        }}
                    >
                        <Icon type='close-circle'/>
                    </Button>
                </Tooltip>
            </Form.Item>
        );
    }

    private renderAttribute = (key: number, index: number) => {
        const attr = (this.props.label && index < this.props.label.attributes.length
            ? this.props.label.attributes[index]
            : null);

        return (
            <Form.Item key={key}>
                <Row type='flex' justify='space-between' align='middle'>
                    { this.renderAttributeNameInput(key, attr) }
                    { this.renderAttributeTypeInput(key, attr) }
                    <Col span={6}> {
                        (() => {
                            const type = this.props.form.getFieldValue(`type[${key}]`);
                            let element = null;

                            [AttributeType.SELECT, AttributeType.RADIO]
                                .includes(type) ?
                                element = this.renderAttributeValuesInput(key, attr)
                            : type === AttributeType.CHECKBOX ?
                                element = this.renderBooleanValueInput(key, attr)
                            : type === AttributeType.NUMBER ?
                                element = this.renderNumberRangeInput(key, attr)
                            :   element = this.renderDefaultValueInput(key, attr)

                            return element;
                        })()
                    } </Col>
                    <Col span={5}>
                        { this.renderMutableAttributeInput(key, attr) }
                    </Col>
                    <Col span={2}>
                        { this.renderDeleteAttributeButton(key, attr) }
                    </Col>
                </Row>
            </Form.Item>
        );
    }

    private renderLabelNameInput() {
        const value = this.props.label ? this.props.label.name : '';
        const locked = this.props.label ? this.props.label.id >= 0 : false;

        return (
            <Col span={10}>
                <Form.Item hasFeedback> {
                    this.props.form.getFieldDecorator('labelName', {
                        initialValue: value,
                        rules: [{
                            required: true,
                            message: 'Please specify a name',
                        }, {
                            pattern: patterns.validateAttributeName.pattern,
                            message: patterns.validateAttributeName.message,
                        }]
                    })(<Input disabled={locked} placeholder='Label name'/>)
                } </Form.Item>
            </Col>
        );
    }

    private renderNewAttributeButton() {
        return (
            <Col span={3}>
                <Form.Item>
                    <Button type='ghost' onClick={this.addAttribute}>
                        Add an attribute <Icon type="plus"/>
                    </Button>
                </Form.Item>
            </Col>
        );
    }

    private renderDoneButton() {
        return (
            <Col>
                <Tooltip overlay='Save the label and return'>
                    <Button
                        style={{width: '150px'}}
                        type='primary'
                        htmlType='submit'
                        onClick={() => {
                            this.continueAfterSubmit = false;
                        }}
                    > Done </Button>
                </Tooltip>
            </Col>
        );
    }

    private renderContinueButton() {
        return (
            this.props.label ? <div/> :
                <Col  offset={1}>
                    <Tooltip overlay='Save the label and create one more'>
                        <Button
                            style={{width: '150px'}}
                            type='primary'
                            htmlType='submit'
                            onClick={() => {
                                this.continueAfterSubmit = true;
                            }}
                        > Continue </Button>
                    </Tooltip>
                </Col>
            );
    }

    private renderCancelButton() {
        return (
            <Col offset={1}>
                <Tooltip overlay='Do not save the label and return'>
                    <Button
                        style={{width: '150px'}}
                        type='danger'
                        onClick={() => {
                            this.props.onSubmit(null);
                        }}
                    > Cancel </Button>
                </Tooltip>
            </Col>
        );
    }

    public render() {
        this.props.form.getFieldDecorator('keys', {
            initialValue: this.props.label
                ? this.props.label.attributes.map((attr: Attribute) => attr.id)
                : []
        });

        let keys = this.props.form.getFieldValue('keys');
        const attributeItems = keys.map(this.renderAttribute);

        return (
            <Form onSubmit={this.handleSubmit}>
                <Row type='flex' justify='start' align='middle'>
                    { this.renderLabelNameInput() }
                    <Col span={1}/>
                    { this.renderNewAttributeButton() }
                </Row>
                { attributeItems.length > 0 ?
                    <Row type='flex' justify='start' align='middle'>
                        <Col>
                            <Text> Attributes </Text>
                        </Col>
                    </Row> : null
                }
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


// add validators
// add initial values
// add readonly fields
