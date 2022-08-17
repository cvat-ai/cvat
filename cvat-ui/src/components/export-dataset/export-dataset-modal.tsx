// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect, useCallback } from 'react';
import Modal from 'antd/lib/modal';
import Notification from 'antd/lib/notification';
import { useSelector, useDispatch } from 'react-redux';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import Form from 'antd/lib/form';
import { CombinedState, Storage, StorageLocation } from 'reducers/interfaces';
import { exportActions, exportDatasetAsync } from 'actions/export-actions';
import getCore from 'cvat-core-wrapper';
import Switch from 'antd/lib/switch';
import { Space } from 'antd';
import TargetStorageField from 'components/storage/target-storage-field';

const core = getCore();

type FormValues = {
    selectedFormat: string | undefined;
    saveImages: boolean;
    customName: string | undefined;
    targetStorage: any;
    useProjectTargetStorage: boolean;
};

const initialValues: FormValues = {
    selectedFormat: undefined,
    saveImages: false,
    customName: undefined,
    targetStorage: {
        location: StorageLocation.LOCAL,
        cloud_storage_id: undefined,
    },
    useProjectTargetStorage: true,
}

function ExportDatasetModal(): JSX.Element | null {
    const [instanceType, setInstanceType] = useState('');
    const [activities, setActivities] = useState<string[]>([]);
    const [useDefaultTargetStorage, setUseDefaultTargetStorage] = useState(true);
    const [form] = Form.useForm();
    const [targetStorage, setTargetStorage] = useState<Storage>({
        location: StorageLocation.LOCAL,
    });
    const [defaultStorageLocation, setDefaultStorageLocation] = useState<string | null>(null);
    const [defaultStorageCloudId, setDefaultStorageCloudId] = useState<number | null>(null);
    const [helpMessage, setHelpMessage] = useState('');
    const dispatch = useDispatch();
    const resource = useSelector((state: CombinedState) => state.export.resource);
    const instance = useSelector((state: CombinedState) => state.export.instance);
    const modalVisible = useSelector((state: CombinedState) => state.export.modalVisible);
    const dumpers = useSelector((state: CombinedState) => state.formats.annotationFormats.dumpers);
    const { tasks: taskExportActivities, projects: projectExportActivities, jobs: jobExportActivities } = useSelector(
        (state: CombinedState) => state.export,
    );

    const initActivities = (): void => {
        if (resource === 'dataset') {
            if (instance instanceof core.classes.Project) {
                setInstanceType(`project #${instance.id}`);
                setActivities(projectExportActivities[instance.id]?.dataset || []);
            } else if (instance instanceof core.classes.Task || instance instanceof core.classes.Job) {
                if (instance instanceof core.classes.Task) {
                    setInstanceType(`task #${instance.id}`);
                    setActivities(taskExportActivities[instance.id]?.dataset || []);
                } else {
                    setInstanceType(`job #${instance.id}`);
                    setActivities(jobExportActivities[instance.id]?.dataset || []);
                }
                if (instance.mode === 'interpolation' && instance.dimension === '2d') {
                    form.setFieldsValue({ selectedFormat: 'CVAT for video 1.1' });
                } else if (instance.mode === 'annotation' && instance.dimension === '2d') {
                    form.setFieldsValue({ selectedFormat: 'CVAT for images 1.1' });
                }
            }
        }
    };

    useEffect(() => {
        initActivities();
    }, [instance?.id, resource, instance instanceof core.classes.Project, taskExportActivities, projectExportActivities, jobExportActivities]);


    useEffect(() => {
        if (instance && resource === 'dataset') {
            if (instance instanceof core.classes.Project || instance instanceof core.classes.Task) {
                setDefaultStorageLocation((instance.targetStorage) ?
                    instance.targetStorage.location : null);
                setDefaultStorageCloudId((instance.targetStorage) ?
                    instance.targetStorage.cloud_storage_id
                : null);
            } else {
                core.tasks.get({ id: instance.taskId }).then((response: any) => {
                    if (response.length) {
                        const [taskInstance] = response;
                        setDefaultStorageLocation((taskInstance.targetStorage) ?
                            taskInstance.targetStorage.location : null);
                        setDefaultStorageCloudId((taskInstance.targetStorage) ?
                            taskInstance.targetStorage.cloud_storage_id
                        : null);
                    }
                });
            }
        }
    }, [instance?.id, resource, instance?.targetStorage]);

    useEffect(() => {
        setHelpMessage(
            `Export to ${(defaultStorageLocation) ? defaultStorageLocation.split('_')[0] : 'local'} ` +
            `storage ${(defaultStorageCloudId) ? '№' + defaultStorageCloudId : ''}`);
    }, [defaultStorageLocation, defaultStorageCloudId]);

    const closeModal = (): void => {
        setUseDefaultTargetStorage(true);
        form.resetFields();
        dispatch(exportActions.closeExportModal());
    };

    const handleExport = useCallback(
        (values: FormValues): void => {
            // have to validate format before so it would not be undefined
            dispatch(
                exportDatasetAsync(
                    instance,
                    values.selectedFormat as string,
                    values.saveImages,
                    useDefaultTargetStorage,
                    useDefaultTargetStorage ? {
                        location: defaultStorageLocation,
                        cloud_storage_id: defaultStorageCloudId,
                    }: targetStorage,
                    values.customName ? `${values.customName}.zip` : null,
                ),
            );
            closeModal();
            Notification.info({
                message: 'Dataset export started',
                description:
                    `Dataset export was started for ${instanceType}. ` +
                    'Download will start automatically as soon as the dataset is ready.',
                className: `cvat-notification-notice-export-${instanceType.split(' ')[0]}-start`,
            });
        },
        [instance, instanceType, targetStorage],
    );

    const onChangeTargetStorage = (value: Storage): void => {
        setTargetStorage({
            ...value,
        } as Storage)
    }

    if (resource !== 'dataset') {
        return null;
    }

    return (
        <Modal
            title={<Text strong>{`Export ${instanceType} as a dataset`}</Text>}
            visible={modalVisible}
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
                            .sort((a: any, b: any) => a.name.localeCompare(b.name))
                            .filter((dumper: any): boolean => dumper.dimension === instance?.dimension)
                            .map(
                                (dumper: any): JSX.Element => {
                                    const pending = (activities || []).includes(dumper.name);
                                    const disabled = !dumper.enabled || pending;
                                    return (
                                        <Select.Option
                                            value={dumper.name}
                                            key={dumper.name}
                                            disabled={disabled}
                                            className='cvat-modal-export-option-item'
                                        >
                                            <DownloadOutlined />
                                            <Text disabled={disabled}>{dumper.name}</Text>
                                            {pending && <LoadingOutlined style={{ marginLeft: 10 }} />}
                                        </Select.Option>
                                    );
                                },
                            )}
                    </Select>
                </Form.Item>
                <Space>
                    <Form.Item name='saveImages'>
                        <Switch className='cvat-modal-export-save-images'/>
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
                    // FIXME rename to instanse?
                    projectId={instance?.id}
                    switchDescription='Use default settings'
                    switchHelpMessage={helpMessage}
                    useProjectStorage={useDefaultTargetStorage}
                    storageDescription='Specify target storage for export dataset'
                    onChangeUseProjectStorage={(value: boolean) => setUseDefaultTargetStorage(value)}
                    onChangeStorage={(value: Storage) => onChangeTargetStorage(value)}
                />
            </Form>
        </Modal>
    );
}

export default React.memo(ExportDatasetModal);
