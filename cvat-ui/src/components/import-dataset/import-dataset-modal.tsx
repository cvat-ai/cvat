// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useReducer } from 'react';
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
import { createAction, ActionUnion } from 'utils/redux';
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
    resource: 'annotation' | 'dataset' | null;
    convMaskToPoly: boolean;
    useDefaultSettings: boolean;
    sourceStorage: Storage;
    selectedFormat: string | null;
    file: File | null;
    fileName: string | null;
}

interface State {
    instanceType: string;
    file: File | null;
    selectedLoader: any;
    useDefaultSettings: boolean;
    defaultStorageLocation: string;
    defaultStorageCloudId?: number;
    helpMessage: string;
    selectedSourceStorageLocation: StorageLocation;
    uploadParams: UploadParams;
    resource: string;
}

enum ReducerActionType {
    SET_INSTANCE_TYPE = 'SET_INSTANCE_TYPE',
    SET_FILE = 'SET_FILE',
    SET_SELECTED_LOADER = 'SET_SELECTED_LOADER',
    SET_USE_DEFAULT_SETTINGS = 'SET_USE_DEFAULT_SETTINGS',
    SET_DEFAULT_STORAGE_LOCATION = 'SET_DEFAULT_STORAGE_LOCATION',
    SET_DEFAULT_STORAGE_CLOUD_ID = 'SET_DEFAULT_STORAGE_CLOUD_ID',
    SET_HELP_MESSAGE = 'SET_HELP_MESSAGE',
    SET_SELECTED_SOURCE_STORAGE_LOCATION = 'SET_SELECTED_SOURCE_STORAGE_LOCATION',
    SET_FILE_NAME = 'SET_FILE_NAME',
    SET_SELECTED_FORMAT = 'SET_SELECTED_FORMAT',
    SET_CONV_MASK_TO_POLY = 'SET_CONV_MASK_TO_POLY',
    SET_SOURCE_STORAGE = 'SET_SOURCE_STORAGE',
    SET_RESOURCE = 'SET_RESOURCE',
}

export const reducerActions = {
    setInstanceType: (instanceType: string) => (
        createAction(ReducerActionType.SET_INSTANCE_TYPE, { instanceType })
    ),
    setFile: (file: File | null) => (
        createAction(ReducerActionType.SET_FILE, { file })
    ),
    setSelectedLoader: (selectedLoader: any) => (
        createAction(ReducerActionType.SET_SELECTED_LOADER, { selectedLoader })
    ),
    setUseDefaultSettings: (useDefaultSettings: boolean) => (
        createAction(ReducerActionType.SET_USE_DEFAULT_SETTINGS, { useDefaultSettings })
    ),
    setDefaultStorageLocation: (defaultStorageLocation: string) => (
        createAction(ReducerActionType.SET_DEFAULT_STORAGE_LOCATION, { defaultStorageLocation })
    ),
    setDefaultStorageCloudId: (defaultStorageCloudId?: number) => (
        createAction(ReducerActionType.SET_DEFAULT_STORAGE_CLOUD_ID, { defaultStorageCloudId })
    ),
    setHelpMessage: (helpMessage: string) => (
        createAction(ReducerActionType.SET_HELP_MESSAGE, { helpMessage })
    ),
    setSelectedSourceStorageLocation: (selectedSourceStorageLocation: StorageLocation) => (
        createAction(ReducerActionType.SET_SELECTED_SOURCE_STORAGE_LOCATION, { selectedSourceStorageLocation })
    ),
    setFileName: (fileName: string) => (
        createAction(ReducerActionType.SET_FILE_NAME, { fileName })
    ),
    setSelectedFormat: (selectedFormat: string) => (
        createAction(ReducerActionType.SET_SELECTED_FORMAT, { selectedFormat })
    ),
    setConvMaskToPoly: (convMaskToPoly: boolean) => (
        createAction(ReducerActionType.SET_CONV_MASK_TO_POLY, { convMaskToPoly })
    ),
    setSourceStorage: (sourceStorage: Storage) => (
        createAction(ReducerActionType.SET_SOURCE_STORAGE, { sourceStorage })
    ),
    setResource: (resource: string) => (
        createAction(ReducerActionType.SET_RESOURCE, { resource })
    ),
};

