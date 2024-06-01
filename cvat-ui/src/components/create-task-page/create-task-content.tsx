// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Collapse from 'antd/lib/collapse';
import notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';
import Alert from 'antd/lib/alert';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ValidateErrorEntity } from 'rc-field-form/lib/interface';
import { StorageLocation } from 'reducers';
import { getCore, Storage } from 'cvat-core-wrapper';
import LabelsEditor from 'components/labels-editor/labels-editor';
import FileManagerComponent, { Files } from 'components/file-manager/file-manager';
import { RemoteFile } from 'components/file-manager/remote-browser';
import { getFileContentType, getContentTypeRemoteFile, getFileNameFromPath } from 'utils/files';

import BasicConfigurationForm, { BaseConfiguration } from './basic-configuration-form';
import ProjectSearchField from './project-search-field';
import ProjectSubsetField from './project-subset-field';
import MultiTasksProgress from './multi-task-progress';
import AdvancedConfigurationForm, { AdvancedConfiguration, SortingMethod } from './advanced-configuration-form';

type TabName = 'local' | 'share' | 'remote' | 'cloudStorage';
const core = getCore();

export interface CreateTaskData {
    projectId: number | null;
    basic: BaseConfiguration;
    subset: string;
    advanced: AdvancedConfiguration;
    labels: any[];
    files: Files;
    activeFileManagerTab: TabName;
    cloudStorageId: number | null;
}

enum SupportedShareTypes {
    IMAGE = 'image',
    DIR = 'DIR',
    VIDEO = 'video',
}

interface Props {
    onCreate: (data: CreateTaskData, onProgress?: (status: string, progress?: number) => void) => Promise<any>;
    projectId: number | null;
    many: boolean;
}

type State = CreateTaskData & {
    multiTasks: (CreateTaskData & {
        status: 'pending' | 'progress' | 'failed' | 'completed' | 'cancelled';
    })[];
    uploadFileErrorMessage: string;
    loading: boolean;
    statusInProgressTask: string;
};

const defaultState: State = {
    projectId: null,
    basic: {
        name: '',
    },
    subset: '',
    advanced: {
        useZipChunks: true,
        useCache: true,
        sortingMethod: SortingMethod.LEXICOGRAPHICAL,
        sourceStorage: {
            location: StorageLocation.LOCAL,
            cloudStorageId: undefined,
        },
        targetStorage: {
            location: StorageLocation.LOCAL,
            cloudStorageId: undefined,
        },
        useProjectSourceStorage: true,
        useProjectTargetStorage: true,
    },
    labels: [],
    files: {
        local: [],
        share: [],
        remote: [],
        cloudStorage: [],
    },
    activeFileManagerTab: 'local',
    cloudStorageId: null,
    multiTasks: [],
    uploadFileErrorMessage: '',
    loading: false,
    statusInProgressTask: '',
};

const UploadFileErrorMessages = {
    one: 'Wrong list of files. You can upload an archive with images, a video, a pdf file or multiple images. ',
    multi: 'Wrong list of files. You can upload one or more videos. ',
};

function receiveExtensions(files: RemoteFile[]): string[] {
    const fileTypes = files.filter((file: RemoteFile) => file.name.includes('.'))
        .map((file: RemoteFile) => `.${file.name.split('.').pop()}`);
    return fileTypes;
}

function checkFiles(files: RemoteFile[], type: SupportedShareTypes, baseError: string): string {
    const erroredFiles = files.filter(
        (it) => it.mimeType !== type,
    );
    if (erroredFiles.length !== 0) {
        const unsupportedTypes = receiveExtensions(erroredFiles);
        const extensionList = Array.from(new Set(unsupportedTypes));
        return extensionList.length ? `${baseError} Found unsupported types: ${extensionList.join(', ')}. ` : baseError;
    }
    return '';
}

