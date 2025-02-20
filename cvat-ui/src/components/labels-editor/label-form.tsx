// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon, { DeleteOutlined, PlusCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Checkbox from 'antd/lib/checkbox';
import Select from 'antd/lib/select';
import Tag from 'antd/lib/tag';
import Form, { FormInstance } from 'antd/lib/form';
import Badge from 'antd/lib/badge';
import Modal from 'antd/lib/modal';
import { Store } from 'antd/lib/form/interface';

import { SerializedAttribute, LabelType } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import ColorPicker from 'components/annotation-page/standard-workspace/objects-side-bar/color-picker';
import { ColorizeIcon } from 'icons';
import patterns from 'utils/validation-patterns';
import config from 'config';
import {
    equalArrayHead, idGenerator, LabelOptColor, SkeletonConfiguration,
} from './common';

export enum AttributeType {
    SELECT = 'SELECT',
    RADIO = 'RADIO',
    CHECKBOX = 'CHECKBOX',
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
}

interface Props {
    label: LabelOptColor | null;
    labelNames: string[];
    onSubmit: (label: LabelOptColor) => void;
    onSkeletonSubmit?: () => SkeletonConfiguration | null;
    resetSkeleton?: () => void;
    onCancel: () => void;
}

export default class LabelForm extends React.Component<Props> {
    private formRef: RefObject<FormInstance>;
    private inputNameRef: RefObject<Input>;

    constructor(props: Props) {
        super(props);
        this.formRef = React.createRef<FormInstance>();
        this.inputNameRef = React.createRef<Input>();
    }

    private focus = (): void => {
        this.inputNameRef.current?.focus({
            cursor: 'end',
        });
    };

    private handleSubmit = (values: Store): void => {
        const {
            label, onSubmit, onSkeletonSubmit, onCancel, resetSkeleton,
        } = this.props;

        if (!values.name) {
            onCancel();
            return;
        }

        let skeletonConfiguration: SkeletonConfiguration | null = null;
        if (onSkeletonSubmit) {
            skeletonConfiguration = onSkeletonSubmit();
            if (!skeletonConfiguration) {
                return;
            }
        }

        onSubmit({
            name: values.name,
            id: label ? label.id : idGenerator(),
            color: values.color,
            type: values.type || label?.type || LabelType.ANY,
            attributes: (values.attributes || []).map((attribute: Store) => {
                let attrValues: string | string[] = attribute.values;
                if (!Array.isArray(attrValues)) {
                    if (attribute.type === AttributeType.NUMBER) {
                        attrValues = attrValues.split(';');
                    } else {
                        attrValues = [attrValues];
                    }
                }
                attrValues = attrValues.map((value: string) => value.trim());

                return {
                    ...attribute,
                    values: attrValues,
                    default_value: attribute.default_value && attrValues.includes(attribute.default_value) ?
                        attribute.default_value : attrValues[0],
                    input_type: attribute.type.toLowerCase(),
                };
            }),
            ...(skeletonConfiguration || {}),
        });

        if (this.formRef.current) {
            // resetFields does not remove existed attributes
            this.formRef.current.setFieldsValue({ attributes: undefined });
            this.formRef.current.resetFields();
            if (resetSkeleton) {
                resetSkeleton();
            }

            if (!label) {
                this.focus();
            }
        }
    };

    private addAttribute = (): void => {
        if (this.formRef.current) {
            const attributes = this.formRef.current.getFieldValue('attributes');
            this.formRef.current.setFieldsValue({
                attributes: [
                    ...(attributes || []),
                    {
                        id: idGenerator(),
                        type: AttributeType.SELECT,
                        name: '',
                        values: [],
                        mutable: false,
                    },
                ],
            });
        }
    };

    private removeAttribute = (key: number): void => {
        if (this.formRef.current) {
            const attributes = this.formRef.current.getFieldValue('attributes');
            this.formRef.current.setFieldsValue({
                attributes: attributes.filter((_: any, id: number) => id !== key),
            });
        }
    };

