// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Form, { FormInstance, RuleObject } from 'antd/lib/form';
import Tag from 'antd/lib/tag';
import Modal from 'antd/lib/modal';
import { Store } from 'antd/lib/form/interface';
import Paragraph from 'antd/lib/typography/Paragraph';

import CVATTooltip from 'components/common/cvat-tooltip';
import {
    Label, Attribute, validateParsedLabel, idGenerator,
} from './common';

function validateLabels(_: RuleObject, value: string): Promise<void> {
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
            return Promise.reject(new Error('Field is expected to be a JSON array'));
        }
        const labelNames = parsed.map((label: Label) => label.name);
        if (new Set(labelNames).size !== labelNames.length) {
            return Promise.reject(new Error('Label names must be unique for the task'));
        }

        for (const label of parsed) {
            try {
                validateParsedLabel(label);
            } catch (error) {
                return Promise.reject(error);
            }
        }
    } catch (error) {
        return Promise.reject(error);
    }

    return Promise.resolve();
}

interface Props {
    labels: Label[];
    onSubmit: (labels: Label[]) => void;
}

function convertLabels(labels: Label[]): Label[] {
    return labels.map(
        (label: any): Label => ({
            ...label,
            id: label.id < 0 ? undefined : label.id,
            attributes: label.attributes.map(
                (attribute: any): Attribute => ({
                    ...attribute,
                    id: attribute.id < 0 ? undefined : attribute.id,
                }),
            ),
        }),
    );
}

export default class RawViewer extends React.PureComponent<Props> {
    private formRef: RefObject<FormInstance>;

    public constructor(props: Props) {
        super(props);
        this.formRef = React.createRef<FormInstance>();
    }

    public componentDidUpdate(prevProps: Props): void {
        const { labels } = this.props;
        if (JSON.stringify(prevProps.labels) !== JSON.stringify(labels) && this.formRef.current) {
            const convertedLabels = convertLabels(labels);
            const textLabels = JSON.stringify(convertedLabels, null, 2);
            this.formRef.current.setFieldsValue({ labels: textLabels });
        }
    }

    private handleSubmit = (values: Store): void => {
        const { onSubmit, labels } = this.props;
        const parsed = JSON.parse(values.labels);

        const labelIDs: number[] = [];
        const attrIDs: number[] = [];
        for (const label of parsed) {
            label.id = label.id || idGenerator();
            if (label.id >= 0) {
                labelIDs.push(label.id);
            }
            for (const attr of label.attributes) {
                attr.id = attr.id || idGenerator();
                if (attr.id >= 0) {
                    attrIDs.push(attr.id);
                }
            }
        }

        const deletedLabels = labels.filter((_label: Label) => _label.id >= 0 && !labelIDs.includes(_label.id));
        const deletedAttributes = labels
            .reduce((acc: Attribute[], _label) => [...acc, ..._label.attributes], [])
            .filter((_attr: Attribute) => _attr.id >= 0 && !attrIDs.includes(_attr.id));

        if (deletedLabels.length || deletedAttributes.length) {
            Modal.confirm({
                title: 'You are going to remove existing labels/attributes',
                className: 'cvat-modal-confirm-remove-existing-labels',
                content: (
                    <>
                        {deletedLabels.length ? (
                            <Paragraph>
                                Following labels are going to be removed:
                                <div className='cvat-modal-confirm-content-remove-existing-labels'>
                                    {deletedLabels
                                        .map((_label: Label) => <Tag color={_label.color}>{_label.name}</Tag>)}
                                </div>

                            </Paragraph>
                        ) : null}
                        {deletedAttributes.length ? (
                            <Paragraph>
                                Following attributes are going to be removed:
                                <div className='cvat-modal-confirm-content-remove-existing-attributes'>
                                    {deletedAttributes.map((_attr: Attribute) => <Tag>{_attr.name}</Tag>)}
                                </div>
                            </Paragraph>
                        ) : null}
                        <Paragraph type='danger'>All related annotations will be destroyed. Continue?</Paragraph>
                    </>
                ),
                okText: 'Delete existing data',
                okButtonProps: {
                    danger: true,
                },
                onOk: () => {
                    onSubmit(parsed);
                },
                closable: true,
            });
        } else {
            onSubmit(parsed);
        }
    };

    public render(): JSX.Element {
        const { labels } = this.props;
        const convertedLabels = convertLabels(labels);
        const textLabels = JSON.stringify(convertedLabels, null, 2);
        return (
            <Form layout='vertical' onFinish={this.handleSubmit} ref={this.formRef}>
                <Form.Item name='labels' initialValue={textLabels} rules={[{ validator: validateLabels }]}>
                    <Input.TextArea
                        onPaste={(e: React.ClipboardEvent) => {
                            const data = e.clipboardData.getData('text');
                            const element = window.document.getElementsByClassName('cvat-raw-labels-viewer')[0] as HTMLTextAreaElement;
                            if (element && this.formRef.current) {
                                const { selectionStart, selectionEnd } = element;
                                // remove all "id": <number>,
                                let replaced = data.replace(/[\s]*"id":[\s]?[-{0-9}]+[,]?/g, '');
                                if (replaced !== data) {
                                    // remove all carriage characters (textarea value does not contain them)
                                    replaced = replaced.replace(/\r/g, '');
                                    const value = this.formRef.current.getFieldValue('labels');
                                    const updatedValue = value
                                        .substr(0, selectionStart) + replaced + value.substr(selectionEnd);
                                    this.formRef.current.setFieldsValue({ labels: updatedValue });
                                    setTimeout(() => {
                                        element.setSelectionRange(selectionEnd, selectionEnd);
                                    });
                                    e.preventDefault();
                                }
                            }
                        }}
                        rows={5}
                        className='cvat-raw-labels-viewer'
                    />
                </Form.Item>
                <Row justify='start' align='middle'>
                    <Col>
                        <CVATTooltip title='Save labels'>
                            <Button style={{ width: '150px' }} type='primary' htmlType='submit'>
                                Done
                            </Button>
                        </CVATTooltip>
                    </Col>
                    <Col offset={1}>
                        <CVATTooltip title='Reset all changes'>
                            <Button
                                type='primary'
                                danger
                                style={{ width: '150px' }}
                                onClick={(): void => {
                                    if (this.formRef.current) {
                                        this.formRef.current.resetFields();
                                    }
                                }}
                            >
                                Reset
                            </Button>
                        </CVATTooltip>
                    </Col>
                </Row>
            </Form>
        );
    }
}
