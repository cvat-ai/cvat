// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect, useCallback } from 'react';
import { connect, useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import Notification from 'antd/lib/notification';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import Form from 'antd/lib/form';
import Switch from 'antd/lib/switch';
import Space from 'antd/lib/space';
import TargetStorageField from 'components/storage/target-storage-field';
import { CombinedState, StorageLocation } from 'reducers';
import { exportActions, exportDatasetAsync } from 'actions/export-actions';
import { getCore, Storage, StorageData } from 'cvat-core-wrapper';

const core = getCore();

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
        current,
    } = props;

    const [instanceType, setInstanceType] = useState('');

    const [useDefaultTargetStorage, setUseDefaultTargetStorage] = useState(true);
    const [form] = Form.useForm();
    const [targetStorage, setTargetStorage] = useState<StorageData>({
        location: StorageLocation.LOCAL,
    });
    const [defaultStorageLocation, setDefaultStorageLocation] = useState(StorageLocation.LOCAL);
    const [defaultStorageCloudId, setDefaultStorageCloudId] = useState<number | null>(null);
    const [helpMessage, setHelpMessage] = useState('');
    const dispatch = useDispatch();

    useEffect(() => {
        if (instance instanceof core.classes.Project) {
            setInstanceType(`project #${instance.id}`);
        } else if (instance instanceof core.classes.Task || instance instanceof core.classes.Job) {
            if (instance instanceof core.classes.Task) {
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
            if (instance instanceof core.classes.Project || instance instanceof core.classes.Task) {
                setDefaultStorageLocation(instance.targetStorage?.location || StorageLocation.LOCAL);
                setDefaultStorageCloudId(instance.targetStorage?.cloudStorageId || null);
            } else {
                core.tasks.get({ id: instance.taskId })
                    .then((response: any) => {
                        if (response.length) {
                            const [taskInstance] = response;
                            setDefaultStorageLocation(taskInstance.targetStorage?.location || StorageLocation.LOCAL);
                            setDefaultStorageCloudId(taskInstance.targetStorage?.cloudStorageId || null);
                        }
                    })
                    .catch((error: Error) => {
                        if ((error as any).code !== 403) {
                            Notification.error({
                                message: `Could not fetch the task ${instance.taskId}`,
                                description: error.toString(),
                            });
                        }
                    });
            }
        }
    }, [instance]);

    useEffect(() => {
        // eslint-disable-next-line prefer-template
        setHelpMessage(`Export to ${(defaultStorageLocation) ? defaultStorageLocation.split('_')[0] : 'local'} ` +
                        `storage ${(defaultStorageCloudId) ? `№${defaultStorageCloudId}` : ''}`);
    }, [defaultStorageLocation, defaultStorageCloudId]);

    const closeModal = (): void => {
        setUseDefaultTargetStorage(true);
        setTargetStorage({ location: StorageLocation.LOCAL });
        form.resetFields();
        dispatch(exportActions.closeExportDatasetModal(instance));
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
                    useDefaultTargetStorage ? new Storage({
                        location: defaultStorageLocation,
                        cloudStorageId: defaultStorageCloudId,
                    }) : new Storage(targetStorage),
                    values.customName ? `${values.customName}.zip` : null,
                ),
            );
            closeModal();
            const resource = values.saveImages ? 'Dataset' : 'Annotations';
            Notification.info({
                message: `${resource} export started`,
                description:
                    `${resource} export was started for ${instanceType}. ` +
                    `Download will start automatically as soon as the ${resource} is ready.`,
                className: `cvat-notification-notice-export-${instanceType.split(' ')[0]}-start`,
            });
        },
        [instance, instanceType, useDefaultTargetStorage, defaultStorageLocation, defaultStorageCloudId, targetStorage],
    );

    return (
        <Modal
            title={<Text strong>{`Export ${instanceType} as a dataset`}</Text>}
            visible={!!instance}
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
                                    const pending = (instance && current ? current : [])
                                        .includes(dumper.name);
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
                    <Form.Item name='saveImages' className='cvat-modal-export-switch-use-default-storage'>
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
                    instanceId={instance?.id}
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
    dumpers: any;
    instance: any;
    current: any;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { instanceType } = state.export;
    const instance = !instanceType ? null : (
        state.export[`${instanceType}s` as 'projects' | 'tasks' | 'jobs']
    ).dataset.modalInstance;

    return {
        instance,
        current: !instanceType ? [] : (
            state.export[`${instanceType}s` as 'projects' | 'tasks' | 'jobs']
        ).dataset.current[instance.id],
        dumpers: state.formats.annotationFormats.dumpers,
    };
}

export default connect(mapStateToProps)(ExportDatasetModal);
