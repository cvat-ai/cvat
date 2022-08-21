// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Form, { RuleObject } from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import Notification from 'antd/lib/notification';
import message from 'antd/lib/message';
import Upload, { RcFile } from 'antd/lib/upload';
import { InboxOutlined } from '@ant-design/icons';
import { CombinedState, Storage, StorageLocation } from 'reducers';
import { importBackupActions, importBackupAsync } from 'actions/import-backup-actions';
import SourceStorageField from 'components/storage/source-storage-field';
import Input from 'antd/lib/input/Input';

type FormValues = {
    fileName?: string | undefined;
    sourceStorage: any;
};

const initialValues: FormValues = {
    fileName: undefined,
    sourceStorage: {
        location: StorageLocation.LOCAL,
        cloud_storage_id: undefined,
    }
}

function ImportBackupModal(): JSX.Element {
    const [form] = Form.useForm();
    const [file, setFile] = useState<File | null>(null);
    const instanceType = useSelector((state: CombinedState) => state.importBackup?.instanceType);
    const modalVisible = useSelector((state: CombinedState) => state.importBackup.modalVisible);
    const dispatch = useDispatch();
    const [selectedSourceStorage, setSelectedSourceStorage] = useState<Storage | null>(null);

    const uploadLocalFile = (): JSX.Element => {
        return (
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
        );
    };

    const validateFileName = (_: RuleObject, value: string): Promise<void> => {
        if (value) {
            const extension = value.toLowerCase().split('.')[1];
            if (extension !== 'zip') {
                return Promise.reject(new Error('Only ZIP archive is supported'));
            }
        }

        return Promise.resolve();
    }

    const renderCustomName = (): JSX.Element => {
        return (
            <Form.Item
                label={<Text strong>File name</Text>}
                name='fileName'
                rules={[{ validator: validateFileName }]}
            >
                <Input
                    placeholder='Backup file name'
                    className='cvat-modal-import-filename-input'
                />
            </Form.Item>
        );
    }

    const closeModal = useCallback((): void => {
        form.resetFields();
        setFile(null);
        dispatch(importBackupActions.closeImportModal());
    }, [form, instanceType]);

    const handleImport = useCallback(
        (values: FormValues): void => {
            if (file === null && !values.fileName) {
                Notification.error({
                    message: 'No backup file specified',
                });
                return;
            }
            const sourceStorage = {
                location: values.sourceStorage.location,
                cloudStorageId: values.sourceStorage.cloud_storage_id,
            } as Storage;

            dispatch(importBackupAsync(instanceType, sourceStorage, file || (values.fileName) as string));

            Notification.info({
                message: `The ${instanceType} creating from the backup has been started`,
                className: `cvat-notification-notice-import-backup-start`,
            });
            closeModal();
        },
        // another dependensis like instance type
        [instanceType, file],
    );


    return (
        <>
            <Modal
                title={<Text strong>Create {instanceType} from backup</Text>}
                visible={modalVisible}
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
                        projectId={null}
                        storageDescription='Specify source storage with backup'
                        onChangeStorage={(value: Storage) => setSelectedSourceStorage(value)}
                    />
                    {selectedSourceStorage?.location === StorageLocation.CLOUD_STORAGE && renderCustomName()}
                    {selectedSourceStorage?.location === StorageLocation.LOCAL && uploadLocalFile()}
                </Form>
            </Modal>
        </>
    );
}

export default React.memo(ImportBackupModal);
