// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import Modal from 'antd/lib/modal';
import Notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';
import Input from 'antd/lib/input';
import Form from 'antd/lib/form';
import Tooltip from 'antd/lib/tooltip';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { CombinedState } from 'reducers';
import { exportActions, exportBackupAsync } from 'actions/export-actions';
import { makeBulkOperationAsync } from 'actions/selection-actions';
import {
    getCore, Job, ProjectOrTaskOrJob, Storage, StorageData, StorageLocation,
} from 'cvat-core-wrapper';

import CVATMarkdown from 'components/common/cvat-markdown';
import TargetStorageField from 'components/storage/target-storage-field';

function NameTemplateTooltip(props: Readonly<{ nameTemplate: string; example: string }>): JSX.Element {
    const { example } = props;
    return (
        <>
            You can use in the template:
            <ul style={{ marginBottom: 0 }}>
                <li>
                    <code>{'{{id}}'}</code>
                    <br />
                    - task/project id
                </li>
                <li>
                    <code>{'{{name}}'}</code>
                    <br />
                    - task/project name
                </li>
                <li>
                    <code>{'{{index}}'}</code>
                    <br />
                    - index in selection (starts from 1)
                </li>
            </ul>
            <div>
                Example:
                <br />
                <i>{example || 'backup_task_1.zip'}</i>
            </div>
        </>
    );
}

const core = getCore();

type FormValues = {
    customName: string | undefined;
    targetStorage: StorageData;
    useProjectTargetStorage: boolean;
};

const initialValues: FormValues = {
    customName: undefined,
    targetStorage: {
        location: StorageLocation.LOCAL,
        cloudStorageId: undefined,
    },
    useProjectTargetStorage: true,
};

