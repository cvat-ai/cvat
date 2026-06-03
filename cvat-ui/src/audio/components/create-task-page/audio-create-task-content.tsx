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
import LabelsEditor from 'components/labels-editor/labels-editor';
import FileManagerComponent from 'components/file-manager/file-manager';
import { RemoteFile } from 'components/file-manager/remote-browser';
import { isAudioFile, isAudioPath } from 'audio/utils/audio-files';

import { FrameSelectionMethod } from 'components/create-job-page/job-form';
import { formFieldsError } from 'utils/validation';
import BasicConfigurationForm, { BaseConfiguration } from 'components/create-task-page/basic-configuration-form';
import ProjectSearchField from 'components/create-task-page/project-search-field';
import ProjectSubsetField from 'components/create-task-page/project-subset-field';
import AdvancedConfigurationForm, {
    AUDIO_ADVANCED_CONFIGURATION_SECTIONS,
    AdvancedConfiguration,
    SortingMethod,
} from 'components/create-task-page/advanced-configuration-form';
import QualityConfigurationForm, {
    AUDIO_QUALITY_CONFIGURATION_SECTIONS,
    QualityConfiguration,
    ValidationMode,
} from 'components/create-task-page/quality-configuration-form';
import { CreateTaskData } from 'components/create-task-page/create-task-content';

type TabName = 'local' | 'share' | 'remote' | 'cloudStorage';
const core = getCore();

interface Props {
    onCreate: (data: CreateTaskData, onProgress?: (status: string, progress?: number) => void) => Promise<any>;
    projectId: number | null;
}

type State = CreateTaskData & {
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
    uploadFileErrorMessage: '',
    loading: false,
    statusInProgressTask: '',
};

const NON_AUDIO_ERROR = 'Wrong list of files. Only audio files are allowed for an audio task. ';
const LOCAL_AUDIO_FILES_HINT = 'You can upload an audio file';

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
    private advancedConfigurationComponent: RefObject<AdvancedConfigurationForm>;
    private qualityConfigurationComponent: RefObject<QualityConfigurationForm>;
    private fileManagerComponent: any;

    public constructor(props: Props & RouteComponentProps) {
        super(props);
        this.state = { ...defaultState };
        this.basicConfigurationComponent = React.createRef<BasicConfigurationForm>();
        this.advancedConfigurationComponent = React.createRef<AdvancedConfigurationForm>();
        this.qualityConfigurationComponent = React.createRef<QualityConfigurationForm>();
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

    private handleSortingMethodChange = (value: SortingMethod): void => {
        this.setState((state) => ({
            advanced: {
                ...state.advanced,
                sortingMethod: value,
            },
        }));
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

    private renderBasicBlock(): JSX.Element {
        return (
            <Col span={24}>
                <BasicConfigurationForm
                    ref={this.basicConfigurationComponent}
                    many={false}
                    exampleMultiTaskName=''
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
                <LabelsEditor
                    enableSkeletonCreator={false}
                    enableFromModelCreator={false}
                    showLabelType={false}
                    labels={labels}
                    onSubmit={(newLabels): void => {
                        this.setState({ labels: newLabels });
                    }}
                />
            </Col>
        );
    }

    private renderFilesBlock(): JSX.Element {
        const { uploadFileErrorMessage } = this.state;

        return (
            <>
                <Col span={24}>
                    <Text type='danger'>* </Text>
                    <Text className='cvat-text-color'>Select files</Text>
                    <FileManagerComponent
                        localFilesHint={LOCAL_AUDIO_FILES_HINT}
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
            activeFileManagerTab,
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
                            <AdvancedConfigurationForm
                                activeFileManagerTab={activeFileManagerTab}
                                ref={this.advancedConfigurationComponent}
                                visibleSections={AUDIO_ADVANCED_CONFIGURATION_SECTIONS}
                                onSubmit={this.handleSubmitAdvancedConfiguration}
                                projectId={projectId}
                                useProjectSourceStorage={useProjectSourceStorage}
                                useProjectTargetStorage={useProjectTargetStorage}
                                sourceStorageLocation={sourceStorageLocation}
                                targetStorageLocation={targetStorageLocation}
                                onChangeUseProjectSourceStorage={this.handleUseProjectSourceStorageChange}
                                onChangeUseProjectTargetStorage={this.handleUseProjectTargetStorageChange}
                                onChangeSortingMethod={this.handleSortingMethodChange}
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
        const { quality: { frameSelectionMethod, validationMode } } = this.state;

        return (
            <Col span={24}>
                <Collapse
                    className='cvat-quality-configuration-wrapper'
                    items={[{
                        key: '1',
                        label: <Text className='cvat-title'>Quality</Text>,
                        children: (
                            <QualityConfigurationForm
                                ref={this.qualityConfigurationComponent}
                                visibleSections={AUDIO_QUALITY_CONFIGURATION_SECTIONS}
                                initialValues={defaultState.quality}
                                onSubmit={this.handleSubmitQualityConfiguration}
                                frameSelectionMethod={frameSelectionMethod}
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

    public render(): JSX.Element {
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
                    {this.renderFooterSingleTask()}
                </Col>
            </Row>
        );
    }
}

export default withRouter(AudioCreateTaskContent);