const reducer = (state: State, action: ActionUnion<typeof reducerActions>): State => {
    if (action.type === ReducerActionType.SET_INSTANCE_TYPE) {
        return {
            ...state,
            instanceType: action.payload.instanceType,
        };
    }

    if (action.type === ReducerActionType.SET_FILE) {
        return {
            ...state,
            file: action.payload.file,
            uploadParams: {
                ...state.uploadParams,
                file: action.payload.file,
            },
        };
    }

    if (action.type === ReducerActionType.SET_SELECTED_LOADER) {
        return {
            ...state,
            selectedLoader: action.payload.selectedLoader,
        };
    }

    if (action.type === ReducerActionType.SET_USE_DEFAULT_SETTINGS) {
        const isDefaultSettings = action.payload.useDefaultSettings;
        return {
            ...state,
            useDefaultSettings: action.payload.useDefaultSettings,
            uploadParams: {
                ...state.uploadParams,
                useDefaultSettings: action.payload.useDefaultSettings,
                sourceStorage: isDefaultSettings ? new Storage({
                    location: state.defaultStorageLocation === StorageLocation.LOCAL ?
                        StorageLocation.LOCAL : StorageLocation.CLOUD_STORAGE,
                    cloudStorageId: state.defaultStorageCloudId,
                }) : state.uploadParams.sourceStorage,
            },
        };
    }

    if (action.type === ReducerActionType.SET_DEFAULT_STORAGE_LOCATION) {
        return {
            ...state,
            defaultStorageLocation: action.payload.defaultStorageLocation,
            uploadParams: {
                ...state.uploadParams,
                sourceStorage: new Storage({
                    location: action.payload.defaultStorageLocation === StorageLocation.LOCAL ?
                        StorageLocation.LOCAL : StorageLocation.CLOUD_STORAGE,
                    cloudStorageId: state.defaultStorageCloudId,
                }),
            },
        };
    }

    if (action.type === ReducerActionType.SET_DEFAULT_STORAGE_CLOUD_ID) {
        return {
            ...state,
            defaultStorageCloudId: action.payload.defaultStorageCloudId,
            uploadParams: {
                ...state.uploadParams,
                sourceStorage: new Storage({
                    location: state.defaultStorageLocation === StorageLocation.LOCAL ?
                        StorageLocation.LOCAL : StorageLocation.CLOUD_STORAGE,
                    cloudStorageId: action.payload.defaultStorageCloudId,
                }),
            },
        };
    }

    if (action.type === ReducerActionType.SET_HELP_MESSAGE) {
        return {
            ...state,
            helpMessage: action.payload.helpMessage,
        };
    }

    if (action.type === ReducerActionType.SET_SELECTED_SOURCE_STORAGE_LOCATION) {
        return {
            ...state,
            selectedSourceStorageLocation: action.payload.selectedSourceStorageLocation,
        };
    }

    if (action.type === ReducerActionType.SET_FILE_NAME) {
        return {
            ...state,
            uploadParams: {
                ...state.uploadParams,
                fileName: action.payload.fileName,
            },
        };
    }

    if (action.type === ReducerActionType.SET_SELECTED_FORMAT) {
        return {
            ...state,
            uploadParams: {
                ...state.uploadParams,
                selectedFormat: action.payload.selectedFormat,
            },
        };
    }

    if (action.type === ReducerActionType.SET_CONV_MASK_TO_POLY) {
        return {
            ...state,
            uploadParams: {
                ...state.uploadParams,
                convMaskToPoly: action.payload.convMaskToPoly,
            },
        };
    }

    if (action.type === ReducerActionType.SET_SOURCE_STORAGE) {
        return {
            ...state,
            uploadParams: {
                ...state.uploadParams,
                sourceStorage: action.payload.sourceStorage,
            },
        };
    }

    if (action.type === ReducerActionType.SET_RESOURCE) {
        return {
            ...state,
            resource: action.payload.resource,
            uploadParams: {
                ...state.uploadParams,
                resource: action.payload.resource === 'dataset' ? 'dataset' : 'annotation',
            },
        };
    }

    return state;
};

