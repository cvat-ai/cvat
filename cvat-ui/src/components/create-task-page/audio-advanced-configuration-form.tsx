// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Input from 'antd/lib/input';
import Form, { FormInstance, RuleObject, RuleRender } from 'antd/lib/form';
import { Store } from 'antd/lib/form/interface';
import patterns from 'utils/validation-patterns';
import { isInteger } from 'utils/validation';
import SourceStorageField from 'components/storage/source-storage-field';
import TargetStorageField from 'components/storage/target-storage-field';

import { getCore, Storage, StorageLocation } from 'cvat-core-wrapper';
import { AdvancedConfiguration, SortingMethod } from './advanced-configuration-form';

const core = getCore();

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
    projectId: number | null;
    useProjectSourceStorage: boolean;
    useProjectTargetStorage: boolean;
    sourceStorageLocation: StorageLocation;
    targetStorageLocation: StorageLocation;
}

function validateURL(_: RuleObject, value: string): Promise<void> {
    if (value && !patterns.validateURL.pattern.test(value)) {
        return Promise.reject(new Error('URL is not a valid URL'));
    }
    return Promise.resolve();
}

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

class AudioAdvancedConfigurationForm extends React.PureComponent<Props> {
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
                    return onSubmit({
                        ...((values as any) as AdvancedConfiguration),
                        sourceStorage: values.useProjectSourceStorage ?
                            new Storage(project.sourceStorage || { location: StorageLocation.LOCAL }) :
                            new Storage(values.sourceStorage),
                        targetStorage: values.useProjectTargetStorage ?
                            new Storage(project.targetStorage || { location: StorageLocation.LOCAL }) :
                            new Storage(values.targetStorage),
                    });
                });
            }

            return this.formRef.current.validateFields().then((values: Store): Promise<void> => onSubmit({
                ...((values as any) as AdvancedConfiguration),
                sourceStorage: new Storage(values.sourceStorage),
                targetStorage: new Storage(values.targetStorage),
            }));
        }

        return Promise.reject(new Error('Form ref is empty'));
    }

    public resetFields(): void {
        if (this.formRef.current) {
            this.formRef.current.resetFields();
        }
    }

    public render(): JSX.Element {
        const {
            projectId,
            useProjectSourceStorage,
            sourceStorageLocation,
            onChangeUseProjectSourceStorage,
            onChangeSourceStorageLocation,
            useProjectTargetStorage,
            targetStorageLocation,
            onChangeUseProjectTargetStorage,
            onChangeTargetStorageLocation,
        } = this.props;

        return (
            <Form initialValues={initialValues} ref={this.formRef} layout='vertical'>
                <Row justify='start'>
                    <Col span={7}>
                        <Form.Item
                            label='Start frame'
                            name='startFrame'
                            rules={[{ validator: isInteger({ min: 0 }) }]}
                        >
                            <Input size='large' type='number' min={0} step={1} />
                        </Form.Item>
                    </Col>
                    <Col span={7} offset={1}>
                        <Form.Item
                            label='Stop frame'
                            name='stopFrame'
                            dependencies={['startFrame']}
                            rules={[{ validator: isInteger({ min: 0 }) }, validateStopFrame]}
                        >
                            <Input size='large' type='number' min={0} step={1} />
                        </Form.Item>
                    </Col>
                </Row>
                <Row justify='start'>
                    <Col span={7}>
                        <Form.Item
                            label='Consensus Replicas'
                            name='consensusReplicas'
                            rules={[{
                                validator: isInteger({
                                    min: 0,
                                    max: 10,
                                    filter: (intValue: number): boolean => intValue !== 1,
                                }),
                            }]}
                        >
                            <Input size='large' type='number' min={0} max={10} step={1} />
                        </Form.Item>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Form.Item
                            hasFeedback
                            name='bugTracker'
                            label='Issue tracker'
                            extra='Attach issue tracker where the task is described'
                            rules={[{ validator: validateURL }]}
                        >
                            <Input size='large' />
                        </Form.Item>
                    </Col>
                </Row>
                <Row justify='space-between'>
                    <Col span={11}>
                        <SourceStorageField
                            instanceId={projectId}
                            locationValue={sourceStorageLocation}
                            switchDescription='Use project source storage'
                            storageDescription='Specify source storage for import resources like annotation, backups'
                            useDefaultStorage={useProjectSourceStorage}
                            onChangeUseDefaultStorage={onChangeUseProjectSourceStorage}
                            onChangeLocationValue={onChangeSourceStorageLocation}
                        />
                    </Col>
                    <Col span={11} offset={1}>
                        <TargetStorageField
                            instanceId={projectId}
                            locationValue={targetStorageLocation}
                            switchDescription='Use project target storage'
                            storageDescription='Specify target storage for export resources like annotation, backups'
                            useDefaultStorage={useProjectTargetStorage}
                            onChangeUseDefaultStorage={onChangeUseProjectTargetStorage}
                            onChangeLocationValue={onChangeTargetStorageLocation}
                        />
                    </Col>
                </Row>
            </Form>
        );
    }
}

export default AudioAdvancedConfigurationForm;