    /* eslint-disable class-methods-use-this */
    private renderAttributeNameInput(fieldInstance: any, attr: any): JSX.Element {
        const { key } = fieldInstance;
        const attrNames = this.formRef.current?.getFieldValue('attributes')
            .filter((_attr: any) => _attr.id !== attr.id).map((_attr: any) => _attr.name);

        return (
            <Form.Item
                hasFeedback
                name={[key, 'name']}
                rules={[
                    {
                        required: true,
                        message: 'Please specify a name',
                    },
                    {
                        pattern: patterns.validateAttributeName.pattern,
                        message: patterns.validateAttributeName.message,
                    },
                    {
                        validator: (_rule: any, attrName: string) => {
                            if (attrNames.includes(attrName) && attr.name !== attrName) {
                                return Promise.reject(new Error('Attribute name must be unique for the label'));
                            }
                            return Promise.resolve();
                        },
                    },
                ]}
            >
                <Input className='cvat-attribute-name-input' placeholder='Name' />
            </Form.Item>
        );
    }

    private renderAttributeTypeInput(fieldInstance: any, attr: any): JSX.Element {
        const { key } = fieldInstance;
        const locked = attr.id as number >= 0;

        return (
            <CVATTooltip title='An HTML element representing the attribute'>
                <Form.Item name={[key, 'type']}>
                    <Select
                        className='cvat-attribute-type-input'
                        disabled={locked}
                        onChange={(value: AttributeType) => {
                            const attrs = this.formRef.current?.getFieldValue('attributes');
                            if (value === AttributeType.CHECKBOX) {
                                attrs[key].values = ['false'];
                            } else if (value === AttributeType.TEXT && !attrs[key].values.length) {
                                attrs[key].values = '';
                            } else if (value === AttributeType.NUMBER || attr.type === AttributeType.CHECKBOX) {
                                attrs[key].values = [];
                            }
                            this.formRef.current?.setFieldsValue({
                                attributes: attrs,
                            });
                        }}
                    >
                        <Select.Option value={AttributeType.SELECT} className='cvat-attribute-type-input-select'>
                            Select
                        </Select.Option>
                        <Select.Option value={AttributeType.RADIO} className='cvat-attribute-type-input-radio'>
                            Radio
                        </Select.Option>
                        <Select.Option value={AttributeType.CHECKBOX} className='cvat-attribute-type-input-checkbox'>
                            Checkbox
                        </Select.Option>
                        <Select.Option value={AttributeType.TEXT} className='cvat-attribute-type-input-text'>
                            Text
                        </Select.Option>
                        <Select.Option value={AttributeType.NUMBER} className='cvat-attribute-type-input-number'>
                            Number
                        </Select.Option>
                    </Select>
                </Form.Item>
            </CVATTooltip>
        );
    }

    private renderAttributeValuesInput(fieldInstance: any, attr: any): JSX.Element {
        const { key } = fieldInstance;
        const locked = attr.id as number >= 0;
        const existingValues = attr.values;

        const validator = (_: any, values: string[]): Promise<void> => {
            if (locked && existingValues) {
                if (!equalArrayHead(existingValues, values)) {
                    return Promise.reject(new Error('You can only append new values'));
                }
            }

            for (const value of values) {
                if (!patterns.validateAttributeValue.pattern.test(value)) {
                    return Promise.reject(new Error(`Invalid attribute value: "${value}"`));
                }
            }

            return Promise.resolve();
        };

        return (
            <CVATTooltip title='Press enter to add a new value'>
                <Form.Item
                    name={[key, 'values']}
                    rules={[
                        {
                            required: true,
                            message: 'Please specify values',
                        },
                        {
                            validator,
                        },
                    ]}
                >
                    <Select
                        className='cvat-attribute-values-input'
                        mode='tags'
                        placeholder='Attribute values'
                        dropdownStyle={{ display: 'none' }}
                        tagRender={(props) => {
                            const attrs = this.formRef.current?.getFieldValue('attributes');
                            const isDefault = props.value === attrs[key].default_value;
                            return (
                                <CVATTooltip
                                    placement='bottom'
                                    title={isDefault ? 'This value is default' : 'Click to set default value'}
                                >
                                    <Tag
                                        visible
                                        onMouseEnter={() => {
                                            const parent = window.document.getElementsByClassName('cvat-attribute-values-input')[0];
                                            if (parent) {
                                                parent.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
                                            }
                                        }}
                                        color={isDefault ? 'blue' : undefined}
                                        onClose={() => {
                                            if (isDefault) {
                                                attrs[key].default_value = undefined;
                                            }
                                            props.onClose();
                                        }}
                                        onClick={() => {
                                            attrs[key].default_value = props.value;
                                            this.formRef.current?.setFieldsValue({
                                                attributes: attrs,
                                            });
                                        }}
                                        closable={props.closable}
                                    >
                                        {props.label}
                                    </Tag>
                                </CVATTooltip>
                            );
                        }}
                    />
                </Form.Item>
            </CVATTooltip>
        );
    }