function ExportBackupModal(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const [form] = Form.useForm();
    const [instanceType, setInstanceType] = useState('');
    const [useDefaultStorage, setUseDefaultStorage] = useState(true);
    const [storageLocation, setStorageLocation] = useState(StorageLocation.LOCAL);
    const [defaultStorageLocation, setDefaultStorageLocation] = useState(StorageLocation.LOCAL);
    const [defaultStorageCloudId, setDefaultStorageCloudId] = useState<number | undefined>(undefined);
    const [helpMessage, setHelpMessage] = useState('');
    const [nameTemplate, setNameTemplate] = useState('backup_task_{{id}}');

    const selectedIds = useSelector((state: CombinedState) => state.selection.selected);
    const allTasks = useSelector((state: CombinedState) => state.tasks.current);

    const instanceT = useSelector((state: CombinedState) => state.export.instanceType);
    const instance = useSelector((state: CombinedState) => {
        if (!instanceT) {
            return null;
        }
        return state.export[`${instanceT}s` as 'projects' | 'tasks']?.backup?.modalInstance ?? null;
    });

    const isBulkMode = selectedIds.length > 1;
    let selectedInstances: Exclude<ProjectOrTaskOrJob, Job>[] = [];
    if (isBulkMode) {
        selectedInstances = allTasks.filter((t) => selectedIds.includes(t.id));
    } else if (instance) {
        selectedInstances = [instance];
    }

    useEffect(() => {
        if (instance && instance instanceof core.classes.Project) {
            setInstanceType('project');
        } else if (instance && instance instanceof core.classes.Task) {
            setInstanceType('task');
        }
    }, [instance]);

    useEffect(() => {
        if (instance) {
            setDefaultStorageLocation(instance.targetStorage.location);
            setDefaultStorageCloudId(instance.targetStorage.cloudStorageId ?? undefined);
        }
    }, [instance]);

    useEffect(() => {
        const loc = defaultStorageLocation ? defaultStorageLocation.split('_')[0] : 'local';
        const cloudId = defaultStorageCloudId !== undefined && defaultStorageCloudId !== null ? `№${defaultStorageCloudId}` : '';
        setHelpMessage(`Export backup to ${loc} storage ${cloudId}`);
    }, [defaultStorageLocation, defaultStorageCloudId]);

    const closeModal = (): void => {
        setUseDefaultStorage(true);
        setStorageLocation(StorageLocation.LOCAL);
        form.resetFields();
        if (instance) {
            dispatch(exportActions.closeExportBackupModal(instance));
        }
    };

    const handleExport = useCallback(
        (values: FormValues): void => {
            if (isBulkMode) {
                dispatch(makeBulkOperationAsync<Exclude<ProjectOrTaskOrJob, Job>>(
                    selectedInstances,
                    async (inst: Exclude<ProjectOrTaskOrJob, Job>, idx: number) => {
                        let backupName = nameTemplate
                            .replaceAll('{{id}}', String(inst.id))
                            .replaceAll('{{name}}', inst.name ?? '')
                            .replaceAll('{{index}}', String(idx + 1));
                        if (!backupName.endsWith('.zip')) backupName += '.zip';
                        await dispatch(
                            exportBackupAsync(
                                inst,
                                new Storage({
                                    location: values.targetStorage?.location,
                                    cloudStorageId: values.targetStorage?.cloudStorageId,
                                }),
                                false,
                                backupName,
                            ),
                        );
                    },
                    (inst: Exclude<ProjectOrTaskOrJob, Job>, idx: number, total: number) => (
                        `Exporting backup for ${instanceType}#${inst.id} [${idx + 1}/${total}]`
                    ),
                ));
                closeModal();
                const description =
                    'Bulk backup export was started. You can check progress [here](/requests).';
                Notification.info({
                    message: 'Bulk backup export started',
                    description: (
                        <CVATMarkdown history={history}>{description}</CVATMarkdown>
                    ),
                    className: 'cvat-notification-notice-export-backup-start',
                });
            } else if (instance) {
                const customName = values.customName ? `${values.customName}.zip` : '';
                let cloudStorageId: number | undefined;
                if (useDefaultStorage) {
                    cloudStorageId = defaultStorageCloudId ?? undefined;
                } else {
                    cloudStorageId = values.targetStorage?.cloudStorageId;
                }
                dispatch(
                    exportBackupAsync(
                        instance,
                        new Storage({
                            location: useDefaultStorage ? defaultStorageLocation : values.targetStorage?.location,
                            cloudStorageId,
                        }),
                        useDefaultStorage,
                        customName,
                    ),
                );
                closeModal();

                const description = isBulkMode ?
                    'Bulk backup export was started. You can check progress [here](/requests).' :
                    'Backup export was started. You can check progress [here](/requests).';
                Notification.info({
                    message: isBulkMode ? 'Bulk backup export started' : 'Backup export started',
                    description: (
                        <CVATMarkdown history={history}>{description}</CVATMarkdown>
                    ),
                    className: 'cvat-notification-notice-export-backup-start',
                });
            }
        },
        [
            instance,
            isBulkMode,
            selectedInstances,
            nameTemplate,
            useDefaultStorage,
            defaultStorageLocation,
            defaultStorageCloudId,
            dispatch,
            history,
        ],
    );

    const exampleName = (isBulkMode && selectedInstances.length > 0 && selectedInstances[0]) ?
        nameTemplate
            .replaceAll('{{id}}', String(selectedInstances[0].id))
            .replaceAll('{{name}}', selectedInstances[0].name ?? '')
            .replaceAll('{{index}}', '1') :
        'backup_task_1.zip';

    return (
        <Modal
            title={
                isBulkMode ? (
                    <Text strong>
                        {`Export ${selectedInstances.length} ${instanceType}s`}
                    </Text>
                ) : (
                    <Text strong>{`Export ${instanceType} #${instance?.id}`}</Text>
                )
            }
            open={!!instance}
            onCancel={closeModal}
            onOk={() => form.submit()}
            className={`cvat-modal-export-${instanceType.split(' ')[0]}`}
            destroyOnClose
        >
            <Form
                form={form}
                layout='vertical'
                initialValues={initialValues}
                onFinish={handleExport}
            >
                {isBulkMode ? (
                    <Form.Item label={<Text strong>Name template</Text>} required>
                        <Input
                            value={nameTemplate}
                            onChange={(e) => setNameTemplate(e.target.value)}
                            placeholder='backup_{{id}}'
                            suffix='.zip'
                            className='cvat-modal-export-filename-input'
                        />
                        <Text type='secondary'>
                            <Tooltip
                                title={(
                                    <NameTemplateTooltip
                                        nameTemplate={nameTemplate}
                                        example={exampleName}
                                    />
                                )}
                            >
                                When forming the backup name, a template is used.
                                <QuestionCircleOutlined />
                            </Tooltip>
                        </Text>
                    </Form.Item>
                ) : (
                    <Form.Item label={<Text strong>Custom name</Text>} name='customName'>
                        <Input
                            placeholder='Custom name for a backup file'
                            suffix='.zip'
                            className='cvat-modal-export-filename-input'
                        />
                    </Form.Item>
                )}
                <TargetStorageField
                    instanceId={instance ? instance.id : null}
                    switchDescription='Use default settings'
                    switchHelpMessage={helpMessage}
                    useDefaultStorage={isBulkMode ? false : useDefaultStorage}
                    storageDescription={`Specify target storage for export ${instanceType}`}
                    locationValue={storageLocation}
                    onChangeUseDefaultStorage={isBulkMode ? undefined : (value: boolean) => setUseDefaultStorage(value)}
                    onChangeLocationValue={(value: StorageLocation) => setStorageLocation(value)}
                    disableSwitch={isBulkMode}
                />
            </Form>
        </Modal>
    );
}

export default React.memo(ExportBackupModal);
