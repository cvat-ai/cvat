// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import { Row, Col } from 'antd/lib/grid';
import { PercentageOutlined } from '@ant-design/icons';
import Input from 'antd/lib/input';
import Select from 'antd/lib/select';
import Radio from 'antd/lib/radio';
import Checkbox from 'antd/lib/checkbox';
import Form, { FormInstance, RuleObject, RuleRender } from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import { Store } from 'antd/lib/form/interface';
import CVATTooltip from 'components/common/cvat-tooltip';
import patterns from 'utils/validation-patterns';

const { Option } = Select;

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
    lfs: boolean;
    format?: string,
    repository?: string;
    useZipChunks: boolean;
    dataChunkSize?: number;
    useCache: boolean;
    copyData?: boolean;
    sortingMethod: SortingMethod;
}

const initialValues: AdvancedConfiguration = {
    imageQuality: 70,
    lfs: false,
    useZipChunks: true,
    useCache: true,
    copyData: false,
    sortingMethod: SortingMethod.LEXICOGRAPHICAL,
};

interface Props {
    onSubmit(values: AdvancedConfiguration): void;
    installedGit: boolean;
    activeFileManagerTab: string;
    dumpers: []
}

function validateURL(_: RuleObject, value: string): Promise<void> {
    if (value && !patterns.validateURL.pattern.test(value)) {
        return Promise.reject(new Error('URL is not a valid URL'));
    }

    return Promise.resolve();
}

function validateRepositoryPath(_: RuleObject, value: string): Promise<void> {
    if (value && !patterns.validatePath.pattern.test(value)) {
        return Promise.reject(new Error('Repository path is not a valid path'));
    }

    return Promise.resolve();
}

function validateRepository(_: RuleObject, value: string): Promise<[void, void]> | Promise<void> {
    if (value) {
        const [url, path] = value.split(/\s+/);
        return Promise.all([validateURL(_, url), validateRepositoryPath(_, path)]);
    }

    return Promise.resolve();
}

const isInteger = ({ min, max }: { min?: number; max?: number }) => (
    _: RuleObject,
    value?: number | string,
): Promise<void> => {
    if (typeof value === 'undefined' || value === '') {
        return Promise.resolve();
    }

    const intValue = +value;
    if (Number.isNaN(intValue) || !Number.isInteger(intValue)) {
        return Promise.reject(new Error('Value must be a positive integer'));
    }

    if (typeof min !== 'undefined' && intValue < min) {
        return Promise.reject(new Error(`Value must be more than ${min}`));
    }

    if (typeof max !== 'undefined' && intValue > max) {
        return Promise.reject(new Error(`Value must be less than ${max}`));
    }

    return Promise.resolve();
};

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
        const { onSubmit } = this.props;
        if (this.formRef.current) {
            return this.formRef.current.validateFields().then(
                (values: Store): Promise<void> => {
                    const frameFilter = values.frameStep ? `step=${values.frameStep}` : undefined;
                    const entries = Object.entries(values).filter(
                        (entry: [string, unknown]): boolean => entry[0] !== frameFilter,
                    );

                    onSubmit({
                        ...((Object.fromEntries(entries) as any) as AdvancedConfiguration),
                        frameFilter,
                    });
                    return Promise.resolve();
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
    private renderCopyDataChechbox(): JSX.Element {
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
                <Radio.Group>
                    <Radio value={SortingMethod.LEXICOGRAPHICAL} key={SortingMethod.LEXICOGRAPHICAL}>
                        Lexicographical
                    </Radio>
                    <Radio value={SortingMethod.NATURAL} key={SortingMethod.NATURAL}>Natural</Radio>
                    <Radio value={SortingMethod.PREDEFINED} key={SortingMethod.PREDEFINED}>
                        Predefined
                    </Radio>
                    <Radio value={SortingMethod.RANDOM} key={SortingMethod.RANDOM}>Random</Radio>
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

    private renderGitLFSBox(): JSX.Element {
        return (
            <Form.Item
                help='If annotation files are large, you can use git LFS feature'
                name='lfs'
                valuePropName='checked'
            >
                <Checkbox>
                    <Text className='cvat-text-color'>Use LFS (Large File Support):</Text>
                </Checkbox>
            </Form.Item>
        );
    }

    private renderGitRepositoryURL(): JSX.Element {
        return (
            <Form.Item
                hasFeedback
                name='repository'
                label='Dataset repository URL'
                extra='Attach a repository to store annotations there'
                rules={[{ validator: validateRepository }]}
            >
                <Input size='large' placeholder='e.g. https//github.com/user/repos [annotation/<anno_file_name>.zip]' />
            </Form.Item>
        );
    }

    private renderGitFormat(): JSX.Element {
        const { dumpers } = this.props;
        return (
            <Form.Item
                initialValue='CVAT for video 1.1'
                name='format'
                label='Choose format'
            >
                <Select style={{ width: '100%' }}>
                    {
                        dumpers.map((dumper: any) => (
                            <Option
                                key={dumper.name}
                                value={dumper.name}
                            >
                                {dumper.name}
                            </Option>
                        ))
                    }
                </Select>
            </Form.Item>
        );
    }

    private renderGit(): JSX.Element {
        return (
            <>
                <Row>
                    <Col span={24}>{this.renderGitRepositoryURL()}</Col>
                </Row>
                <Row>
                    <Col span={24}>{this.renderGitFormat()}</Col>
                </Row>
                <Row>
                    <Col span={24}>{this.renderGitLFSBox()}</Col>
                </Row>

            </>
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
            <Form.Item
                help='Force to use zip chunks as compressed data. Actual for videos only.'
                name='useZipChunks'
                valuePropName='checked'
            >
                <Checkbox>
                    <Text className='cvat-text-color'>Use zip chunks</Text>
                </Checkbox>
            </Form.Item>
        );
    }

    private renderCreateTaskMethod(): JSX.Element {
        return (
            <Form.Item help='Using cache to store data.' name='useCache' valuePropName='checked'>
                <Checkbox>
                    <Text className='cvat-text-color'>Use cache</Text>
                </Checkbox>
            </Form.Item>
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

    public render(): JSX.Element {
        const { installedGit, activeFileManagerTab } = this.props;
        return (
            <Form initialValues={initialValues} ref={this.formRef} layout='vertical'>
                <Row>
                    <Col>{this.renderSortingMethodRadio()}</Col>
                </Row>
                {activeFileManagerTab === 'share' ? (
                    <Row>
                        <Col>{this.renderCopyDataChechbox()}</Col>
                    </Row>
                ) : null}
                <Row>
                    <Col>{this.renderUzeZipChunks()}</Col>
                </Row>
                <Row>
                    <Col>{this.renderCreateTaskMethod()}</Col>
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

                {installedGit ? this.renderGit() : null}

                <Row>
                    <Col span={24}>{this.renderBugTracker()}</Col>
                </Row>
            </Form>
        );
    }
}

export default AdvancedConfigurationForm;