    private renderBooleanValueInput(fieldInstance: any): JSX.Element {
        const { key } = fieldInstance;

        return (
            <CVATTooltip title='Specify a default value'>
                <Form.Item
                    rules={[
                        {
                            required: true,
                            message: 'Please, specify a default value',
                        }]}
                    name={[key, 'values']}
                >
                    <Select className='cvat-attribute-values-input'>
                        <Select.Option value='false'>False</Select.Option>
                        <Select.Option value='true'>True</Select.Option>
                    </Select>
                </Form.Item>
            </CVATTooltip>
        );
    }

    private renderNumberRangeInput(fieldInstance: any, attr: any): JSX.Element {
        const { key } = fieldInstance;
        const locked = attr.id as number >= 0;

        const validator = (_: any, strNumbers: string): Promise<void> => {
            if (typeof strNumbers !== 'string') return Promise.resolve();

            const numbers = strNumbers.split(';').map((number): number => Number.parseFloat(number));
            if (numbers.length !== 3) {
                return Promise.reject(new Error('Three numbers are expected'));
            }

            for (const number of numbers) {
                if (Number.isNaN(number)) {
                    return Promise.reject(new Error(`"${number}" is not a number`));
                }
            }

            const [min, max, step] = numbers;

            if (min >= max) {
                return Promise.reject(new Error('Minimum must be less than maximum'));
            }

            if (max - min < step) {
                return Promise.reject(new Error('Step must be less than minmax difference'));
            }

            if (step <= 0) {
                return Promise.reject(new Error('Step must be a positive number'));
            }

            return Promise.resolve();
        };

        return (
            <Form.Item
                name={[key, 'values']}
                rules={[
                    {
                        required: true,
                        message: 'Please set a range',
                    },
                    {
                        validator,
                    },
                ]}
            >
                <Input className='cvat-attribute-values-input' disabled={locked} placeholder='min;max;step' />
            </Form.Item>
        );
    }

    private renderDefaultValueInput(fieldInstance: any): JSX.Element {
        const { key } = fieldInstance;

        return (
            <Form.Item name={[key, 'values']}>
                <Input.TextArea className='cvat-attribute-values-input' placeholder='Default value' />
            </Form.Item>
        );
    }

    private renderMutableAttributeInput(fieldInstance: any, attr: any): JSX.Element {
        const { key } = fieldInstance;
        const locked = attr.id as number >= 0;

        return (
            <CVATTooltip title='Can this attribute be changed frame to frame?'>
                <Form.Item
                    name={[key, 'mutable']}
                    valuePropName='checked'
                >
                    <Checkbox className='cvat-attribute-mutable-checkbox' disabled={locked}>
                        Mutable
                    </Checkbox>
                </Form.Item>
            </CVATTooltip>
        );
    }

    private renderDeleteAttributeButton(fieldInstance: any, attr: any): JSX.Element {
        const { key } = fieldInstance;

        return (
            <CVATTooltip title='Delete the attribute'>
                <Form.Item>
                    <Button
                        disabled={attr.id >= 0} // temporary disabled, does not work on the server
                        type='link'
                        className='cvat-delete-attribute-button'
                        onClick={(): void => {
                            if (attr.id >= 0) {
                                Modal.confirm({
                                    className: 'cvat-modal-delete-label-attribute',
                                    icon: <ExclamationCircleOutlined />,
                                    title: `Do you want to remove the "${attr.name}" attribute?`,
                                    content: 'This action cannot be undone. All annotations associated to the attribute will be removed',
                                    type: 'warning',
                                    okButtonProps: { type: 'primary', danger: true },
                                    onOk: () => {
                                        this.removeAttribute(key);
                                        setTimeout(() => {
                                            this.formRef.current?.submit();
                                        });
                                    },
                                });
                            } else {
                                this.removeAttribute(key);
                            }
                        }}
                    >
                        <DeleteOutlined />
                    </Button>
                </Form.Item>
            </CVATTooltip>
        );
    }

