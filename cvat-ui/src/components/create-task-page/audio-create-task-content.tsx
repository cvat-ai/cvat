// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
import { getCore, Storage, StorageLocation } from 'cvat-core-wrapper';
import AudioLabelsEditor from 'components/labels-editor/audio-labels-editor';
import FileManagerComponent from 'components/file-manager/file-manager';
import { RemoteFile } from 'components/file-manager/remote-browser';
import { getFileNameFromPath, isAudioFile, isAudioPath } from 'utils/files';

import { FrameSelectionMethod } from 'components/create-job-page/job-form';
import { formFieldsError } from 'utils/validation';
import BasicConfigurationForm, { BaseConfiguration } from './basic-configuration-form';
import ProjectSearchField from './project-search-field';
import ProjectSubsetField from './project-subset-field';
import MultiTasksProgress from './multi-task-progress';
import { AdvancedConfiguration, SortingMethod } from './advanced-configuration-form';
import AudioAdvancedConfigurationForm from './audio-advanced-configuration-form';
import { QualityConfiguration, ValidationMode } from './quality-configuration-form';
import AudioQualityConfigurationForm from './audio-quality-configuration-form';
import { CreateTaskData } from './create-task-content';

type TabName = 'local' | 'share' | 'remote' | 'cloudStorage';
const core = getCore();

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
        consensusReplicas: 0,
    },
    quality: {
        validationMode: ValidationMode.NONE,
        validationFramesPercent: 5,
        validationFramesPerJobPercent: 1,
        frameSelectionMethod: FrameSelectionMethod.RANDOM,
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

const NON_AUDIO_ERROR = 'Wrong list of files. Only audio files are allowed for an audio task. ';

function localFilesHaveNonAudio(files: File[]): boolean {
    const meaningful = files.filter((f) => !f.name.endsWith('.jsonl'));
    return meaningful.some((f) => !isAudioFile(f));
}

function pathsHaveNonAudio(paths: string[]): boolean {
    const meaningful = paths.filter((p) => !p.endsWith('.jsonl'));
    return meaningful.some((p) => !isAudioPath(p));
}

class AudioCreateTaskContent extends React.PureComponent<Props & RouteComponentProps, State> {
    private basicConfigurationComponent: RefObject<BasicConfigurationForm>;
    private advancedConfigurationComponent: RefObject<AudioAdvancedConfigurationForm>;
    private qualityConfigurationComponent: RefObject<AudioQualityConfigurationForm>;
    private fileManagerComponent: any;

    public constructor(props: Props & RouteComponentProps) {
        super(props);
        this.state = { ...defaultState };
        this.basicConfigurationComponent = React.createRef<BasicConfigurationForm>();
        this.advancedConfigurationComponent = React.createRef<AudioAdvancedConfigurationForm>();
        this.qualityConfigurationComponent = React.createRef<AudioQualityConfigurationForm>();
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
        this.setState({ loading: true });
    };

    private stopLoading = (): void => {
        this.setState({ loading: false });
    };

    private changeStatusInProgressTask = (status: string): void => {
        this.setState({ statusInProgressTask: status });
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
        this.setState({ basic: { ...values } });
    };

    private handleSubmitQualityConfiguration = (values: QualityConfiguration): Promise<void> => (
        new Promise((resolve) => {
            this.setState({ quality: { ...values } }, resolve);
        })
    );

    private handleSubmitAdvancedConfiguration = (values: AdvancedConfiguration): Promise<void> => (
        new Promise((resolve) => {
            this.setState({ advanced: { ...values } }, resolve);
        })
    );

    private handleTaskSubsetChange = (value: string): void => {
        this.setState({ subset: value });
    };

    private changeFileManagerTab = (value: TabName): void => {
        this.setState({ activeFileManagerTab: value });
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

    private handleValidationModeChange = (value: ValidationMode): void => {
        this.qualityConfigurationComponent.current?.resetFields();
        this.setState(() => ({
            quality: {
                ...defaultState.quality,
                validationMode: value,
            },
        }));
    };

    private handleFrameSelectionMethodChange = (value: FrameSelectionMethod): void => {
        this.setState((state) => ({
            quality: {
                ...state.quality,
                frameSelectionMethod: value,
            },
        }));
    };

    private focusToForm = (): void => {
        this.basicConfigurationComponent.current?.focus();
    };

    private handleUploadLocalFiles = (uploadedFiles: File[]): void => {
        const { files } = this.state;

        const excludedManifests = uploadedFiles.filter((x: File) => !x.name.endsWith('.jsonl'));
        const uploadFileErrorMessage = localFilesHaveNonAudio(excludedManifests) ? NON_AUDIO_ERROR : '';

        this.setState({ uploadFileErrorMessage });

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
        const { files } = this.state;
        const uploadFileErrorMessage = pathsHaveNonAudio(urls) ? NON_AUDIO_ERROR : '';

        this.setState({ uploadFileErrorMessage });

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
        const keys = shareFiles.map((it) => it.key);
        const uploadFileErrorMessage = pathsHaveNonAudio(keys) ? NON_AUDIO_ERROR : '';

        this.setState({ uploadFileErrorMessage });

        if (!uploadFileErrorMessage) {
            this.setState({
                files: {
                    ...files,
                    share: keys,
                },
            });
        }
    };

    private handleUploadCloudStorageFiles = (cloudStorageFiles: RemoteFile[]): void => {
        const { files } = this.state;
        const keys = cloudStorageFiles.map((it) => it.key);
        const uploadFileErrorMessage = pathsHaveNonAudio(keys) ? NON_AUDIO_ERROR : '';

        this.setState({ uploadFileErrorMessage });

        if (!uploadFileErrorMessage) {
            this.setState({
                files: {
                    ...files,
                    cloudStorage: keys,
                },
            });
        }
    };

    private validateBlocks = (): Promise<any> => new Promise((resolve, reject) => {
        const { projectId } = this.state;

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
                const promises: Promise<void>[] = [];

                if (this.advancedConfigurationComponent.current) {
                    promises.push(this.advancedConfigurationComponent.current.submit());
                }

                if (this.qualityConfigurationComponent.current) {
                    promises.push(this.qualityConfigurationComponent.current.submit());
                }

                return Promise.all(promises);
            }).then(() => {
                if (projectId) {
                    return core.projects.get({ id: projectId }).then((response) => {
                        const [project] = response;
                        const { advanced } = this.state;
                        return this.handleSubmitAdvancedConfiguration({
                            ...advanced,
                            sourceStorage: advanced.useProjectSourceStorage ? new Storage(
                                project.sourceStorage || { location: StorageLocation.LOCAL },
                            ) : advanced.sourceStorage,
                            targetStorage: advanced.useProjectTargetStorage ? new Storage(
                                project.targetStorage || { location: StorageLocation.LOCAL },
                            ) : advanced.targetStorage,
                        });
                    }).catch((error: Error): void => {
                        throw new Error(`Couldn't fetch the project ${projectId} ${error.toString()}`);
                    });
                }

                return Promise.resolve();
            }).then(resolve)
            .catch((error: Error | ValidateErrorEntity): void => {
                notification.error({
                    message: 'Could not create a task',
                    description: formFieldsError(error).map((text: string): JSX.Element => <div>{text}</div>),
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
            this.setState({ multiTasks: newMultiTasks }, resolve);
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
                    index++;
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
            quality,
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
                quality,
                labels,
                files: {
                    ...defaultState.files,
                    [activeFileManagerTab]: [file],
                },
                activeFileManagerTab,
                cloudStorageId,
                status: 'pending',
            })),
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
                return { ...it, status: 'cancelled' };
            }
            return it;
        });
        this.setState({ multiTasks: newMultiTasks }, () => {
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
                return { ...it, status: 'pending' };
            }
            return it;
        });
        this.setState({ multiTasks: newMultiTasks }, () => {
            this.createMultiTasks();
        });
    };

    private handleRetryFailedMultiTasks = (): void => {
        const { multiTasks } = this.state;
        const newMultiTasks: any = multiTasks.map((it) => {
            if (it.status === 'failed') {
                return { ...it, status: 'pending' };
            }
            return it;
        });
        this.setState({ multiTasks: newMultiTasks }, () => {
            this.createMultiTasks();
        });
    };

    private getTaskName = (indexFile: number, fileManagerTabName: TabName, defaultFileName = ''): string => {
        const { many } = this.props;
        const { basic, files } = this.state;
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
                            projectSubsets={null}
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
                <Text className='cvat-text-color'>Labels</Text>
                <AudioLabelsEditor
                    labels={labels}
                    onSubmit={(newLabels): void => {
                        this.setState({ labels: newLabels });
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
        const { projectId } = this.state;

        const {
            advanced: {
                useProjectSourceStorage,
                useProjectTargetStorage,
                sourceStorage: { location: sourceStorageLocation },
                targetStorage: { location: targetStorageLocation },
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
                            <AudioAdvancedConfigurationForm
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

    private renderQualityBlock(): JSX.Element {
        const { quality: { validationMode } } = this.state;

        return (
            <Col span={24}>
                <Collapse
                    className='cvat-quality-configuration-wrapper'
                    items={[{
                        key: '1',
                        label: <Text className='cvat-title'>Quality</Text>,
                        children: (
                            <AudioQualityConfigurationForm
                                ref={this.qualityConfigurationComponent}
                                initialValues={defaultState.quality}
                                onSubmit={this.handleSubmitQualityConfiguration}
                                onChangeFrameSelectionMethod={this.handleFrameSelectionMethodChange}
                                validationMode={validationMode}
                                onChangeValidationMode={this.handleValidationModeChange}
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
                {this.renderQualityBlock()}

                <Col span={24} className='cvat-create-task-content-footer'>
                    {many ? this.renderFooterMultiTasks() : this.renderFooterSingleTask() }
                </Col>
            </Row>
        );
    }
}

export default withRouter(AudioCreateTaskContent);
