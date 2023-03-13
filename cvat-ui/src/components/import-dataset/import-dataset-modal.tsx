// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import Form, { RuleObject } from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import Notification from 'antd/lib/notification';
import message from 'antd/lib/message';
import Upload, { RcFile } from 'antd/lib/upload';
import Input from 'antd/lib/input/Input';
import {
    UploadOutlined, InboxOutlined, LoadingOutlined, QuestionCircleOutlined,
} from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState, StorageLocation } from 'reducers';
import { importActions, importDatasetAsync } from 'actions/import-actions';
import Space from 'antd/lib/space';
import Switch from 'antd/lib/switch';
import { getCore, Storage, StorageData } from 'cvat-core-wrapper';
import StorageField from 'components/storage/storage-field';
import ImportDatasetStatusModal from './import-dataset-status-modal';

const { confirm } = Modal;

const core = getCore();

type FormValues = {
    selectedFormat: string | undefined;
    fileName?: string | undefined;
    sourceStorage: StorageData;
    useDefaultSettings: boolean;
};

const initialValues: FormValues = {
    selectedFormat: undefined,
    fileName: undefined,
    sourceStorage: {
        location: StorageLocation.LOCAL,
        cloudStorageId: undefined,
    },
    useDefaultSettings: true,
};

interface UploadParams {
    resource: 'annotation' | 'dataset';
    convMaskToPoly: boolean;
    useDefaultSettings: boolean;
    sourceStorage: Storage;
    selectedFormat: string | null;
    file: File | null;
    fileName: string | null;
}