function validateRemoteFiles(remoteFiles: RemoteFile[], many: boolean): string {
    let uploadFileErrorMessage = '';
    const regFiles = remoteFiles.filter((file) => file.type === 'REG');
    const excludedManifests = regFiles.filter((file) => !file.key.endsWith('.jsonl'));
    if (!many && excludedManifests.length > 1) {
        uploadFileErrorMessage = checkFiles(
            excludedManifests,
            SupportedShareTypes.IMAGE,
            UploadFileErrorMessages.one,
        );
    } else if (many) {
        uploadFileErrorMessage = checkFiles(
            regFiles,
            SupportedShareTypes.VIDEO,
            UploadFileErrorMessages.multi,
        );
    }
    return uploadFileErrorMessage;
}

function filterFiles(remoteFiles: RemoteFile[], many: boolean): RemoteFile[] {
    if (many) {
        return remoteFiles.filter((file: RemoteFile) => file.mimeType === 'video');
    }

    return remoteFiles;
}

class CreateTaskContent extends React.PureComponent<Props & RouteComponentProps, State> {
    private basicConfigurationComponent: RefObject<BasicConfigurationForm>;
    private advancedConfigurationComponent: RefObject<AdvancedConfigurationForm>;
    private fileManagerComponent: any;

    public constructor(props: Props & RouteComponentProps) {
        super(props);
        this.state = { ...defaultState };
        this.basicConfigurationComponent = React.createRef<BasicConfigurationForm>();
        this.advancedConfigurationComponent = React.createRef<AdvancedConfigurationForm>();
    }

    public componentDidMount(): void {
        const { projectId } = this.props;

        if (projectId) {
            this.handleProjectIdChange(projectId);
        }

        this.focusToForm();
    }

    private handleChangeStorageLocation(field: 'sourceStorage' | 'targetStorage', value: StorageLocation): void {
        this.setState((state) => ({
            advanced: {
                ...state.advanced,
                [field]: {
                    location: value,
                },
            },
        }));
    }

    private resetState = (): void => {
        this.basicConfigurationComponent.current?.resetFields();
        this.advancedConfigurationComponent.current?.resetFields();

        this.fileManagerComponent.reset();

        this.setState((state) => ({
            ...defaultState,
            projectId: state.projectId,
        }));
    };

    private validateLabelsOrProject = (): boolean => {
        const { projectId, labels } = this.state;
        return !!labels.length || !!projectId;
    };

    private validateFiles = (): boolean => {
        const { activeFileManagerTab, files } = this.state;

        if (activeFileManagerTab === 'cloudStorage') {
            this.setState({
                cloudStorageId: this.fileManagerComponent.getCloudStorageId(),
            });
        }
        const totalLen = Object.keys(files).reduce((acc, key: string) => acc + files[(key as TabName)].length, 0);

        return !!totalLen;
    };

    private startLoading = (): void => {
        this.setState({
            loading: true,
        });
    };

    private stopLoading = (): void => {
        this.setState({
            loading: false,
        });
    };

    private changeStatusInProgressTask = (status: string): void => {
        this.setState({
            statusInProgressTask: status,
        });
    };

    private handleProjectIdChange = (value: null | number): void => {
        const { projectId, subset } = this.state;

        this.setState((state) => ({
            projectId: value,
            subset: value && value === projectId ? subset : '',
            labels: value ? [] : state.labels,
        }));
    };

    private handleChangeBasicConfiguration = (values: BaseConfiguration): void => {
        this.setState({
            basic: { ...values },
        });
    };

    private handleSubmitAdvancedConfiguration = (values: AdvancedConfiguration): Promise<void> => (
        new Promise((resolve) => {
            this.setState({
                advanced: { ...values },
            }, resolve);
        })
    );

    private handleTaskSubsetChange = (value: string): void => {
        this.setState({
            subset: value,
        });
    };

    private changeFileManagerTab = (value: TabName): void => {
        this.setState({
            activeFileManagerTab: value,
        });
    };

