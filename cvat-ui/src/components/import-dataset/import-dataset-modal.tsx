// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Form, { RuleObject } from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import Notification from 'antd/lib/notification';
import message from 'antd/lib/message';
import Upload, { RcFile } from 'antd/lib/upload';
import { StorageLocation } from 'reducers/interfaces';
import {
    UploadOutlined, InboxOutlined, LoadingOutlined, QuestionCircleOutlined,
} from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState } from 'reducers/interfaces';
import { importActions, importDatasetAsync } from 'actions/import-actions';
import ImportDatasetStatusModal from './import-dataset-status-modal';
import Space from 'antd/lib/space';
import Switch from 'antd/lib/switch';
import getCore from 'cvat-core-wrapper';
import StorageField from 'components/storage/storage-field';
import { Storage } from 'reducers/interfaces';
import Input from 'antd/lib/input/Input';

const { confirm } = Modal;

const core = getCore();

type FormValues = {
    selectedFormat: string | undefined;
    fileName?: string | undefined;
    sourceStorage: any;
    useDefaultSettings: boolean;
};

const initialValues: FormValues = {
    selectedFormat: undefined,
    fileName: undefined,
    sourceStorage: {
        location: StorageLocation.LOCAL,
        cloud_storage_id: undefined,
    },
    useDefaultSettings: true,
}

interface UploadParams {
    resource: 'annotation' | 'dataset' | null;
    useDefaultSettings: boolean;
    sourceStorage: Storage;
    selectedFormat: string | null;
    file: File | null;
    fileName: string | null;
}