function ImportDatasetModal(props: StateToProps): JSX.Element {
    const {
        importers,
        instanceT,
        instance,
        current,
    } = props;
    const [form] = Form.useForm();
    const dispatch = useDispatch();
    // TODO useState -> useReducer
    const [instanceType, setInstanceType] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [selectedLoader, setSelectedLoader] = useState<any>(null);
    const [useDefaultSettings, setUseDefaultSettings] = useState(true);
    const [defaultStorageLocation, setDefaultStorageLocation] = useState(StorageLocation.LOCAL);
    const [defaultStorageCloudId, setDefaultStorageCloudId] = useState<number | undefined>(undefined);
    const [helpMessage, setHelpMessage] = useState('');
    const [selectedSourceStorageLocation, setSelectedSourceStorageLocation] = useState(StorageLocation.LOCAL);
    const [uploadParams, setUploadParams] = useState<UploadParams>({
        convMaskToPoly: true,
        useDefaultSettings: true,
    } as UploadParams);
    const [resource, setResource] = useState('');

    useEffect(() => {
        if (instanceT === 'project') {
            setResource('dataset');
        } else if (instanceT === 'task' || instanceT === 'job') {
            setResource('annotation');
        }
    }, [instanceT]);

    const isDataset = useCallback((): boolean => resource === 'dataset', [resource]);
    const isAnnotation = useCallback((): boolean => resource === 'annotation', [resource]);

    useEffect(() => {
        setUploadParams({
            ...uploadParams,
            resource,
            sourceStorage: {
                location: defaultStorageLocation,
                cloudStorageId: defaultStorageCloudId,
            } as Storage,
        } as UploadParams);
    }, [resource, defaultStorageLocation, defaultStorageCloudId]);

    useEffect(() => {
        if (instance) {
            if (instance instanceof core.classes.Project || instance instanceof core.classes.Task) {
                setDefaultStorageLocation(instance.sourceStorage?.location || StorageLocation.LOCAL);
                setDefaultStorageCloudId(instance.sourceStorage?.cloudStorageId || null);
                if (instance instanceof core.classes.Project) {
                    setInstanceType(`project #${instance.id}`);
                } else {
                    setInstanceType(`task #${instance.id}`);
                }
            } else if (instance instanceof core.classes.Job) {
                core.tasks.get({ id: instance.taskId })
                    .then((response: any) => {
                        if (response.length) {
                            const [taskInstance] = response;
                            setDefaultStorageLocation(taskInstance.sourceStorage?.location || StorageLocation.LOCAL);
                            setDefaultStorageCloudId(taskInstance.sourceStorage?.cloudStorageId || null);
                        }
                    })
                    .catch((error: Error) => {
                        if ((error as any).code !== 403) {
                            Notification.error({
                                message: `Could not get task instance ${instance.taskId}`,
                                description: error.toString(),
                            });
                        }
                    });
                setInstanceType(`job #${instance.id}`);
            }
        }
    }, [instance, resource]);

    useEffect(() => {
        setHelpMessage(
            // eslint-disable-next-line prefer-template
            `Import from ${(defaultStorageLocation) ? defaultStorageLocation.split('_')[0] : 'local'} ` +
            `storage ${(defaultStorageCloudId) ? `№${defaultStorageCloudId}` : ''}`,
        );
    }, [defaultStorageLocation, defaultStorageCloudId]);

    const uploadLocalFile = (): JSX.Element => (
        <Form.Item
            getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                    return e;
                }
                return e?.fileList[0];
            }}
            name='dragger'
            rules={[{ required: true, message: 'The file is required' }]}
        >
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
                        message.error(
                            `For ${selectedLoader.name} format only files with ` +
                                `${selectedLoader.format.toLowerCase()} extension can be used`,
                        );
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
        </Form.Item>
    );

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
                    return Promise.reject(new Error(
                        `For ${selectedLoader.name} format only files with ` +
                        `${selectedLoader.format.toLowerCase()} extension can be used`,
                    ));
                }
            }
            if (isDataset()) {
                if (extension !== 'zip') {
                    return Promise.reject(new Error('Only ZIP archive is supported for import a dataset'));
                }
            }
        }

        return Promise.resolve();
    };

    const renderCustomName = (): JSX.Element => (
        <Form.Item
            label={<Text strong>File name</Text>}
            name='fileName'
            hasFeedback
            dependencies={['selectedFormat']}
            rules={[{ validator: validateFileName }, { required: true, message: 'Please, specify a name' }]}
            required
        >
            <Input
                placeholder='Dataset file name'
                className='cvat-modal-import-filename-input'
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setUploadParams({
                        ...uploadParams,
                        fileName: e.target.value || '',
                    } as UploadParams);
                }}
            />
        </Form.Item>
    );

    const closeModal = useCallback((): void => {
        setUseDefaultSettings(true);
        setSelectedSourceStorageLocation(StorageLocation.LOCAL);
        form.resetFields();
        setFile(null);
        dispatch(importActions.closeImportDatasetModal(instance));
    }, [form, instance]);

    const onUpload = (): void => {
        if (uploadParams && uploadParams.resource) {
            dispatch(importDatasetAsync(
                instance, uploadParams.selectedFormat as string,
                uploadParams.useDefaultSettings, uploadParams.sourceStorage,
                uploadParams.file || uploadParams.fileName as string,
                uploadParams.convMaskToPoly,
            ) as any);
            const resToPrint = uploadParams.resource.charAt(0).toUpperCase() + uploadParams.resource.slice(1);
            Notification.info({
                message: `${resToPrint} import started`,
                description: `${resToPrint} import was started for ${instanceType}. `,
                className: `cvat-notification-notice-import-${uploadParams.resource}-start`,
            });
        }
    };

    const confirmUpload = (): void => {
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
        });
    };

    const handleImport = useCallback(
        (): void => {
            if (isAnnotation()) {
                confirmUpload();
            } else {
                onUpload();
            }
            closeModal();
        },
        [instance, uploadParams],
    );

    const loadFromLocal = (useDefaultSettings && (
        defaultStorageLocation === StorageLocation.LOCAL ||
        defaultStorageLocation === null
    )) || (!useDefaultSettings && selectedSourceStorageLocation === StorageLocation.LOCAL);

    return (
        <>
            <Modal
                title={(
                    <>
                        <Text strong>
                            {`Import ${resource} to ${instanceType}`}
                        </Text>
                        {
                            instance instanceof core.classes.Project && (
                                <CVATTooltip
                                    title={
                                        instance && !instance.labels.length ?
                                            'Labels will be imported from dataset' :
                                            'Labels from project will be used'
                                    }
                                >
                                    <QuestionCircleOutlined className='cvat-modal-import-header-question-icon' />
                                </CVATTooltip>
                            )
                        }
                    </>
                )}
                visible={!!instance}
                onCancel={closeModal}
                onOk={() => form.submit()}
                className='cvat-modal-import-dataset'
                destroyOnClose
            >
                <Form
                    name={`Import ${resource}`}
                    form={form}
                    initialValues={{
                        ...initialValues,
                        convMaskToPoly: uploadParams.convMaskToPoly,
                    }}
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
                            onChange={(format: string) => {
                                const [loader] = importers.filter(
                                    (importer: any): boolean => importer.name === format,
                                );
                                setSelectedLoader(loader);
                                setUploadParams({
                                    ...uploadParams,
                                    selectedFormat: format,
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
                                        const pending = current ? instance.id in current : false;
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
                    <Space className='cvat-modal-import-switch-conv-mask-to-poly-container'>
                        <Form.Item
                            name='convMaskToPoly'
                            valuePropName='checked'
                            className='cvat-modal-import-switch-conv-mask-to-poly'
                        >
                            <Switch
                                onChange={(value: boolean) => {
                                    setUploadParams({
                                        ...uploadParams,
                                        convMaskToPoly: value,
                                    } as UploadParams);
                                }}
                            />
                        </Form.Item>
                        <Text strong>Convert masks to polygons</Text>
                        <CVATTooltip title='The option is relevant for formats that work with masks only'>
                            <QuestionCircleOutlined />
                        </CVATTooltip>
                    </Space>
                    <Space className='cvat-modal-import-switch-use-default-storage-container'>
                        <Form.Item
                            name='useDefaultSettings'
                            valuePropName='checked'
                            className='cvat-modal-import-switch-use-default-storage'
                        >
                            <Switch
                                onChange={(value: boolean) => {
                                    setUseDefaultSettings(value);
                                    setUploadParams({
                                        ...uploadParams,
                                        useDefaultSettings: value,
                                    } as UploadParams);
                                }}
                            />
                        </Form.Item>
                        <Text strong>Use default settings</Text>
                        <CVATTooltip title={helpMessage}>
                            <QuestionCircleOutlined />
                        </CVATTooltip>
                    </Space>
                    {!useDefaultSettings && (
                        <StorageField
                            locationName={['sourceStorage', 'location']}
                            selectCloudStorageName={['sourceStorage', 'cloudStorageId']}
                            onChangeStorage={(value: StorageData) => {
                                setUploadParams({
                                    ...uploadParams,
                                    sourceStorage: new Storage({
                                        location: value?.location || defaultStorageLocation,
                                        cloudStorageId: (value.location) ? value.cloudStorageId : defaultStorageCloudId,
                                    }),
                                } as UploadParams);
                            }}
                            locationValue={selectedSourceStorageLocation}
                            onChangeLocationValue={(value: StorageLocation) => setSelectedSourceStorageLocation(value)}
                        />
                    )}
                    { !loadFromLocal && renderCustomName() }
                    { loadFromLocal && uploadLocalFile() }
                </Form>
            </Modal>
            <ImportDatasetStatusModal />
        </>
    );
}

interface StateToProps {
    importers: any;
    instanceT: 'project' | 'task' | 'job' | null;
    instance: any;
    current: any;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { instanceType } = state.import;

    return {
        importers: state.formats.annotationFormats.loaders,
        instanceT: instanceType,
        instance: !instanceType ? null : (
            state.import[`${instanceType}s` as 'projects' | 'tasks' | 'jobs']
        ).dataset.modalInstance,
        current: !instanceType ? null : (
            state.import[`${instanceType}s` as 'projects' | 'tasks' | 'jobs']
        ).dataset.current,
    };
}

export default connect(mapStateToProps)(ImportDatasetModal);
