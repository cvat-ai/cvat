// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import { Row, Col } from 'antd/lib/grid';
import { PercentageOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import Input from 'antd/lib/input';
import Space from 'antd/lib/space';
import Switch from 'antd/lib/switch';
import Tooltip from 'antd/lib/tooltip';
import Radio from 'antd/lib/radio';
import Checkbox from 'antd/lib/checkbox';
import Form, { FormInstance, RuleObject, RuleRender } from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import { Store } from 'antd/lib/form/interface';
import CVATTooltip from 'components/common/cvat-tooltip';
import patterns from 'utils/validation-patterns';
import { isInteger } from 'utils/validation';
import SourceStorageField from 'components/storage/source-storage-field';
import TargetStorageField from 'components/storage/target-storage-field';

import {
    getCore, Storage, StorageData, StorageLocation,
} from 'cvat-core-wrapper';

const core = getCore();

export enum SortingMethod {
    LEXICOGRAPHICAL = 'lexicographical',
    NATURAL = 'natural',
    PREDEFINED = 'predefined',
    RANDOM = 'random',
}

export interface AdvancedConfiguration {
    bugTracker?: string;
    imageQuality?: number;
    overlapSize?: number;
    segmentSize?: number;
    startFrame?: number;
    stopFrame?: number;
    frameFilter?: string;
    useZipChunks: boolean;
    dataChunkSize?: number;
    useCache: boolean;
    copyData?: boolean;
    sortingMethod: SortingMethod;
    useProjectSourceStorage: boolean;
    useProjectTargetStorage: boolean;
    consensusReplicas: number;
    sourceStorage: StorageData;
    targetStorage: StorageData;
}

const initialValues: AdvancedConfiguration = {
    imageQuality: 70,
    useZipChunks: true,
    useCache: true,
    copyData: false,
    sortingMethod: SortingMethod.LEXICOGRAPHICAL,
    useProjectSourceStorage: true,
    useProjectTargetStorage: true,
    consensusReplicas: 0,

    sourceStorage: {
        location: StorageLocation.LOCAL,
        cloudStorageId: undefined,
    },
    targetStorage: {
        location: StorageLocation.LOCAL,
        cloudStorageId: undefined,
    },
};

interface Props {
    onSubmit(values: AdvancedConfiguration): Promise<void>;
    onChangeUseProjectSourceStorage(value: boolean): void;
    onChangeUseProjectTargetStorage(value: boolean): void;
    onChangeSourceStorageLocation: (value: StorageLocation) => void;
    onChangeTargetStorageLocation: (value: StorageLocation) => void;
    onChangeSortingMethod(value: SortingMethod): void;
    projectId: number | null;
    useProjectSourceStorage: boolean;
    useProjectTargetStorage: boolean;
    activeFileManagerTab: string;
    sourceStorageLocation: StorageLocation;
    targetStorageLocation: StorageLocation;
}

function validateURL(_: RuleObject, value: string): Promise<void> {
    if (value && !patterns.validateURL.pattern.test(value)) {
        return Promise.reject(new Error('URL is not a valid URL'));
    }

    return Promise.resolve();
}

const validateOverlapSize: RuleRender = ({ getFieldValue }): RuleObject => ({
    validator(_: RuleObject, value?: string | number): Promise<void> {
        if (typeof value !== 'undefined' && value !== '') {
            const segmentSize = getFieldValue('segmentSize');
            if (typeof segmentSize !== 'undefined' && segmentSize !== '') {
                if (+segmentSize <= +value) {
                    return Promise.reject(new Error('Segment size must be more than overlap size'));
                }
            }
        }

        return Promise.resolve();
    },
});

const validateStopFrame: RuleRender = ({ getFieldValue }): RuleObject => ({
    validator(_: RuleObject, value?: string | number): Promise<void> {
        if (typeof value !== 'undefined' && value !== '') {
            const startFrame = getFieldValue('startFrame');
            if (typeof startFrame !== 'undefined' && startFrame !== '') {
                if (+startFrame > +value) {
                    return Promise.reject(new Error('Start frame must not be more than stop frame'));
                }
            }
        }

        return Promise.resolve();
    },
});

class AdvancedConfigurationForm extends React.PureComponent<Props> {
    private formRef: RefObject<FormInstance>;

    public constructor(props: Props) {
        super(props);
        this.formRef = React.createRef<FormInstance>();
    }

    public submit(): Promise<void> {
        const { onSubmit, projectId } = this.props;

        if (this.formRef.current) {
            if (projectId) {
                return Promise.all([
                    core.projects.get({ id: projectId }),
                    this.formRef.current.validateFields(),
                ]).then(([getProjectResponse, values]) => {
                    const [project] = getProjectResponse;
                    const frameFilter = values.frameStep ? `step=${values.frameStep}` : undefined;
                    const entries = Object.entries(values).filter(
                        (entry: [string, unknown]): boolean => entry[0] !== frameFilter,
                    );

                    return onSubmit({
                        ...((Object.fromEntries(entries) as any) as AdvancedConfiguration),
                        frameFilter,
                        sourceStorage: values.useProjectSourceStorage ?
                            new Storage(project.sourceStorage || { location: StorageLocation.LOCAL }) :
                            new Storage(values.sourceStorage),
                        targetStorage: values.useProjectTargetStorage ?
                            new Storage(project.targetStorage || { location: StorageLocation.LOCAL }) :
                            new Storage(values.targetStorage),
                    });
                });
            }

            return this.formRef.current.validateFields()
                .then(
                    (values: Store): Promise<void> => {
                        const frameFilter = values.frameStep ? `step=${values.frameStep}` : undefined;
                        const entries = Object.entries(values).filter(
                            (entry: [string, unknown]): boolean => entry[0] !== frameFilter,
                        );

                        return onSubmit({
                            ...((Object.fromEntries(entries) as any) as AdvancedConfiguration),
                            frameFilter,
                            sourceStorage: new Storage(values.sourceStorage),
                            targetStorage: new Storage(values.targetStorage),
                        });
                    },
                );
        }

        return Promise.reject(new Error('Form ref is empty'));
    }

    public resetFields(): void {
        if (this.formRef.current) {
            this.formRef.current.resetFields();
        }
    }

    /* eslint-disable class-methods-use-this */
    private renderCopyDataCheckbox(): JSX.Element {
        return (
            <Form.Item
                help='如果网络传输速率较低，可以将数据复制到 CVAT 以加快工作速度'
                name='copyData'
                valuePropName='checked'
            >
                <Checkbox>
                    <Text className='cvat-text-color'>将数据复制到 CVAT</Text>
                </Checkbox>
            </Form.Item>
        );
    }

    private renderSortingMethodRadio(): JSX.Element {
        const { onChangeSortingMethod } = this.props;

        return (
            <Form.Item
                label='排序方式'
                name='sortingMethod'
                rules={[
                    {
                        required: true,
                        message: '此字段为必填项。',
                    },
                ]}
                help='指定图像排序方式。对视频无效。'
            >
                <Radio.Group buttonStyle='solid' onChange={(e) => onChangeSortingMethod(e.target.value)}>
                    <Radio.Button value={SortingMethod.LEXICOGRAPHICAL} key={SortingMethod.LEXICOGRAPHICAL}>
                        字典序
                    </Radio.Button>
                    <Radio.Button value={SortingMethod.NATURAL} key={SortingMethod.NATURAL}>自然排序</Radio.Button>
                    <Radio.Button value={SortingMethod.PREDEFINED} key={SortingMethod.PREDEFINED}>
                        预定义
                    </Radio.Button>
                    <Radio.Button value={SortingMethod.RANDOM} key={SortingMethod.RANDOM}>随机</Radio.Button>
                </Radio.Group>
            </Form.Item>
        );
    }

    private renderImageQuality(): JSX.Element {
        return (
            <CVATTooltip title='定义图像压缩级别'>
                <Form.Item
                    label='图像质量'
                    name='imageQuality'
                    rules={[
                        {
                            required: true,
                            message: '此字段为必填项。',
                        },
                        { validator: isInteger({ min: 5, max: 100 }) },
                    ]}
                >
                    <Input size='large' type='number' min={5} max={100} suffix={<PercentageOutlined />} />
                </Form.Item>
            </CVATTooltip>
        );
    }

    private renderOverlap(): JSX.Element {
        return (
            <CVATTooltip title='定义不同分段之间的重叠帧数'>
                <Form.Item
                    label='重叠大小'
                    name='overlapSize'
                    dependencies={['segmentSize']}
                    rules={[{ validator: isInteger({ min: 0 }) }, validateOverlapSize]}
                >
                    <Input size='large' type='number' min={0} />
                </Form.Item>
            </CVATTooltip>
        );
    }

    private renderSegmentSize(): JSX.Element {
        return (
            <CVATTooltip title='定义分段中的帧数'>
            <Form.Item label='分段大小' name='segmentSize' rules={[{ validator: isInteger({ min: 1 }) }]}>
                    <Input size='large' type='number' min={1} />
                </Form.Item>
            </CVATTooltip>
        );
    }

    private renderStartFrame(): JSX.Element {
        return (
            <Form.Item label='起始帧' name='startFrame' rules={[{ validator: isInteger({ min: 0 }) }]}>
                <Input size='large' type='number' min={0} step={1} />
            </Form.Item>
        );
    }

    private renderStopFrame(): JSX.Element {
        return (
            <Form.Item
                label='结束帧'
                name='stopFrame'
                dependencies={['startFrame']}
                rules={[{ validator: isInteger({ min: 0 }) }, validateStopFrame]}
            >
                <Input size='large' type='number' min={0} step={1} />
            </Form.Item>
        );
    }

    private renderFrameStep(): JSX.Element {
        return (
            <Form.Item label='帧步长' name='frameStep' rules={[{ validator: isInteger({ min: 1 }) }]}>
                <Input size='large' type='number' min={1} step={1} />
            </Form.Item>
        );
    }

    private renderBugTracker(): JSX.Element {
        return (
            <Form.Item
                hasFeedback
                name='bugTracker'
                label='问题追踪'
                extra='关联描述任务的 Issue 跟踪地址'
                rules={[{ validator: validateURL }]}
            >
                <Input size='large' />
            </Form.Item>
        );
    }

    private renderUzeZipChunks(): JSX.Element {
        return (
            <Space>
                <Form.Item
                    name='useZipChunks'
                    valuePropName='checked'
                    className='cvat-settings-switch'
                >
                    <Switch />
                </Form.Item>
                <Text className='cvat-text-color'>优先使用 ZIP 分块</Text>
                <Tooltip title='ZIP 分块质量更好，但会占用更多磁盘空间且下载耗时更长。仅对视频有效。'>
                    <QuestionCircleOutlined style={{ opacity: 0.5 }} />
                </Tooltip>
            </Space>
        );
    }

    private renderCreateTaskMethod(): JSX.Element {
        return (
            <Space>
                <Form.Item
                    name='useCache'
                    valuePropName='checked'
                    className='cvat-settings-switch'
                >
                    <Switch defaultChecked />
                </Form.Item>
                <Text className='cvat-text-color'>使用缓存</Text>
                <Tooltip title='使用缓存存储数据。'>
                    <QuestionCircleOutlined style={{ opacity: 0.5 }} />
                </Tooltip>
            </Space>
        );
    }

    private renderChunkSize(): JSX.Element {
        return (
            <CVATTooltip
                title={(
                    <>
                        Defines a number of frames to be packed in a chunk when send from client to server. Server
                        defines automatically if empty.
                        <br />
                        Recommended values:
                        <br />
                        1080p or less: 36
                        <br />
                        2k or less: 8 - 16
                        <br />
                        4k or less: 4 - 8
                        <br />
                        More: 1 - 4
                    </>
                )}
            >
                <Form.Item label='分块大小' name='dataChunkSize' rules={[{ validator: isInteger({ min: 1 }) }]}>
                    <Input size='large' type='number' />
                </Form.Item>
            </CVATTooltip>
        );
    }

    private renderConsensusReplicas(): JSX.Element {
        return (
            <Form.Item
                label='共识副本数'
                name='consensusReplicas'
                rules={[
                    {
                        validator: isInteger({
                            min: 0,
                            max: 10,
                            filter: (intValue: number): boolean => intValue !== 1,
                        }),
                    },
                ]}
            >
                <Input
                    size='large'
                    type='number'
                    min={0}
                    max={10}
                    step={1}
                />
            </Form.Item>
        );
    }

    private renderSourceStorage(): JSX.Element {
        const {
            projectId,
            useProjectSourceStorage,
            sourceStorageLocation,
            onChangeUseProjectSourceStorage,
            onChangeSourceStorageLocation,
        } = this.props;
        return (
            <SourceStorageField
                instanceId={projectId}
                locationValue={sourceStorageLocation}
                switchDescription='Use project source storage'
                storageDescription='Specify source storage for import resources like annotation, backups'
                useDefaultStorage={useProjectSourceStorage}
                onChangeUseDefaultStorage={onChangeUseProjectSourceStorage}
                onChangeLocationValue={onChangeSourceStorageLocation}
            />
        );
    }

    private renderTargetStorage(): JSX.Element {
        const {
            projectId,
            useProjectTargetStorage,
            targetStorageLocation,
            onChangeUseProjectTargetStorage,
            onChangeTargetStorageLocation,
        } = this.props;
        return (
            <TargetStorageField
                instanceId={projectId}
                locationValue={targetStorageLocation}
                switchDescription='Use project target storage'
                storageDescription='Specify target storage for export resources like annotation, backups                '
                useDefaultStorage={useProjectTargetStorage}
                onChangeUseDefaultStorage={onChangeUseProjectTargetStorage}
                onChangeLocationValue={onChangeTargetStorageLocation}
            />
        );
    }

    public render(): JSX.Element {
        const { activeFileManagerTab } = this.props;
        return (
            <Form initialValues={initialValues} ref={this.formRef} layout='vertical'>
                <Row>
                    <Col>{this.renderSortingMethodRadio()}</Col>
                </Row>
                {activeFileManagerTab === 'share' ? (
                    <Row>
                        <Col>{this.renderCopyDataCheckbox()}</Col>
                    </Row>
                ) : null}
                <Row>
                    <Col span={12}>{this.renderUzeZipChunks()}</Col>
                    <Col span={12}>{this.renderCreateTaskMethod()}</Col>
                </Row>
                <Row justify='start'>
                    <Col span={7}>{this.renderImageQuality()}</Col>
                    <Col span={7} offset={1}>
                        {this.renderOverlap()}
                    </Col>
                    <Col span={7} offset={1}>
                        {this.renderSegmentSize()}
                    </Col>
                </Row>

                <Row justify='start'>
                    <Col span={7}>{this.renderStartFrame()}</Col>
                    <Col span={7} offset={1}>
                        {this.renderStopFrame()}
                    </Col>
                    <Col span={7} offset={1}>
                        {this.renderFrameStep()}
                    </Col>
                </Row>

                <Row justify='start'>
                    <Col span={7}>{this.renderChunkSize()}</Col>
                </Row>
                <Row justify='start'>
                    <Col span={7}>
                        {this.renderConsensusReplicas()}
                    </Col>
                </Row>

                <Row>
                    <Col span={24}>{this.renderBugTracker()}</Col>
                </Row>
                <Row justify='space-between'>
                    <Col span={11}>
                        {this.renderSourceStorage()}
                    </Col>
                    <Col span={11} offset={1}>
                        {this.renderTargetStorage()}
                    </Col>
                </Row>
            </Form>
        );
    }
}

export default AdvancedConfigurationForm;