    private renderAttribute = (fieldInstance: any): JSX.Element | null => {
        const { key } = fieldInstance;
        const attr = this.formRef.current?.getFieldValue('attributes')[key];

        return attr ? (
            <Form.Item noStyle key={key} shouldUpdate>
                {() => (
                    <Row
                        justify='space-between'
                        align='top'
                        cvat-attribute-id={attr.id}
                        className='cvat-attribute-inputs-wrapper'
                    >
                        <Col span={5}>{this.renderAttributeNameInput(fieldInstance, attr)}</Col>
                        <Col span={4}>{this.renderAttributeTypeInput(fieldInstance, attr)}</Col>
                        <Col span={6}>
                            {((): JSX.Element => {
                                const currentFieldValue = this.formRef.current?.getFieldValue('attributes')[key];
                                const type = currentFieldValue.type || AttributeType.SELECT;
                                let element = null;
                                if ([AttributeType.SELECT, AttributeType.RADIO].includes(type)) {
                                    element = this.renderAttributeValuesInput(fieldInstance, attr);
                                } else if (type === AttributeType.CHECKBOX) {
                                    element = this.renderBooleanValueInput(fieldInstance);
                                } else if (type === AttributeType.NUMBER) {
                                    element = this.renderNumberRangeInput(fieldInstance, attr);
                                } else {
                                    element = this.renderDefaultValueInput(fieldInstance);
                                }

                                return element;
                            })()}
                        </Col>
                        <Col span={5}>{this.renderMutableAttributeInput(fieldInstance, attr)}</Col>
                        <Col span={2}>{this.renderDeleteAttributeButton(fieldInstance, attr)}</Col>
                    </Row>
                )}
            </Form.Item>
        ) : null;
    };

    private renderLabelNameInput(): JSX.Element {
        const { label, labelNames, onCancel } = this.props;

        return (
            <Form.Item
                hasFeedback
                name='name'
                rules={[
                    {
                        required: true,
                        message: 'Please specify a name',
                    },
                    {
                        pattern: patterns.validateAttributeName.pattern,
                        message: patterns.validateAttributeName.message,
                    },
                    {
                        validator: (_rule: any, labelName: string) => {
                            if (labelNames.includes(labelName) && label?.name !== labelName) {
                                return Promise.reject(new Error('Label name must be unique'));
                            }
                            return Promise.resolve();
                        },
                    },
                ]}
            >
                <Input
                    ref={this.inputNameRef}
                    placeholder='Label name'
                    className='cvat-label-name-input'
                    onKeyUp={(event): void => {
                        if (event.key === 'Escape' || event.key === 'Esc' || event.keyCode === 27) {
                            onCancel();
                        }
                    }}
                    autoComplete='off'
                />
            </Form.Item>
        );
    }

    private renderLabelTypeInput(): JSX.Element {
        const { onSkeletonSubmit } = this.props;
        const isSkeleton = !!onSkeletonSubmit;
        const types = Object.values(LabelType)
            .filter((type: string) => type !== LabelType.SKELETON);
        const { label } = this.props;
        const locked = !!label?.has_parent;

        return (
            <Form.Item name='type'>
                <Select className='cvat-label-type-input' disabled={isSkeleton || locked} showSearch={false}>
                    {isSkeleton ? (
                        <Select.Option
                            className='cvat-label-type-option-skeleton'
                            value='skeleton'
                        >
                            Skeleton
                        </Select.Option>
                    ) : types.map((type: string): JSX.Element => (
                        <Select.Option className={`cvat-label-type-option-${type}`} key={type} value={type}>
                            {`${type[0].toUpperCase()}${type.slice(1)}`}
                        </Select.Option>
                    ))}
                </Select>
            </Form.Item>
        );
    }

