// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
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

import { SerializedLabel, SerializedAttribute } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import { validateParsedLabel, idGenerator, LabelOptColor } from './common';

function replaceTrailingCommas(value: string): string {
    return value.replace(/,{1}[\s]*}/g, '}');
}

function transformSkeletonSVG(value: string): string {
    // converts all data-label-id="<id>" to corresponding data-label-name="<name>" for skeletons SVG code
    // the function guarantees successful result only if all labels configuration is passed
    // or if the whole configuration for one label is passed (with sublabels, etc)

    let data = value;
    const idNameMapping: Record<string, string> = {};
    try {
        const parsed = JSON.parse(data.trim().startsWith('[') ? data : `[${data}]`);
        for (const label of parsed) {
            for (const sublabel of (label.sublabels || [])) {
                idNameMapping[sublabel.id] = sublabel.name;
            }
        }
    } catch (error: any) {
        // unsuccessful parsing, return value as is
        return value;
    }

    const matches = data.matchAll(/data-label-id=&quot;([\d]+)&quot;/g);
    for (const match of matches) {
        if (idNameMapping[match[1]]) {
            data = data.replace(
                match[0], `data-label-name=&quot;${idNameMapping[match[1]]}&quot;`,
            );
        }
    }

    return data;
}

function validateLabels(_: RuleObject, value: string): Promise<void> {
    try {
        const parsed = JSON.parse(replaceTrailingCommas(value));
        if (!Array.isArray(parsed)) {
            return Promise.reject(new Error('Field is expected to be a JSON array'));
        }
        const labelNames = parsed.map((label: SerializedLabel) => label.name);
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
    labels: LabelOptColor[];
    onSubmit: (labels: LabelOptColor[]) => void;
}

function convertLabels(labels: LabelOptColor[]): LabelOptColor[] {
    return labels.map(
        (label: LabelOptColor): LabelOptColor => ({
            ...label,
            id: (label.id as number) < 0 ? undefined : label.id,
            svg: label.svg ? label.svg.replaceAll('"', '&quot;') : undefined,
            attributes: label.attributes.map(
                (attribute: any): SerializedAttribute => ({
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
        const parsed = JSON.parse(
            replaceTrailingCommas(values.labels),
        ) as SerializedLabel[];

        const labelIDs: number[] = [];
        const attrIDs: number[] = [];
        for (const label of parsed) {
            if (label.svg) {
                label.svg = label.svg.replaceAll('&quot;', '"');
            }
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

        const deletedLabels = labels
            .filter((_label: LabelOptColor) => {
                const labelID = _label.id as number;
                return labelID >= 0 && !labelIDs.includes(labelID);
            });

        const deletedAttributes = labels
            .reduce((acc: SerializedAttribute[], _label) => [...acc, ..._label.attributes], [])
            .filter((_attr: SerializedAttribute) => {
                const attrID = _attr.id as number;
                return attrID >= 0 && !attrIDs.includes(attrID);
            });

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
                                        .map((_label: LabelOptColor): JSX.Element => (
                                            <Tag key={_label.id as number} color={_label.color}>{_label.name}</Tag>
                                        ))}
                                </div>

                            </Paragraph>
                        ) : null}
                        {deletedAttributes.length ? (
                            <Paragraph>
                                Following attributes are going to be removed:
                                <div className='cvat-modal-confirm-content-remove-existing-attributes'>
                                    {deletedAttributes.map((_attr: SerializedAttribute) => (
                                        <Tag key={_attr.id as number}>{_attr.name}</Tag>
                                    ))}
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
                            const data = transformSkeletonSVG(e.clipboardData.getData('text'));
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
                            <Button
                                className='cvat-submit-raw-labels-conf-button'
                                style={{ width: '150px' }}
                                type='primary'
                                htmlType='submit'
                            >
                                Done
                            </Button>
                        </CVATTooltip>
                    </Col>
                    <Col offset={1}>
                        <CVATTooltip title='Reset all changes'>
                            <Button
                                className='cvat-reset-raw-labels-conf-button'
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