    private handleUseProjectSourceStorageChange = (value: boolean): void => {
        this.setState((state) => ({
            advanced: {
                ...state.advanced,
                useProjectSourceStorage: value,
            },
        }));
    };

    private handleUseProjectTargetStorageChange = (value: boolean): void => {
        this.setState((state) => ({
            advanced: {
                ...state.advanced,
                useProjectTargetStorage: value,
            },
        }));
    };

    private focusToForm = (): void => {
        this.basicConfigurationComponent.current?.focus();
    };

    private handleUploadLocalFiles = (uploadedFiles: File[]): void => {
        const { many } = this.props;
        const { files } = this.state;

        let uploadFileErrorMessage = '';

        const excludedManifests = uploadedFiles.filter((x: File) => !x.name.endsWith('.jsonl'));
        if (!many && excludedManifests.length > 1) {
            uploadFileErrorMessage = excludedManifests.every((it) => (
                getFileContentType(it) === SupportedShareTypes.IMAGE
            )) ? '' : UploadFileErrorMessages.one;
        } else if (many) {
            uploadFileErrorMessage = excludedManifests.every(
                (it) => getFileContentType(it) === SupportedShareTypes.VIDEO,
            ) ? '' : UploadFileErrorMessages.multi;
        }

        this.setState({
            uploadFileErrorMessage,
        });

        if (!uploadFileErrorMessage) {
            this.setState({
                files: {
                    ...files,
                    local: uploadedFiles,
                },
            });
        }
    };

    private handleUploadRemoteFiles = (urls: string[]): void => {
        const { many } = this.props;

        const { files } = this.state;
        const { length } = urls;

        let uploadFileErrorMessage = '';

        try {
            if (!many && length > 1) {
                let index = 0;
                while (index < length) {
                    const isImageFile = getContentTypeRemoteFile(urls[index]) === 'image';
                    if (!isImageFile) {
                        uploadFileErrorMessage = UploadFileErrorMessages.one;
                        break;
                    }
                    index++;
                }
            } else if (many) {
                let index = 0;
                while (index < length) {
                    const isVideoFile = getContentTypeRemoteFile(urls[index]) === 'video';
                    if (!isVideoFile) {
                        uploadFileErrorMessage = UploadFileErrorMessages.multi;
                        break;
                    }
                    index++;
                }
            }
        } catch (err) {
            uploadFileErrorMessage = `We can't process it. ${err}`;
        }

        this.setState({
            uploadFileErrorMessage,
        });

        if (!uploadFileErrorMessage) {
            this.setState({
                files: {
                    ...files,
                    remote: urls,
                },
            });
        }
    };

    private handleUploadShareFiles = (shareFiles: RemoteFile[]): void => {
        const { files } = this.state;
        const { many } = this.props;
        const uploadFileErrorMessage = validateRemoteFiles(shareFiles, many);
        const filteredFiles = filterFiles(shareFiles, many);
        this.setState({ uploadFileErrorMessage });

        if (!uploadFileErrorMessage) {
            this.setState({
                files: {
                    ...files,
                    share: filteredFiles.map((it) => it.key),
                },
            });
        }
    };

    private handleUploadCloudStorageFiles = (cloudStorageFiles: RemoteFile[]): void => {
        const { files } = this.state;
        const { many } = this.props;
        const uploadFileErrorMessage = validateRemoteFiles(cloudStorageFiles, many);
        const filteredFiles = filterFiles(cloudStorageFiles, many);
        this.setState({ uploadFileErrorMessage });

        if (!uploadFileErrorMessage) {
            this.setState({
                files: {
                    ...files,
                    cloudStorage: filteredFiles.map((it) => it.key),
                },
            });
        }
    };