    private renderNewAttributeButton(): JSX.Element {
        return (
            <Form.Item>
                <Button onClick={this.addAttribute} className='cvat-new-attribute-button'>
                    Add an attribute
                    <PlusCircleOutlined />
                </Button>
            </Form.Item>
        );
    }

    private renderSaveButton(): JSX.Element {
        const { label } = this.props;
        const tooltipTitle = label ? 'Save the label and return' : 'Save the label and create one more';
        const buttonText = label ? 'Done' : 'Continue';

        return (
            <CVATTooltip title={tooltipTitle}>
                <Button
                    className='cvat-submit-new-label-button'
                    style={{ width: '150px' }}
                    type='primary'
                    htmlType='submit'
                >
                    {buttonText}
                </Button>
            </CVATTooltip>
        );
    }

    private renderCancelButton(): JSX.Element {
        const { onCancel } = this.props;

        return (
            <CVATTooltip title='Do not save the label and return'>
                <Button
                    className='cvat-cancel-new-label-button'
                    type='primary'
                    danger
                    style={{ width: '150px' }}
                    onClick={(): void => {
                        onCancel();
                    }}
                >
                    Cancel
                </Button>
            </CVATTooltip>
        );
    }

    private renderChangeColorButton(): JSX.Element {
        return (
            <Form.Item noStyle shouldUpdate>
                {() => (
                    <Form.Item name='color'>
                        <ColorPicker placement='bottom'>
                            <CVATTooltip title='Change color of the label'>
                                <Button type='default' className='cvat-change-task-label-color-button'>
                                    <Badge
                                        className='cvat-change-task-label-color-badge'
                                        color={this.formRef.current?.getFieldValue('color') || config.NEW_LABEL_COLOR}
                                        text={<Icon component={ColorizeIcon} />}
                                    />
                                </Button>
                            </CVATTooltip>
                        </ColorPicker>
                    </Form.Item>
                )}
            </Form.Item>
        );
    }

    private renderAttributes() {
        return (fieldInstances: any[]): (JSX.Element | null)[] => fieldInstances.map(this.renderAttribute);
    }

    // eslint-disable-next-line react/sort-comp
    public componentDidMount(): void {
        const { label } = this.props;
        if (this.formRef.current && label && label.attributes.length) {
            const convertedAttributes = label.attributes.map(
                (attribute: SerializedAttribute): Store => ({
                    ...attribute,
                    values:
                        attribute.input_type.toUpperCase() === 'NUMBER' ? attribute.values.join(';') : attribute.values,
                    type: attribute.input_type.toUpperCase(),
                }),
            );

            for (const attr of convertedAttributes) {
                delete attr.input_type;
            }

            this.formRef.current.setFieldsValue({ attributes: convertedAttributes });
        }

        this.focus();
    }

    public render(): JSX.Element {
        const { label, onSkeletonSubmit } = this.props;
        const isSkeleton = !!onSkeletonSubmit;

        return (
            <Form
                initialValues={{
                    name: label?.name || '',
                    type: label?.type || (isSkeleton ? LabelType.SKELETON : LabelType.ANY),
                    color: label?.color || undefined,
                    attributes: (label?.attributes || []).map((attr) => ({
                        id: attr.id,
                        name: attr.name,
                        type: attr.input_type,
                        values: attr.values,
                        mutable: attr.mutable,
                        default_value: attr.default_value,
                    })),
                }}
                onFinish={this.handleSubmit}
                layout='vertical'
                ref={this.formRef}
            >
                <Row justify='start' align='top'>
                    <Col span={8}>{this.renderLabelNameInput()}</Col>
                    <Col span={3} offset={1}>{this.renderLabelTypeInput()}</Col>
                    <Col span={3} offset={1}>
                        {this.renderChangeColorButton()}
                    </Col>
                    <Col offset={1}>
                        {this.renderNewAttributeButton()}
                    </Col>
                </Row>
                <Row justify='start' align='top'>
                    <Col span={24}>
                        <Form.List name='attributes'>{this.renderAttributes()}</Form.List>
                    </Col>
                </Row>
                <Row justify='start' align='middle'>
                    <Col>{this.renderSaveButton()}</Col>
                    <Col offset={1}>{this.renderCancelButton()}</Col>
                </Row>
            </Form>
        );
    }
}
