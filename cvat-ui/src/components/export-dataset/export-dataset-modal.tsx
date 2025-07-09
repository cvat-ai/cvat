// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect, useCallback } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Modal from 'antd/lib/modal';
import Notification from 'antd/lib/notification';
import { DownloadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import Form from 'antd/lib/form';
import Switch from 'antd/lib/switch';
import Space from 'antd/lib/space';
import TargetStorageField from 'components/storage/target-storage-field';
import CVATMarkdown from 'components/common/cvat-markdown';
import { CombinedState } from 'reducers';
import { exportActions, exportDatasetAsync } from 'actions/export-actions';
import {
    Dumper, ProjectOrTaskOrJob, Job, Project, Storage, StorageData, StorageLocation, Task,
} from 'cvat-core-wrapper';
import Tooltip from 'antd/lib/tooltip';
import { makeBulkOperationAsync } from 'actions/selection-actions';

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
                <i>{example}</i>
            </div>
        </>
    );
}

function ExportDatasetModal(props: Readonly<StateToProps>): JSX.Element {
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

    const selectedIds = useSelector((state: CombinedState) => state.selection.selected);
    const allTasks = useSelector((state: CombinedState) => state.tasks.current);
    const allProjects = useSelector((state: CombinedState) => state.projects.current);
    const isBulkMode = selectedIds.length > 1;
    let selectedInstances: (Task | Project)[] = [];
    if (isBulkMode) {
        const selectedTasks = allTasks.filter((t) => selectedIds.includes(t.id));
        const selectedProjects = allProjects.filter((p) => selectedIds.includes(p.id));
        selectedInstances = [...selectedTasks, ...selectedProjects];
    } else if (instance && (instance instanceof Task || instance instanceof Project)) {
        selectedInstances = [instance];
    }
    const [nameTemplate, setNameTemplate] = useState('dataset_task_{{id}}');

    useEffect(() => {
        let newIntanceType = '';
        if (instance instanceof Project) {
            newIntanceType = 'project';
        } else if (instance instanceof Task || instance instanceof Job) {
            if (instance instanceof Task) {
                newIntanceType = 'task';
            } else {
                newIntanceType = 'job';
            }
            if (instance.mode === 'interpolation' && instance.dimension === '2d') {
                form.setFieldsValue({ selectedFormat: 'CVAT for video 1.1' });
            } else if (instance.mode === 'annotation' && instance.dimension === '2d') {
                form.setFieldsValue({ selectedFormat: 'CVAT for images 1.1' });
            }
        }
        setNameTemplate(`dataset_${newIntanceType}_{{id}}`);
        setInstanceType(newIntanceType);
    }, [instance]);

    useEffect(() => {
        if (instance) {
            setDefaultStorageLocation(instance.targetStorage.location);
            setDefaultStorageCloudId(instance.targetStorage.cloudStorageId);
        }
    }, [instance]);

    useEffect(() => {
        const loc = defaultStorageLocation ? defaultStorageLocation.split('_')[0] : 'local';
        const cloudId = defaultStorageCloudId !== undefined && defaultStorageCloudId !== null ? `№${defaultStorageCloudId}` : '';
        setHelpMessage(`Export to ${loc} storage ${cloudId}`);
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
            if (isBulkMode) {
                dispatch(makeBulkOperationAsync<Task | Project>(
                    selectedInstances,
                    async (inst: Task | Project, idx: number) => {
                        let exportName = nameTemplate
                            .replaceAll('{{id}}', String(inst.id))
                            .replaceAll('{{name}}', inst.name ?? '')
                            .replaceAll('{{index}}', String(idx + 1));
                        if (!exportName.endsWith('.zip')) exportName += '.zip';
                        await dispatch(
                            exportDatasetAsync(
                                inst,
                                values.selectedFormat as string,
                                values.saveImages,
                                false, // always custom storage in bulk
                                new Storage({
                                    location: values.targetStorage?.location,
                                    cloudStorageId: values.targetStorage?.cloudStorageId,
                                }),
                                exportName,
                            ),
                        );
                    },
                    (inst: Task | Project, idx: number, total: number) => (
                        `Exporting dataset for ${instanceType}#${inst.id} [${idx + 1}/${total}]`
                    ),
                ));
                closeModal();
                const resource = values.saveImages ? 'Dataset' : 'Annotations';
                const description =
                    `Bulk ${resource.toLowerCase()} export was started. ` +
                    'You can check progress and download the file [here](/requests).';
                Notification.info({
                    message: `Bulk ${resource.toLowerCase()} export started`,
                    description: (
                        <CVATMarkdown history={history}>{description}</CVATMarkdown>
                    ),
                    className: `cvat-notification-notice-export-${instanceType.split(' ')[0]}-start`,
                });
                return;
            }
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
        [
            instance,
            instanceType,
            useDefaultTargetStorage,
            defaultStorageLocation,
            defaultStorageCloudId,
            targetStorage,
            isBulkMode,
            selectedInstances,
            nameTemplate,
            dispatch,
            history,
        ],
    );

    const exampleName = (isBulkMode && selectedInstances.length > 0 && selectedInstances[0]) ?
        nameTemplate
            .replaceAll('{{id}}', String(selectedInstances[0].id))
            .replaceAll('{{name}}', selectedInstances[0].name ?? '')
            .replaceAll('{{index}}', '1') :
        `dataset_${instanceType}_1.zip`;

    const sortedDumpers = dumpers.slice();
    sortedDumpers.sort((a: Dumper, b: Dumper) => a.name.localeCompare(b.name));

    return (
        <Modal
            title={
                isBulkMode ? (
                    <Text strong>
                        {`Export ${selectedInstances.length} ${instanceType}s as datasets`}
                    </Text>
                ) : (
                    <Text strong>{`Export ${instanceType} as a dataset`}</Text>
                )
            }
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
                        {sortedDumpers
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
                {isBulkMode ? (
                    <Form.Item label={<Text strong>Name template</Text>} required>
                        <Input
                            value={nameTemplate}
                            onChange={(e) => setNameTemplate(e.target.value)}
                            placeholder='dataset_{{id}}'
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
                                When forming the dataset name, a template is used.
                                <QuestionCircleOutlined />
                            </Tooltip>
                        </Text>
                    </Form.Item>
                ) : (
                    <Form.Item label={<Text strong>Custom name</Text>} name='customName'>
                        <Input
                            placeholder='Custom name for a dataset'
                            suffix='.zip'
                            className='cvat-modal-export-filename-input'
                        />
                    </Form.Item>
                )}
                <TargetStorageField
                    instanceId={instance ? instance.id : null}
                    switchDescription='Use default settings'
                    switchHelpMessage={helpMessage}
                    useDefaultStorage={isBulkMode ? false : useDefaultTargetStorage}
                    storageDescription='Specify target storage for export dataset'
                    locationValue={targetStorage.location}
                    onChangeUseDefaultStorage={isBulkMode ? undefined : (value: boolean) => {
                        setUseDefaultTargetStorage(value);
                    }}
                    onChangeStorage={(value: StorageData) => setTargetStorage(value)}
                    onChangeLocationValue={(value: StorageLocation) => { setTargetStorage({ location: value }); }}
                    disableSwitch={isBulkMode}
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
        state.export[`${instanceType}s`]
    ).dataset.modalInstance;

    return {
        instance,
        dumpers: state.formats.annotationFormats.dumpers,
    };
}

export default connect(mapStateToProps)(ExportDatasetModal);
