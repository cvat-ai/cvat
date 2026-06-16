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

export enum AdvancedConfigurationSection {
    SORTING = 'sorting',
    COPY_DATA = 'copyData',
    CHUNKING = 'chunking',
    IMAGE_QUALITY = 'imageQuality',
    FRAME_RANGE = 'frameRange',
    CHUNK_SIZE = 'chunkSize',
    CONSENSUS = 'consensus',
    BUG_TRACKER = 'bugTracker',
    STORAGE = 'storage',
}

export const CV_ADVANCED_CONFIGURATION_SECTIONS = [
    AdvancedConfigurationSection.SORTING,
    AdvancedConfigurationSection.COPY_DATA,
    AdvancedConfigurationSection.CHUNKING,
    AdvancedConfigurationSection.IMAGE_QUALITY,
    AdvancedConfigurationSection.FRAME_RANGE,
    AdvancedConfigurationSection.CHUNK_SIZE,
    AdvancedConfigurationSection.CONSENSUS,
    AdvancedConfigurationSection.BUG_TRACKER,
    AdvancedConfigurationSection.STORAGE,
];

export const AUDIO_ADVANCED_CONFIGURATION_SECTIONS = [
    AdvancedConfigurationSection.CONSENSUS,
    AdvancedConfigurationSection.BUG_TRACKER,
    AdvancedConfigurationSection.STORAGE,
];

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
    activeFileManagerTab?: string;
    sourceStorageLocation: StorageLocation;
    targetStorageLocation: StorageLocation;
    visibleSections?: AdvancedConfigurationSection[];
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

    private hasSection(section: AdvancedConfigurationSection): boolean {
        const { visibleSections = CV_ADVANCED_CONFIGURATION_SECTIONS } = this.props;
        return visibleSections.includes(section);
    }

    private getValuesWithoutFrameStep(values: Store): AdvancedConfiguration {
        const entries = Object.entries(values).filter(
            (entry: [string, unknown]): boolean => entry[0] !== 'frameStep',
        );

        return (Object.fromEntries(entries) as any) as AdvancedConfiguration;
    }

    private getFrameFilter(values: Store): Pick<AdvancedConfiguration, 'frameFilter'> {
        if (!this.hasSection(AdvancedConfigurationSection.FRAME_RANGE)) {
            return {};
        }

        return {
            frameFilter: values.frameStep ? `step=${values.frameStep}` : undefined,
        };
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

                    return onSubmit({
                        ...this.getValuesWithoutFrameStep(values),
                        ...this.getFrameFilter(values),
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
                    (values: Store): Promise<void> => (
                        onSubmit({
                            ...this.getValuesWithoutFrameStep(values),
                            ...this.getFrameFilter(values),
                            sourceStorage: new Storage(values.sourceStorage),
                            targetStorage: new Storage(values.targetStorage),
                        })
                    ),
                );
        }

        return Promise.reject(new Error('Form ref is empty'));
    }

    public resetFields(): void {
        if (this.formRef.current) {
            this.formRef.current.resetFields();
        }
    }

    private renderCopyDataCheckbox(): JSX.Element {
        return (
            <Form.Item
                help='If you have a low data transfer rate over the network you can copy data into CVAT to speed up work'
                name='copyData'
                valuePropName='checked'
            >
                <Checkbox>
                    <Text className='cvat-text-color'>Copy data into CVAT</Text>
                </Checkbox>
            </Form.Item>
        );
    }

    private renderSortingMethodRadio(): JSX.Element {
        const { onChangeSortingMethod } = this.props;

        return (
            <Form.Item
                label='Sorting method'
                name='sortingMethod'
                rules={[
                    {
                        required: true,
                        message: 'The field is required.',
                    },
                ]}
                help='Specify how to sort images. It is not relevant for videos.'
            >
                <Radio.Group buttonStyle='solid' onChange={(e) => onChangeSortingMethod(e.target.value)}>
                    <Radio.Button value={SortingMethod.LEXICOGRAPHICAL} key={SortingMethod.LEXICOGRAPHICAL}>
                        Lexicographical
                    </Radio.Button>
                    <Radio.Button value={SortingMethod.NATURAL} key={SortingMethod.NATURAL}>Natural</Radio.Button>
                    <Radio.Button value={SortingMethod.PREDEFINED} key={SortingMethod.PREDEFINED}>
                        Predefined
                    </Radio.Button>
                    <Radio.Button value={SortingMethod.RANDOM} key={SortingMethod.RANDOM}>Random</Radio.Button>
                </Radio.Group>
            </Form.Item>
        );
    }

    private renderImageQuality(): JSX.Element {
        return (
            <CVATTooltip title='Defines images compression level'>
                <Form.Item
                    label='Image quality'
                    name='imageQuality'
                    rules={[
                        {
                            required: true,
                            message: 'The field is required.',
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
            <CVATTooltip title='Defines a number of intersected frames between different segments'>
                <Form.Item
                    label='Overlap size'
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
            <CVATTooltip title='Defines a number of frames in a segment'>
                <Form.Item label='Segment size' name='segmentSize' rules={[{ validator: isInteger({ min: 1 }) }]}>
                    <Input size='large' type='number' min={1} />
                </Form.Item>
            </CVATTooltip>
        );
    }

    private renderStartFrame(): JSX.Element {
        return (
            <Form.Item label='Start frame' name='startFrame' rules={[{ validator: isInteger({ min: 0 }) }]}>
                <Input size='large' type='number' min={0} step={1} />
            </Form.Item>
        );
    }

    private renderStopFrame(): JSX.Element {
        return (
            <Form.Item
                label='Stop frame'
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
            <Form.Item label='Frame step' name='frameStep' rules={[{ validator: isInteger({ min: 1 }) }]}>
                <Input size='large' type='number' min={1} step={1} />
            </Form.Item>
        );
    }

    private renderBugTracker(): JSX.Element {
        return (
            <Form.Item
                hasFeedback
                name='bugTracker'
                label='Issue tracker'
                extra='Attach issue tracker where the task is described'
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
                <Text className='cvat-text-color'>Prefer zip chunks</Text>
                <Tooltip title='ZIP chunks have better quality, but they require more disk space and time to download. Relevant for video only'>
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
                <Text className='cvat-text-color'>Use cache</Text>
                <Tooltip title='Using cache to store data.'>
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
                <Form.Item label='Chunk size' name='dataChunkSize' rules={[{ validator: isInteger({ min: 1 }) }]}>
                    <Input size='large' type='number' />
                </Form.Item>
            </CVATTooltip>
        );
    }

    private renderConsensusReplicas(): JSX.Element {
        return (
            <Form.Item
                label='Consensus Replicas'
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
        const hasSorting = this.hasSection(AdvancedConfigurationSection.SORTING);
        const hasCopyData = this.hasSection(AdvancedConfigurationSection.COPY_DATA);
        const hasChunking = this.hasSection(AdvancedConfigurationSection.CHUNKING);
        const hasImageQuality = this.hasSection(AdvancedConfigurationSection.IMAGE_QUALITY);
        const hasFrameRange = this.hasSection(AdvancedConfigurationSection.FRAME_RANGE);
        const hasChunkSize = this.hasSection(AdvancedConfigurationSection.CHUNK_SIZE);
        const hasConsensus = this.hasSection(AdvancedConfigurationSection.CONSENSUS);
        const hasBugTracker = this.hasSection(AdvancedConfigurationSection.BUG_TRACKER);
        const hasStorage = this.hasSection(AdvancedConfigurationSection.STORAGE);

        return (
            <Form initialValues={initialValues} ref={this.formRef} layout='vertical'>
                {hasSorting && (
                    <Row>
                        <Col>{this.renderSortingMethodRadio()}</Col>
                    </Row>
                )}
                {hasCopyData && activeFileManagerTab === 'share' && (
                    <Row>
                        <Col>{this.renderCopyDataCheckbox()}</Col>
                    </Row>
                )}
                {hasChunking && (
                    <Row>
                        <Col span={12}>{this.renderUzeZipChunks()}</Col>
                        <Col span={12}>{this.renderCreateTaskMethod()}</Col>
                    </Row>
                )}
                {hasImageQuality && (
                    <Row justify='start'>
                        <Col span={7}>{this.renderImageQuality()}</Col>
                        <Col span={7} offset={1}>
                            {this.renderOverlap()}
                        </Col>
                        <Col span={7} offset={1}>
                            {this.renderSegmentSize()}
                        </Col>
                    </Row>
                )}
                {hasFrameRange && (
                    <Row justify='start'>
                        <Col span={7}>{this.renderStartFrame()}</Col>
                        <Col span={7} offset={1}>
                            {this.renderStopFrame()}
                        </Col>
                        <Col span={7} offset={1}>
                            {this.renderFrameStep()}
                        </Col>
                    </Row>
                )}
                {hasChunkSize && (
                    <Row justify='start'>
                        <Col span={7}>{this.renderChunkSize()}</Col>
                    </Row>
                )}
                {hasConsensus && (
                    <Row justify='start'>
                        <Col span={7}>
                            {this.renderConsensusReplicas()}
                        </Col>
                    </Row>
                )}
                {hasBugTracker && (
                    <Row>
                        <Col span={24}>{this.renderBugTracker()}</Col>
                    </Row>
                )}
                {hasStorage && (
                    <Row justify='space-between'>
                        <Col span={11}>
                            {this.renderSourceStorage()}
                        </Col>
                        <Col span={11} offset={1}>
                            {this.renderTargetStorage()}
                        </Col>
                    </Row>
                )}
            </Form>
        );
    }
}

export default AdvancedConfigurationForm;