    private validateBlocks = (): Promise<any> => new Promise((resolve, reject) => {
        const { projectId } = this.state;
        if (!this.validateLabelsOrProject()) {
            notification.error({
                message: 'Could not create a task',
                description: 'A task must contain at least one label or belong to some project',
                className: 'cvat-notification-create-task-fail',
            });
            reject();
            return;
        }

        if (!this.validateFiles()) {
            notification.error({
                message: 'Could not create a task',
                description: 'A task must contain at least one file',
                className: 'cvat-notification-create-task-fail',
            });
            reject();
            return;
        }

        if (!this.basicConfigurationComponent.current) {
            reject();
            return;
        }

        this.basicConfigurationComponent.current
            .submit()
            .then(() => {
                if (this.advancedConfigurationComponent.current) {
                    return this.advancedConfigurationComponent.current.submit();
                }
                if (projectId) {
                    return core.projects.get({ id: projectId })
                        .then((response: any) => {
                            const [project] = response;
                            const { advanced } = this.state;
                            return this.handleSubmitAdvancedConfiguration({
                                ...advanced,
                                sourceStorage: new Storage(
                                    project.sourceStorage || { location: StorageLocation.LOCAL },
                                ),
                                targetStorage: new Storage(
                                    project.targetStorage || { location: StorageLocation.LOCAL },
                                ),
                            });
                        })
                        .catch((error: Error): void => {
                            throw new Error(`Couldn't fetch the project ${projectId} ${error.toString()}`);
                        });
                }
                return Promise.resolve();
            })
            .then(resolve)
            .catch((error: Error | ValidateErrorEntity): void => {
                notification.error({
                    message: 'Could not create a task',
                    description: (error as ValidateErrorEntity).errorFields ?
                        (error as ValidateErrorEntity).errorFields
                            .map((field) => `${field.name} : ${field.errors.join(';')}`)
                            .map((text: string): JSX.Element => <div>{text}</div>) :
                        error.toString(),
                    className: 'cvat-notification-create-task-fail',
                });
                reject(error);
            });
    });

    private handleSubmitAndOpen = (): void => {
        const { history } = this.props;

        this.validateBlocks()
            .then(this.createOneTask)
            .then((createdTask) => {
                const { id } = createdTask;
                history.push(`/tasks/${id}`);
            })
            .catch(() => {});
    };

    private handleSubmitAndContinue = (): void => {
        this.validateBlocks()
            .then(this.createOneTask)
            .then(() => {
                notification.info({
                    message: 'The task has been created',
                    className: 'cvat-notification-create-task-success',
                });
            })
            .then(this.resetState)
            .then(this.focusToForm)
            .catch(() => {});
    };

    private createOneTask = (): Promise<any> => {
        const { onCreate } = this.props;
        this.startLoading();
        return onCreate(this.state, this.changeStatusInProgressTask)
            .finally(this.stopLoading);
    };

    private setStatusOneOfMultiTasks = async (index: number, status: string): Promise<void> => {
        const { multiTasks } = this.state;
        const resultTask = {
            ...multiTasks[index],
            status,
        };

        return new Promise((resolve) => {
            const newMultiTasks: any = [
                ...multiTasks.slice(0, index),
                resultTask,
                ...multiTasks.slice(index + 1),
            ];
            this.setState({
                multiTasks: newMultiTasks,
            }, resolve);
        });
    };

    private createOneOfMultiTasks = async (index: any): Promise<void> => {
        const { onCreate } = this.props;
        const { multiTasks } = this.state;
        const task = multiTasks[index];

        if (task.status !== 'pending') return;

        await this.setStatusOneOfMultiTasks(index, 'progress');
        try {
            await onCreate(task);
            await this.setStatusOneOfMultiTasks(index, 'completed');
        } catch (err) {
            console.warn(err);
            await this.setStatusOneOfMultiTasks(index, 'failed');
        }
    };

