// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect, useCallback } from 'react';
import { connect, useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import Modal from 'antd/lib/modal';
import Notification from 'antd/lib/notification';
import { DownloadOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import Form from 'antd/lib/form';
import Switch from 'antd/lib/switch';
import Space from 'antd/lib/space';
import TargetStorageField from 'components/storage/target-storage-field';
import CVATMarkdown from 'components/common/cvat-markdown';
import { CombinedState, StorageLocation } from 'reducers';
import { exportActions, exportDatasetAsync } from 'actions/export-actions';
import {
    Dumper, ProjectOrTaskOrJob, Job, Project, Storage, StorageData, Task,
} from 'cvat-core-wrapper';

type FormValues = {
    selectedFormat: string | undefined;
    saveImages: boolean;
    customName: string | undefined;
    targetStorage: StorageData;
    useProjectTargetStorage: boolean;
};

const initialValues: FormValues = {
    selectedFormat: undefined,
    saveImages: false,
    customName: undefined,
    targetStorage: {
        location: StorageLocation.LOCAL,
        cloudStorageId: undefined,
    },
    useProjectTargetStorage: true,
};

function ExportDatasetModal(props: StateToProps): JSX.Element {
    const {
        dumpers,
        instance,
    } = props;

    const [instanceType, setInstanceType] = useState('');

    const [useDefaultTargetStorage, setUseDefaultTargetStorage] = useState(true);
    const [form] = Form.useForm();
    const [targetStorage, setTargetStorage] = useState<StorageData>({
        location: StorageLocation.LOCAL,
    });
    const [defaultStorageLocation, setDefaultStorageLocation] = useState(StorageLocation.LOCAL);
    const [defaultStorageCloudId, setDefaultStorageCloudId] = useState<number>();
    const [helpMessage, setHelpMessage] = useState('');
    const dispatch = useDispatch();
    const history = useHistory();

    useEffect(() => {
        if (instance instanceof Project) {
            setInstanceType(`project #${instance.id}`);
        } else if (instance instanceof Task || instance instanceof Job) {
            if (instance instanceof Task) {
                setInstanceType(`task #${instance.id}`);
            } else {
                setInstanceType(`job #${instance.id}`);
            }
            if (instance.mode === 'interpolation' && instance.dimension === '2d') {
                form.setFieldsValue({ selectedFormat: 'CVAT for video 1.1' });
            } else if (instance.mode === 'annotation' && instance.dimension === '2d') {
                form.setFieldsValue({ selectedFormat: 'CVAT for images 1.1' });
            }
        }
    }, [instance]);

    useEffect(() => {
        if (instance) {
            setDefaultStorageLocation(instance.targetStorage.location);
            setDefaultStorageCloudId(instance.targetStorage.cloudStorageId);
        }
    }, [instance]);

    useEffect(() => {
        setHelpMessage(`Export to ${(defaultStorageLocation) ? defaultStorageLocation.split('_')[0] : 'local'} ` +
                        `storage ${(defaultStorageCloudId) ? `№${defaultStorageCloudId}` : ''}`);
    }, [defaultStorageLocation, defaultStorageCloudId]);

    const closeModal = (): void => {
        setUseDefaultTargetStorage(true);
        setTargetStorage({ location: StorageLocation.LOCAL });
        form.resetFields();
        if (instance) {
            dispatch(exportActions.closeExportDatasetModal(instance));
        }
    };

    const handleExport = useCallback(
        (values: FormValues): void => {
            // have to validate format before so it would not be undefined
            dispatch(
                exportDatasetAsync(
                    instance as ProjectOrTaskOrJob,
                    values.selectedFormat as string,
                    values.saveImages,
                    useDefaultTargetStorage,
                    useDefaultTargetStorage ? new Storage({
                        location: defaultStorageLocation,
                        cloudStorageId: defaultStorageCloudId,
                    }) : new Storage(targetStorage),
                    values.customName ? `${values.customName}.zip` : undefined,
                ),
            );
            closeModal();
            const resource = values.saveImages ? 'Dataset' : 'Annotations';
            const description = `${resource} export was started for ${instanceType}. ` +
            'You can check progress and download the file [here](/requests).';
            Notification.info({
                message: `${resource} export started`,
                description: (
                    <CVATMarkdown history={history}>{description}</CVATMarkdown>
                ),
                className: `cvat-notification-notice-export-${instanceType.split(' ')[0]}-start`,
            });
        },
        [instance, instanceType, useDefaultTargetStorage,
            defaultStorageLocation, defaultStorageCloudId, targetStorage],
    );

    return (
        <Modal
            title={<Text strong>{`Export ${instanceType} as a dataset`}</Text>}
            open={!!instance}
            onCancel={closeModal}
            onOk={() => form.submit()}
            className={`cvat-modal-export-${instanceType.split(' ')[0]}`}
            destroyOnClose
        >
            <Form
                name='Export dataset'
                form={form}
                layout='vertical'
                initialValues={initialValues}
                onFinish={handleExport}
            >
                <Form.Item
                    name='selectedFormat'
                    label={<Text strong>Export format</Text>}
                    rules={[{ required: true, message: 'Format must be selected' }]}
                >
                    <Select virtual={false} placeholder='Select dataset format' className='cvat-modal-export-select'>
                        {dumpers
                            .sort((a: Dumper, b: Dumper) => a.name.localeCompare(b.name))
                            .filter(
                                (dumper: Dumper): boolean => dumper.dimension === instance?.dimension ||
                                    (instance instanceof Project && instance.dimension === null),
                            )
                            .map(
                                (dumper: Dumper): JSX.Element => (
                                    <Select.Option
                                        value={dumper.name}
                                        key={dumper.name}
                                        className='cvat-modal-export-option-item'
                                    >
                                        <DownloadOutlined />
                                        <Text>{dumper.name}</Text>
                                    </Select.Option>
                                ),
                            )}
                    </Select>
                </Form.Item>
                <Space>
                    <Form.Item
                        className='cvat-modal-export-switch-use-default-storage'
                        name='saveImages'
                        valuePropName='checked'
                    >
                        <Switch className='cvat-modal-export-save-images' />
                    </Form.Item>
                    <Text strong>Save images</Text>
                </Space>

                <Form.Item label={<Text strong>Custom name</Text>} name='customName'>
                    <Input
                        placeholder='Custom name for a dataset'
                        suffix='.zip'
                        className='cvat-modal-export-filename-input'
                    />
                </Form.Item>
                <TargetStorageField
                    instanceId={instance ? instance.id : null}
                    switchDescription='Use default settings'
                    switchHelpMessage={helpMessage}
                    useDefaultStorage={useDefaultTargetStorage}
                    storageDescription='Specify target storage for export dataset'
                    locationValue={targetStorage.location}
                    onChangeUseDefaultStorage={(value: boolean) => setUseDefaultTargetStorage(value)}
                    onChangeStorage={(value: StorageData) => setTargetStorage(value)}
                    onChangeLocationValue={(value: StorageLocation) => {
                        setTargetStorage({ location: value });
                    }}
                />
            </Form>
        </Modal>
    );
}

interface StateToProps {
    dumpers: Dumper[];
    instance: Project | Task | Job | null;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { instanceType } = state.export;
    const instance = !instanceType ? null : (
        state.export[`${instanceType}s` as 'projects' | 'tasks' | 'jobs']
    ).dataset.modalInstance;

    return {
        instance,
        dumpers: state.formats.annotationFormats.dumpers,
    };
}

export default connect(mapStateToProps)(ExportDatasetModal);
