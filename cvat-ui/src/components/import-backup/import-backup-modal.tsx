// Copyright (C) CVAT.ai Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Form, { RuleObject } from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import Notification from 'antd/lib/notification';
import message from 'antd/lib/message';
import Upload, { RcFile } from 'antd/lib/upload';
import { InboxOutlined } from '@ant-design/icons';
import { CombinedState, StorageLocation } from 'reducers';
import { importActions, importBackupAsync } from 'actions/import-actions';
import SourceStorageField from 'components/storage/source-storage-field';
import Input from 'antd/lib/input/Input';

import { Storage, StorageData } from 'cvat-core-wrapper';

type FormValues = {
    fileName?: string | undefined;
    sourceStorage: StorageData;
};

const initialValues: FormValues = {
    fileName: undefined,
    sourceStorage: {
        location: StorageLocation.LOCAL,
        cloudStorageId: undefined,
    },
};

function ImportBackupModal(): JSX.Element {
    const [form] = Form.useForm();
    const [file, setFile] = useState<File | null>(null);
    const instanceType = useSelector((state: CombinedState) => state.import.instanceType);
    const modalVisible = useSelector((state: CombinedState) => {
        if (instanceType && ['project', 'task'].includes(instanceType)) {
            return state.import[`${instanceType}s` as 'projects' | 'tasks'].backup.modalVisible;
        }
        return false;
    });
    const dispatch = useDispatch();
    const [selectedSourceStorage, setSelectedSourceStorage] = useState<StorageData>({
        location: StorageLocation.LOCAL,
    });

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
                beforeUpload={(_file: RcFile): boolean => {
                    if (!['application/zip', 'application/x-zip-compressed'].includes(_file.type)) {
                        message.error('Only ZIP archive is supported');
                    } else {
                        setFile(_file);
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
        if (value) {
            const extension = value.toLowerCase().split('.')[1];
            if (extension !== 'zip') {
                return Promise.reject(new Error('Only ZIP archive is supported'));
            }
        }

        return Promise.resolve();
    };

    const renderCustomName = (): JSX.Element => (
        <Form.Item
            label={<Text strong>File name</Text>}
            name='fileName'
            rules={[{ validator: validateFileName }, { required: true, message: 'Please, specify a name' }]}
        >
            <Input
                placeholder='Backup file name'
                className='cvat-modal-import-filename-input'
            />
        </Form.Item>
    );

    const closeModal = useCallback((): void => {
        setSelectedSourceStorage({
            location: StorageLocation.LOCAL,
        });
        setFile(null);
        dispatch(importActions.closeImportBackupModal(instanceType as 'project' | 'task'));
        form.resetFields();
    }, [form, instanceType]);

    const handleImport = useCallback(
        (values: FormValues): void => {
            if (file === null && !values.fileName) {
                Notification.error({
                    message: 'No backup file specified',
                });
                return;
            }
            const sourceStorage = new Storage({
                location: values.sourceStorage.location,
                cloudStorageId: values.sourceStorage?.cloudStorageId,
            });

            dispatch(importBackupAsync(instanceType, sourceStorage, file || (values.fileName) as string));

            Notification.info({
                message: `The ${instanceType} creating from the backup has been started`,
                className: 'cvat-notification-notice-import-backup-start',
            });
            closeModal();
        },
        [instanceType, file],
    );

    return (
        <Modal
            title={(
                <Text strong>
                    {`Create ${instanceType} from backup`}
                </Text>
            )}
            open={modalVisible}
            onCancel={closeModal}
            onOk={() => form.submit()}
            className='cvat-modal-import-backup'
        >
            <Form
                name={`Create ${instanceType} from backup file`}
                form={form}
                onFinish={handleImport}
                layout='vertical'
                initialValues={initialValues}
            >
                <SourceStorageField
                    instanceId={null}
                    storageDescription='Specify source storage with backup'
                    locationValue={selectedSourceStorage.location}
                    onChangeStorage={(value: StorageData) => setSelectedSourceStorage(new Storage(value))}
                    onChangeLocationValue={(value: StorageLocation) => {
                        setSelectedSourceStorage({
                            location: value,
                        });
                    }}

                />
                {selectedSourceStorage?.location === StorageLocation.CLOUD_STORAGE && renderCustomName()}
                {selectedSourceStorage?.location === StorageLocation.LOCAL && uploadLocalFile()}
            </Form>
        </Modal>
    );
}

export default React.memo(ImportBackupModal);
