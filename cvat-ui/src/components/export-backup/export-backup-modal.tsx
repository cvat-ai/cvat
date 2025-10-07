// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { useHistory } from 'react-router';
import Modal from 'antd/lib/modal';
import Notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';
import Input from 'antd/lib/input';
import Form from 'antd/lib/form';
import Space from 'antd/lib/space';
import Switch from 'antd/lib/switch';
import Tooltip from 'antd/lib/tooltip';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { CombinedState } from 'reducers';
import { exportActions, exportBackupAsync } from 'actions/export-actions';
import { makeBulkOperationAsync } from 'actions/bulk-actions';
import {
    getCore, Job, ProjectOrTaskOrJob, Storage, StorageData, StorageLocation,
    Project, Task,
} from 'cvat-core-wrapper';

import CVATMarkdown from 'components/common/cvat-markdown';
import TargetStorageField from 'components/storage/target-storage-field';
import NameTemplateTooltip from 'components/common/cvat-name-template-tooltip';

const core = getCore();

type FormValues = {
    customName: string | undefined;
    targetStorage: StorageData;
    useProjectTargetStorage: boolean;
    lightweight: boolean;
};

const initialValues: FormValues = {
    customName: undefined,
    targetStorage: {
        location: StorageLocation.LOCAL,
        cloudStorageId: undefined,
    },
    useProjectTargetStorage: true,
    lightweight: true,
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
    const [lightweight, setLightweight] = useState(true);
    const [nameTemplate, setNameTemplate] = useState('backup_task_{{id}}');

    const {
        selectedIds,
        allTasks,
        allProjects,
        instance,
    } = useSelector((state: CombinedState) => {
        const instanceT = state.export.instanceType;
        const result = {
            allTasks: state.tasks.current,
            allProjects: state.projects.current,
            selectedIds: null as null | number[],
            instance: null as (Project | Task | null),
        };

        if (instanceT === 'project') {
            result.selectedIds = state.projects.selected;
            result.instance = state.export.projects?.backup?.modalInstance ?? null;
        }

        if (instanceT === 'task') {
            result.selectedIds = state.tasks.selected;
            result.instance = state.export.tasks?.backup?.modalInstance ?? null;
        }

        return result;
    }, shallowEqual);

    const isBulkMode = selectedIds && selectedIds.length > 1;
    const [selectedInstances, setSelectedInstances] = useState<Exclude<ProjectOrTaskOrJob, Job>[]>([]);
    useEffect(() => {
        if (isBulkMode) {
            let filtered: Exclude<ProjectOrTaskOrJob, Job>[] = [];
            if (instanceType === 'task') {
                filtered = allTasks.filter((t) => selectedIds.includes(t.id));
            } else if (instanceType === 'project') {
                filtered = allProjects.filter((p) => selectedIds.includes(p.id));
            }
            setSelectedInstances(filtered);
        } else if (instance) {
            setSelectedInstances([instance]);
        } else {
            setSelectedInstances([]);
        }
    }, [isBulkMode, instanceType, allTasks, allProjects, instance]);

    useEffect(() => {
        let newInstanceType = '';
        if (instance && instance instanceof core.classes.Project) {
            newInstanceType = 'project';
        } else if (instance && instance instanceof core.classes.Task) {
            newInstanceType = 'task';
        }
        setNameTemplate(`backup_${newInstanceType}_{{id}}`);
        setInstanceType(newInstanceType);
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
        setLightweight(true);
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
                        dispatch(
                            exportBackupAsync(
                                inst,
                                new Storage({
                                    location: values.targetStorage?.location,
                                    cloudStorageId: values.targetStorage?.cloudStorageId,
                                }),
                                false,
                                backupName,
                                lightweight,
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
                        lightweight,
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
            lightweight,
        ],
    );

    const exampleName = (isBulkMode && selectedInstances.length > 0 && selectedInstances[0]) ?
        nameTemplate
            .replaceAll('{{id}}', String(selectedInstances[0].id))
            .replaceAll('{{name}}', selectedInstances[0].name ?? '')
            .replaceAll('{{index}}', '1') :
        `backup_${instanceType}_1.zip`;

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
                                        example={exampleName}
                                    />
                                )}
                            >
                                When forming the backup name, a template is used.
                                {' '}
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
                <Form.Item
                    className='cvat-settings-switch-lightweight'
                >
                    <Space>
                        <Switch
                            checked={lightweight}
                            onChange={setLightweight}
                        />
                        <Text strong>Use lightweight backup whenever possible</Text>
                        <Tooltip title='If a task uses media from a cloud storage, its possible to make a backup without including media. The task restored from a lightweight backup has to be manually connected to the cloud storage.'>
                            <QuestionCircleOutlined />
                        </Tooltip>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );
}

export default React.memo(ExportBackupModal);
