// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { RefObject } from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Alert from 'antd/lib/alert';
import Button from 'antd/lib/button';
import Collapse from 'antd/lib/collapse';
import notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ValidateErrorEntity } from 'rc-field-form/lib/interface';

import ConnectedFileManager from 'containers/file-manager/file-manager';
import LabelsEditor from 'components/labels-editor/labels-editor';
import { Files } from 'components/file-manager/file-manager';
import BasicConfigurationForm, { BaseConfiguration } from './basic-configuration-form';
import ProjectSearchField from './project-search-field';
import ProjectSubsetField from './project-subset-field';
import AdvancedConfigurationForm, { AdvancedConfiguration, SortingMethod } from './advanced-configuration-form';

export interface CreateTaskData {
    projectId: number | null;
    basic: BaseConfiguration;
    subset: string;
    advanced: AdvancedConfiguration;
    labels: any[];
    files: Files;
    activeFileManagerTab: string;
    cloudStorageId: number | null;
}

interface Props {
    onCreate: (data: CreateTaskData) => void;
    status: string;
    taskId: number | null;
    projectId: number | null;
    installedGit: boolean;
    dumpers:[]
}

type State = CreateTaskData;

const defaultState = {
    projectId: null,
    basic: {
        name: '',
    },
    subset: '',
    advanced: {
        lfs: false,
        useZipChunks: true,
        useCache: true,
        sortingMethod: SortingMethod.LEXICOGRAPHICAL,
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
};

class CreateTaskContent extends React.PureComponent<Props & RouteComponentProps, State> {
    private basicConfigurationComponent: RefObject<BasicConfigurationForm>;
    private advancedConfigurationComponent: RefObject<AdvancedConfigurationForm>;
    private fileManagerContainer: any;

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

    private resetState = (): void => {
        this.basicConfigurationComponent.current?.resetFields();
        this.advancedConfigurationComponent.current?.resetFields();

        this.fileManagerContainer.reset();

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
        const { activeFileManagerTab } = this.state;
        const files = this.fileManagerContainer.getFiles();

        this.setState({
            files,
        });

        if (activeFileManagerTab === 'cloudStorage') {
            this.setState({
                cloudStorageId: this.fileManagerContainer.getCloudStorageId(),
            });
        }
        const totalLen = Object.keys(files).reduce((acc, key) => acc + files[key].length, 0);

        return !!totalLen;
    };

    private handleProjectIdChange = (value: null | number): void => {
        const { projectId, subset } = this.state;

        this.setState((state) => ({
            projectId: value,
            subset: value && value === projectId ? subset : '',
            labels: value ? [] : state.labels,
        }));
    };

    private handleSubmitBasicConfiguration = (values: BaseConfiguration): void => {
        this.setState({
            basic: { ...values },
        });
    };

    private handleSubmitAdvancedConfiguration = (values: AdvancedConfiguration): void => {
        this.setState({
            advanced: { ...values },
        });
    };

    private handleTaskSubsetChange = (value: string): void => {
        this.setState({
            subset: value,
        });
    };

    private changeFileManagerTab = (key: string): void => {
        const values = this.state;
        this.setState({
            ...values,
            activeFileManagerTab: key,
        });
    };

    private focusToForm = (): void => {
        this.basicConfigurationComponent.current?.focus();
    };

    private handleSubmitAndOpen = (): void => {
        const { history } = this.props;

        this.handleSubmit()
            .then((createdTask) => {
                const { id } = createdTask;
                history.push(`/tasks/${id}`);
            })
            .catch(() => {});
    };

    private handleSubmitAndContinue = (): void => {
        this.handleSubmit()
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

    private handleSubmit = (): Promise<any> => new Promise((resolve, reject) => {
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
                return Promise.resolve();
            })
            .then((): void => {
                const { onCreate } = this.props;
                return onCreate(this.state);
            })
            .then((cratedTask) => {
                resolve(cratedTask);
            })
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

    private renderBasicBlock(): JSX.Element {
        return (
            <Col span={24}>
                <BasicConfigurationForm
                    ref={this.basicConfigurationComponent}
                    onSubmit={this.handleSubmitBasicConfiguration}
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
        return (
            <Col span={24}>
                <Text type='danger'>* </Text>
                <Text className='cvat-text-color'>Select files</Text>
                <ConnectedFileManager
                    onChangeActiveKey={this.changeFileManagerTab}
                    ref={(container: any): void => {
                        this.fileManagerContainer = container;
                    }}
                />
            </Col>
        );
    }

    private renderAdvancedBlock(): JSX.Element {
        const { installedGit, dumpers } = this.props;
        const { activeFileManagerTab } = this.state;
        return (
            <Col span={24}>
                <Collapse>
                    <Collapse.Panel key='1' header={<Text className='cvat-title'>Advanced configuration</Text>}>
                        <AdvancedConfigurationForm
                            dumpers={dumpers}
                            installedGit={installedGit}
                            activeFileManagerTab={activeFileManagerTab}
                            ref={this.advancedConfigurationComponent}
                            onSubmit={this.handleSubmitAdvancedConfiguration}
                        />
                    </Collapse.Panel>
                </Collapse>
            </Col>
        );
    }

    private renderActions(): JSX.Element {
        return (
            <Row justify='end' gutter={5}>
                <Col>
                    <Button type='primary' onClick={this.handleSubmitAndOpen}>
                        Submit & Open
                    </Button>
                </Col>
                <Col>
                    <Button type='primary' onClick={this.handleSubmitAndContinue}>
                        Submit & Continue
                    </Button>
                </Col>
            </Row>
        );
    }

    public render(): JSX.Element {
        const { status } = this.props;
        const loading = !!status && status !== 'CREATED' && status !== 'FAILED';

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
                    {loading ? <Alert message={status} /> : this.renderActions()}
                </Col>
            </Row>
        );
    }
}

export default withRouter(CreateTaskContent);