function ImportDatasetModal(): JSX.Element | null {
    const [form] = Form.useForm();
    const dispatch = useDispatch();
    const [instanceType, setInstanceType] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [selectedLoader, setSelectedLoader] = useState<any>(null);
    const [useDefaultSettings, setUseDefaultSettings] = useState(true);
    const [defaultStorageLocation, setDefaultStorageLocation] = useState('');
    const [defaultStorageCloudId, setDefaultStorageCloudId] = useState<number | null>(null);
    const [helpMessage, setHelpMessage] = useState('');
    const [selectedSourceStorage, setSelectedSourceStorage] = useState<Storage | null>(null);
    const [uploadParams, setUploadParams] = useState<UploadParams>({
        useDefaultSettings: true,
    } as UploadParams);
    const importers = useSelector((state: CombinedState) => state.formats.annotationFormats.loaders);
    const resource = useSelector((state: CombinedState) =>  state.import.resource);
    const instance = useSelector((state: CombinedState) =>  state.import.instance);
    const projectsImportState = useSelector((state: CombinedState) => state.import.projects);
    const tasksImportState = useSelector((state: CombinedState) => state.import.tasks);
    const jobsImportState = useSelector((state: CombinedState) => state.import.jobs);
    const importing = useSelector((state: CombinedState) => state.import.importing);
    const modalVisible = useSelector((state: CombinedState) => state.import.modalVisible);

    const isDataset = useCallback((): boolean => {
        return resource === 'dataset';
    }, [resource]);

    const isAnnotation = useCallback((): boolean => {
        return resource === 'annotation';
    }, [resource]);

    useEffect(() => {
        setUploadParams({
            ...uploadParams,
            resource,
            sourceStorage: {
                location: defaultStorageLocation,
                cloudStorageId: defaultStorageCloudId,
            } as Storage,
        } as UploadParams)
    }, [resource, defaultStorageLocation, defaultStorageCloudId]);

    useEffect(() => {
        if (importing) {
            setUploadParams({
                useDefaultSettings: true,
            } as UploadParams);
        }
    }, [importing])

    useEffect(() => {
        if (instance && modalVisible) {
            if (instance instanceof core.classes.Project || instance instanceof core.classes.Task) {
                setDefaultStorageLocation((instance.sourceStorage) ?
                    instance.sourceStorage.location : null);
                setDefaultStorageCloudId((instance.sourceStorage) ?
                    instance.sourceStorage.cloud_storage_id
                : null);
                if (instance instanceof core.classes.Project) {
                    setInstanceType(`project #${instance.id}`);
                } else {
                    setInstanceType(`task #${instance.id}`);
                }
            } else if (instance instanceof core.classes.Job) {
                core.tasks.get({ id: instance.taskId }).then((response: any) => {
                    if (response.length) {
                        const [taskInstance] = response;
                        setDefaultStorageLocation((taskInstance.sourceStorage) ?
                            taskInstance.sourceStorage.location : null);
                        setDefaultStorageCloudId((taskInstance.sourceStorage) ?
                            taskInstance.sourceStorage.cloud_storage_id
                        : null);
                    }
                });
                setInstanceType(`job #${instance.id}`);
            }
        }
    }, [instance?.id, resource, instance?.sourceStorage]);

    useEffect(() => {
        setHelpMessage(
            `Import from ${(defaultStorageLocation) ? defaultStorageLocation.split('_')[0] : 'local'} ` +
            `storage ${(defaultStorageCloudId) ? '№' + defaultStorageCloudId : ''}`);
    }, [defaultStorageLocation, defaultStorageCloudId]);


    const uploadLocalFile = (): JSX.Element => {
        return (
            <Upload.Dragger
                listType='text'
                fileList={file ? [file] : ([] as any[])}
                accept='.zip,.json,.xml'
                beforeUpload={(_file: RcFile): boolean => {
                    if (!selectedLoader) {
                        message.warn('Please select a format first', 3);
                    } else if (isDataset() && !['application/zip', 'application/x-zip-compressed'].includes(_file.type)) {
                        message.error('Only ZIP archive is supported for import a dataset');
                    } else if (isAnnotation() &&
                            !selectedLoader.format.toLowerCase().split(', ').includes(_file.name.split('.')[_file.name.split('.').length - 1])) {
                        message.error(`For ${selectedLoader.name} format only files with ${selectedLoader.format.toLowerCase()} extension can be used`);
                    } else {
                        setFile(_file);
                        setUploadParams({
                            ...uploadParams,
                            file: _file,
                        } as UploadParams);
                    }
                    return false;
                }}
                onRemove={() => {
                    setFile(null);
                }}
            >
                <p className='ant-upload-drag-icon'>
                    <InboxOutlined />
                </p>
                <p className='ant-upload-text'>Click or drag file to this area</p>
            </Upload.Dragger>
        );
    };

    const validateFileName = (_: RuleObject, value: string): Promise<void> => {
        if (!selectedLoader) {
            message.warn('Please select a format first', 3);
            return Promise.reject();
        }
        if (value) {
            const extension = value.toLowerCase().split('.')[value.split('.').length - 1];
            if (isAnnotation()) {
                const allowedExtensions = selectedLoader.format.toLowerCase().split(', ');
                if (!allowedExtensions.includes(extension)) {
                    return Promise.reject(new Error(`For ${selectedLoader.name} format only files with ${selectedLoader.format.toLowerCase()} extension can be used`));
                }
            }
            if (isDataset()) {
                if (extension !== 'zip') {
                    return Promise.reject(new Error('Only ZIP archive is supported for import a dataset'));
                }
            }
        }

        return Promise.resolve();
    }

    const renderCustomName = (): JSX.Element => {
        return (
            <Form.Item
                label={<Text strong>File name</Text>}
                name='fileName'
                hasFeedback
                dependencies={['selectedFormat']}
                rules={[{ validator: validateFileName }]}
            >
                <Input
                    placeholder='Dataset file name'
                    className='cvat-modal-import-filename-input'
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e.target.value) {
                            setUploadParams({
                                ...uploadParams,
                                fileName: e.target.value,
                            } as UploadParams)
                        }}
                    }
                />
            </Form.Item>
        );
    }

    const closeModal = useCallback((): void => {
        setUseDefaultSettings(true);
        form.resetFields();
        setFile(null);
        dispatch(importActions.closeImportModal(instance));
    }, [form, instance]);

    const onUpload = () => {
        if (uploadParams && uploadParams.resource) {
            dispatch(importDatasetAsync(
                instance, uploadParams.selectedFormat as string,
                uploadParams.useDefaultSettings, uploadParams.sourceStorage,
                uploadParams.file || (uploadParams.fileName as string)));
            const _resource = uploadParams.resource.charAt(0).toUpperCase() + uploadParams.resource.slice(1);
            Notification.info({
                message: `${_resource} import started`,
                description: `${_resource} import was started for ${instanceType}. `,
                className: `cvat-notification-notice-import-${uploadParams.resource}-start`,
            });
        }
    };

    const confirmUpload = () => {
        confirm({
            title: 'Current annotation will be lost',
            content: `You are going to upload new annotations to ${instanceType}. Continue?`,
            className: `cvat-modal-content-load-${instanceType.split(' ')[0]}-annotation`,
            onOk: () => {
                onUpload();
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: 'Update',
        })
    }

    const handleImport = useCallback(
        (values: FormValues): void => {
            if (file === null && !values.fileName) {
                Notification.error({
                    message: `No ${uploadParams.resource} file specified`,
                });
                return;
            }

            if (isAnnotation()) {
                confirmUpload();
            } else {
                onUpload();
            }
            closeModal();
        },
        [instance?.id, uploadParams],
    );

    return (
        <>
            <Modal
                title={(
                    <>
                        <Text>Import {resource} to {instanceType}</Text>
                        {
                            instance instanceof core.classes.Project &&
                            <CVATTooltip
                                title={
                                    instance && !instance.labels.length ?
                                        'Labels will be imported from dataset' :
                                        'Labels from project will be used'
                                }
                            >
                                <QuestionCircleOutlined className='cvat-modal-import-header-question-icon' />
                            </CVATTooltip>
                        }
                    </>
                )}
                visible={modalVisible}
                onCancel={closeModal}
                onOk={() => form.submit()}
                className='cvat-modal-import-dataset'
            >
                <Form
                    name={`Import ${resource}`}
                    form={form}
                    initialValues={initialValues}
                    onFinish={handleImport}
                    layout='vertical'
                >
                    <Form.Item
                        name='selectedFormat'
                        label='Import format'
                        rules={[{ required: true, message: 'Format must be selected' }]}
                        hasFeedback
                    >
                        <Select
                            placeholder={`Select ${resource} format`}
                            className='cvat-modal-import-select'
                            virtual={false}
                            onChange={(_format: string) => {
                                const [_loader] = importers.filter(
                                    (importer: any): boolean => importer.name === _format
                                );
                                setSelectedLoader(_loader);
                                setUploadParams({
                                    ...uploadParams,
                                    selectedFormat: _format
                                } as UploadParams);
                            }}
                        >
                            {importers
                                .sort((a: any, b: any) => a.name.localeCompare(b.name))
                                .filter(
                                    (importer: any): boolean => (
                                        instance !== null &&
                                        (!instance?.dimension || importer.dimension === instance.dimension)
                                    ),
                                )
                                .map(
                                    (importer: any): JSX.Element => {
                                        const pending = importing;
                                        const disabled = !importer.enabled || pending;
                                        return (
                                            <Select.Option
                                                value={importer.name}
                                                key={importer.name}
                                                disabled={disabled}
                                                className='cvat-modal-import-dataset-option-item'
                                            >
                                                <UploadOutlined />
                                                <Text disabled={disabled}>{importer.name}</Text>
                                                {pending && <LoadingOutlined style={{ marginLeft: 10 }} />}
                                            </Select.Option>
                                        );
                                    },
                                )}
                        </Select>
                    </Form.Item>
                    <Space>
                        <Form.Item
                            name='useDefaultSettings'
                            valuePropName='checked'
                        >
                            <Switch
                                onChange={(value: boolean) => {
                                    setUseDefaultSettings(value);
                                    setUploadParams({
                                        ...uploadParams,
                                        useDefaultSettings: value,
                                    } as UploadParams)
                                }}
                            />
                        </Form.Item>
                        <Text strong>Use default settings</Text>
                        <CVATTooltip title={helpMessage}>
                            <QuestionCircleOutlined/>
                        </CVATTooltip>
                    </Space>

                    {useDefaultSettings && (defaultStorageLocation === StorageLocation.LOCAL || defaultStorageLocation === null) && uploadLocalFile()}
                    {useDefaultSettings && defaultStorageLocation === StorageLocation.CLOUD_STORAGE && renderCustomName()}
                    {!useDefaultSettings && <StorageField
                        locationName={['sourceStorage', 'location']}
                        selectCloudStorageName={['sourceStorage', 'cloud_storage_id']}
                        onChangeStorage={(value: Storage) => {
                            setSelectedSourceStorage(value);
                            setUploadParams({
                                ...uploadParams,
                                sourceStorage: {
                                    location: (value.location) ? value.location : defaultStorageLocation,
                                    cloudStorageId: (value.location) ? value.cloudStorageId : defaultStorageCloudId,
                                } as Storage,
                            } as UploadParams);
                        }}
                    />}
                    {!useDefaultSettings && selectedSourceStorage?.location === StorageLocation.CLOUD_STORAGE && renderCustomName()}
                    {!useDefaultSettings && selectedSourceStorage?.location === StorageLocation.LOCAL && uploadLocalFile()}
                </Form>
            </Modal>
            <ImportDatasetStatusModal />
        </>
    );
}

export default React.memo(ImportDatasetModal);