    private createMultiTasks = async (): Promise<any> => {
        const { multiTasks } = this.state;
        this.startLoading();
        const { length } = multiTasks;
        let index = 0;
        const queueSize = 1;
        const promises = Array(queueSize)
            .fill(undefined)
            .map(async (): Promise<void> => {
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    index++; // preliminary increase is needed to avoid using the same index when queueSize > 1
                    if (index > length) break;
                    await this.createOneOfMultiTasks(index - 1);
                }
            });
        await Promise.allSettled(promises);
        this.stopLoading();
    };

    private addMultiTasks = async (): Promise<void> => new Promise((resolve) => {
        const {
            projectId,
            subset,
            advanced,
            labels,
            files: allFiles,
            activeFileManagerTab,
            cloudStorageId,
        } = this.state;

        const files: (File | string)[] = allFiles[activeFileManagerTab];

        this.setState({
            multiTasks: files.map((file, index) => ({
                projectId,
                basic: {
                    name: this.getTaskName(index, activeFileManagerTab),
                },
                subset,
                advanced,
                labels,
                files: {
                    ...defaultState.files,
                    [activeFileManagerTab]: [file],
                },
                activeFileManagerTab,
                cloudStorageId,
                status: 'pending',
            }
            )),
        }, resolve);
    });

    private handleSubmitMultiTasks = (): void => {
        this.validateBlocks()
            .then(this.addMultiTasks)
            .then(this.createMultiTasks)
            .then(() => {
                const { multiTasks } = this.state;
                const countCompleted = multiTasks.filter((item) => item.status === 'completed').length;
                const countFailed = multiTasks.filter((item) => item.status === 'failed').length;
                const countCancelled = multiTasks.filter((item) => item.status === 'cancelled').length;
                const countAll = multiTasks.length;

                notification.info({
                    message: 'The tasks have been created',
                    description:
                        `Completed: ${countCompleted}, failed: ${countFailed},${countCancelled ?
                            ` cancelled: ${countCancelled},` :
                            ''} total: ${countAll}, `,
                    className: 'cvat-notification-create-task-success',
                });
            });
    };

    private handleCancelMultiTasks = (): void => {
        const { multiTasks } = this.state;
        let count = 0;
        const newMultiTasks: any = multiTasks.map((it) => {
            if (it.status === 'pending') {
                count++;
                return {
                    ...it,
                    status: 'cancelled',
                };
            }
            return it;
        });
        this.setState({
            multiTasks: newMultiTasks,
        }, () => {
            notification.info({
                message: `Creation of ${count} tasks have been canceled`,
                className: 'cvat-notification-create-task-success',
            });
        });
    };

    private handleOkMultiTasks = (): void => {
        const { history, projectId } = this.props;
        if (projectId) {
            history.push(`/projects/${projectId}`);
        } else {
            history.push('/tasks/');
        }
    };

    private handleRetryCancelledMultiTasks = (): void => {
        const { multiTasks } = this.state;
        const newMultiTasks: any = multiTasks.map((it) => {
            if (it.status === 'cancelled') {
                return {
                    ...it,
                    status: 'pending',
                };
            }
            return it;
        });
        this.setState({
            multiTasks: newMultiTasks,
        }, () => {
            this.createMultiTasks();
        });
    };

    private handleRetryFailedMultiTasks = (): void => {
        const { multiTasks } = this.state;
        const newMultiTasks: any = multiTasks.map((it) => {
            if (it.status === 'failed') {
                return {
                    ...it,
                    status: 'pending',
                };
            }
            return it;
        });
        this.setState({
            multiTasks: newMultiTasks,
        }, () => {
            this.createMultiTasks();
        });
    };

    private getTaskName = (indexFile: number, fileManagerTabName: TabName, defaultFileName = ''): string => {
        const { many } = this.props;
        const { basic } = this.state;
        const { files } = this.state;
        const file = files[fileManagerTabName][indexFile];
        let fileName = defaultFileName;
        switch (fileManagerTabName) {
            case 'remote':
                fileName = getFileNameFromPath(file as string) || defaultFileName;
                break;
            case 'share':
                fileName = getFileNameFromPath(file as string) || defaultFileName;
                break;
            default:
                fileName = (file as File)?.name || (file as string) || defaultFileName;
                break;
        }
        return many ?
            basic.name
                .replaceAll('{{file_name}}', fileName)
                .replaceAll('{{index}}', indexFile.toString()) :
            basic.name;
    };

    private renderBasicBlock(): JSX.Element {
        const { many } = this.props;
        const exampleMultiTaskName = many ? this.getTaskName(0, 'local', 'fileName.mp4') : '';

        return (
            <Col span={24}>
                <BasicConfigurationForm
                    ref={this.basicConfigurationComponent}
                    many={many}
                    exampleMultiTaskName={exampleMultiTaskName}
                    onChange={this.handleChangeBasicConfiguration}
                />
            </Col>
        );
    }

    private renderProjectBlock(): JSX.Element {
        const { projectId } = this.state;

        return (
            <>
                <Col span={24}>
                    <Text className='cvat-text-color'>Project</Text>
                </Col>
                <Col span={24}>
                    <ProjectSearchField onSelect={this.handleProjectIdChange} value={projectId} />
                </Col>
            </>
        );
    }

    private renderSubsetBlock(): JSX.Element | null {
        const { projectId, subset } = this.state;

        if (projectId !== null) {
            return (
                <>
                    <Col span={24}>
                        <Text className='cvat-text-color'>Subset</Text>
                    </Col>
                    <Col span={24}>
                        <ProjectSubsetField
                            value={subset}
                            onChange={this.handleTaskSubsetChange}
                            projectId={projectId}
                        />
                    </Col>
                </>
            );
        }

        return null;
    }

    private renderLabelsBlock(): JSX.Element {
        const { projectId, labels } = this.state;

        if (projectId) {
            return (
                <>
                    <Col span={24}>
                        <Text className='cvat-text-color'>Labels</Text>
                    </Col>
                    <Col span={24}>
                        <Text type='secondary'>Project labels will be used</Text>
                    </Col>
                </>
            );
        }

        return (
            <Col span={24}>
                <Text type='danger'>* </Text>
                <Text className='cvat-text-color'>Labels</Text>
                <LabelsEditor
                    labels={labels}
                    onSubmit={(newLabels): void => {
                        this.setState({
                            labels: newLabels,
                        });
                    }}
                />
            </Col>
        );
    }

    private renderFilesBlock(): JSX.Element {
        const { many } = this.props;
        const { uploadFileErrorMessage } = this.state;

        return (
            <>
                <Col span={24}>
                    <Text type='danger'>* </Text>
                    <Text className='cvat-text-color'>Select files</Text>
                    <FileManagerComponent
                        many={many}
                        onChangeActiveKey={this.changeFileManagerTab}
                        onUploadLocalFiles={this.handleUploadLocalFiles}
                        onUploadRemoteFiles={this.handleUploadRemoteFiles}
                        onUploadShareFiles={this.handleUploadShareFiles}
                        onUploadCloudStorageFiles={this.handleUploadCloudStorageFiles}
                        ref={(component): void => {
                            this.fileManagerComponent = component;
                        }}
                    />
                </Col>
                { uploadFileErrorMessage ? (
                    <Col span={24}>
                        <Alert
                            className='cvat-create-task-content-alert'
                            type='error'
                            message={uploadFileErrorMessage}
                            showIcon
                        />
                    </Col>
                ) : null }
            </>
        );
    }

    private renderAdvancedBlock(): JSX.Element {
        const { activeFileManagerTab, projectId } = this.state;

        const {
            advanced: {
                useProjectSourceStorage,
                useProjectTargetStorage,
                sourceStorage: {
                    location: sourceStorageLocation,
                },
                targetStorage: {
                    location: targetStorageLocation,
                },
            },
        } = this.state;
        return (
            <Col span={24}>
                <Collapse
                    className='cvat-advanced-configuration-wrapper'
                    items={[{
                        key: '1',
                        label: <Text className='cvat-title'>Advanced configuration</Text>,
                        children: (
                            <AdvancedConfigurationForm
                                activeFileManagerTab={activeFileManagerTab}
                                ref={this.advancedConfigurationComponent}
                                onSubmit={this.handleSubmitAdvancedConfiguration}
                                projectId={projectId}
                                useProjectSourceStorage={useProjectSourceStorage}
                                useProjectTargetStorage={useProjectTargetStorage}
                                sourceStorageLocation={sourceStorageLocation}
                                targetStorageLocation={targetStorageLocation}
                                onChangeUseProjectSourceStorage={this.handleUseProjectSourceStorageChange}
                                onChangeUseProjectTargetStorage={this.handleUseProjectTargetStorageChange}
                                onChangeSourceStorageLocation={(value: StorageLocation) => {
                                    this.handleChangeStorageLocation('sourceStorage', value);
                                }}
                                onChangeTargetStorageLocation={(value: StorageLocation) => {
                                    this.handleChangeStorageLocation('targetStorage', value);
                                }}
                            />
                        ),
                    }]}
                />
            </Col>
        );
    }

    private renderFooterSingleTask(): JSX.Element {
        const { uploadFileErrorMessage, loading, statusInProgressTask: status } = this.state;

        if (status === 'FAILED' || loading) {
            return (<Alert message={status} />);
        }
        return (
            <Row justify='end' gutter={8}>
                <Col>
                    <Button
                        className='cvat-submit-open-task-button'
                        type='primary'
                        onClick={this.handleSubmitAndOpen}
                        disabled={!!uploadFileErrorMessage}
                    >
                        Submit & Open
                    </Button>
                </Col>
                <Col>
                    <Button
                        className='cvat-submit-continue-task-button'
                        type='primary'
                        onClick={this.handleSubmitAndContinue}
                        disabled={!!uploadFileErrorMessage}
                    >
                        Submit & Continue
                    </Button>
                </Col>
            </Row>
        );
    }

    private renderFooterMultiTasks(): JSX.Element {
        const {
            multiTasks: items,
            uploadFileErrorMessage,
            files,
            activeFileManagerTab,
            loading,
        } = this.state;
        const currentFiles = files[activeFileManagerTab];
        const countPending = items.filter((item) => item.status === 'pending').length;
        const countAll = items.length;

        if ((loading || countPending !== countAll) && currentFiles.length) {
            return (
                <MultiTasksProgress
                    tasks={items}
                    onOk={this.handleOkMultiTasks}
                    onCancel={this.handleCancelMultiTasks}
                    onRetryFailedTasks={this.handleRetryFailedMultiTasks}
                    onRetryCancelledTasks={this.handleRetryCancelledMultiTasks}
                />
            );
        }

        return (
            <Row justify='end' gutter={5}>
                <Col>
                    <Button
                        className='cvat-submit-multiple-tasks-button'
                        htmlType='submit'
                        type='primary'
                        onClick={this.handleSubmitMultiTasks}
                        disabled={!!uploadFileErrorMessage}
                    >
                        Submit&nbsp;
                        {currentFiles.length}
                        &nbsp;tasks
                    </Button>
                </Col>
            </Row>
        );
    }

    public render(): JSX.Element {
        const { many } = this.props;

        return (
            <Row justify='start' align='middle' className='cvat-create-task-content'>
                <Col span={24}>
                    <Text className='cvat-title'>Basic configuration</Text>
                </Col>

                {this.renderBasicBlock()}
                {this.renderProjectBlock()}
                {this.renderSubsetBlock()}
                {this.renderLabelsBlock()}
                {this.renderFilesBlock()}
                {this.renderAdvancedBlock()}

                <Col span={24} className='cvat-create-task-content-footer'>
                    {many ? this.renderFooterMultiTasks() : this.renderFooterSingleTask() }
                </Col>
            </Row>
        );
    }
}

export default withRouter(CreateTaskContent);