function ImportDatasetModal(props: StateToProps): JSX.Element {
    const {
        importers,
        instanceT,
        instance,
        current,
    } = props;
    const [form] = Form.useForm();
    const appDispatch = useDispatch();

    const [state, dispatch] = useReducer(reducer, {
        instanceType: '',
        file: null,
        selectedLoader: null,
        useDefaultSettings: true,
        defaultStorageLocation: StorageLocation.LOCAL,
        defaultStorageCloudId: undefined,
        helpMessage: '',
        selectedSourceStorageLocation: StorageLocation.LOCAL,
        uploadParams: {
            resource: null,
            convMaskToPoly: true,
            useDefaultSettings: true,
            sourceStorage: new Storage({
                location: StorageLocation.LOCAL,
                cloudStorageId: undefined,
            }),
            selectedFormat: null,
            file: null,
            fileName: null,
        },
        resource: '',
    });

    const {
        instanceType,
        file,
        selectedLoader,
        useDefaultSettings,
        defaultStorageLocation,
        defaultStorageCloudId,
        helpMessage,
        selectedSourceStorageLocation,
        uploadParams,
        resource,
    } = state;

    useEffect(() => {
        if (instanceT === 'project') {
            dispatch(reducerActions.setResource('dataset'));
        } else if (instanceT === 'task' || instanceT === 'job') {
            dispatch(reducerActions.setResource('annotation'));
        }
    }, [instanceT]);

    const isDataset = useCallback((): boolean => resource === 'dataset', [resource]);
    const isAnnotation = useCallback((): boolean => resource === 'annotation', [resource]);

    const isProject = useCallback((): boolean => instance instanceof core.classes.Project, [instance]);
    const isTask = useCallback((): boolean => instance instanceof core.classes.Task, [instance]);

    useEffect(() => {
        if (instance) {
            dispatch(reducerActions.setDefaultStorageLocation(instance.sourceStorage.location));
            dispatch(reducerActions.setDefaultStorageCloudId(instance.sourceStorage.cloudStorageId));
            let type: 'project' | 'task' | 'job' = 'job';

            if (isProject()) {
                type = 'project';
            } else if (isTask()) {
                type = 'task';
            }
            dispatch(reducerActions.setInstanceType(`${type} #${instance.id}`));
        }
    }, [instance, resource]);

    useEffect(() => {
        dispatch(reducerActions.setHelpMessage(
            `Import from ${(defaultStorageLocation) ? defaultStorageLocation.split('_')[0] : 'local'} ` +
            `storage ${(defaultStorageCloudId) ? `№${defaultStorageCloudId}` : ''}`,
        ));
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
                        message.warning('Please select a format first', 3);
                    } else if (isDataset() && !['application/zip', 'application/x-zip-compressed'].includes(_file.type)) {
                        message.error('Only ZIP archive is supported for import a dataset');
                    } else if (isAnnotation() &&
                                !selectedLoader.format.toLowerCase().split(', ').includes(_file.name.split('.')[_file.name.split('.').length - 1])) {
                        message.error(
                            `For ${selectedLoader.name} format only files with ` +
                                `${selectedLoader.format.toLowerCase()} extension can be used`,
                        );
                    } else {
                        dispatch(reducerActions.setFile(_file));
                    }
                    return false;
                }}
                onRemove={() => {
                    dispatch(reducerActions.setFile(null));
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
            message.warning('Please select a format first', 3);
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
                    dispatch(reducerActions.setFileName(e.target.value || ''));
                }}
            />
        </Form.Item>
    );

    const closeModal = useCallback((): void => {
        dispatch(reducerActions.setUseDefaultSettings(true));
        dispatch(reducerActions.setSelectedSourceStorageLocation(StorageLocation.LOCAL));
        form.resetFields();
        dispatch(reducerActions.setFile(null));
        dispatch(reducerActions.setFileName(''));
        appDispatch(importActions.closeImportDatasetModal(instance));
    }, [form, instance]);

    const onUpload = (): void => {
        if (uploadParams && uploadParams.resource) {
            appDispatch(
                importDatasetAsync(
                    instance,
                    uploadParams.selectedFormat as string,
                    uploadParams.useDefaultSettings,
                    uploadParams.sourceStorage,
                    uploadParams.file || uploadParams.fileName as string,
                    uploadParams.convMaskToPoly,
                ));
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
                open={!!instance}
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
                                dispatch(reducerActions.setSelectedLoader(loader));
                                dispatch(reducerActions.setSelectedFormat(format));
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
                                    dispatch(reducerActions.setConvMaskToPoly(value));
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
                                    dispatch(reducerActions.setUseDefaultSettings(value));
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
                                dispatch(reducerActions.setSourceStorage(new Storage({
                                    location: value?.location || defaultStorageLocation,
                                    cloudStorageId: (value.location) ? value.cloudStorageId : defaultStorageCloudId,
                                })));
                            }}
                            locationValue={selectedSourceStorageLocation}
                            onChangeLocationValue={(value: StorageLocation) => {
                                dispatch(reducerActions.setSelectedSourceStorageLocation(value));
                            }}
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
