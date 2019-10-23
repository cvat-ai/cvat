import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Col,
    Row,
    Spin,
    Modal,
} from 'antd';

import TopBarComponent from './top-bar';
import DetailsComponent from './details';
import JobListComponent from './job-list';

interface TaskPageComponentProps {
    previewImage: string;
    taskInstance: any;
    taskFetchingError: string;
    loaders: any[];
    dumpers: any[];
    loadActivity: string | null;
    dumpActivities: string[] | null;
    deleteActivity: boolean | null;
    installedTFAnnotation: boolean;
    installedAutoAnnotation: boolean;
    installedGit: boolean;
    onFetchTask: (tid: number) => void;
    onLoadAnnotation: (taskInstance: any, loader: any, file: File) => void;
    onDumpAnnotation: (task: any, dumper: any) => void;
    onDeleteTask: (task: any) => void;
}

class TaskPageComponent extends React.PureComponent<TaskPageComponentProps & RouteComponentProps<{id: string}>> {
    public componentDidUpdate() {
        if (this.props.deleteActivity) {
            this.props.history.replace('/tasks');
        }
    }

    public render() {
        const { id } = this.props.match.params;
        const fetchTask = !this.props.taskInstance && !this.props.taskFetchingError
            || (this.props.taskInstance && this.props.taskInstance.id !== +id );

        if (fetchTask) {
            this.props.onFetchTask(+id);
            return (
                <Spin size='large' style={{margin: '25% 50%'}}/>
            );
        } else if (this.props.taskFetchingError) {
            Modal.error({
                title: `Could not receive task ${id}`,
                content: this.props.taskFetchingError,
            });

            return (
                <div> </div>
            )
        } else {
            return (
                <Row type='flex' justify='center' align='middle'>
                    <Col md={22} lg={18} xl={16} xxl={14}>
                        <TopBarComponent
                            taskInstance={this.props.taskInstance}
                            loaders={this.props.loaders}
                            dumpers={this.props.dumpers}
                            loadActivity={this.props.loadActivity}
                            dumpActivities={this.props.dumpActivities}
                            installedTFAnnotation={this.props.installedTFAnnotation}
                            installedAutoAnnotation={this.props.installedAutoAnnotation}
                            onLoadAnnotation={this.props.onLoadAnnotation}
                            onDumpAnnotation={this.props.onDumpAnnotation}
                            onDeleteTask={this.props.onDeleteTask}
                        />
                        <DetailsComponent/>
                        <JobListComponent/>
                    </Col>
                </Row>
            );
        }
    }
}

export default withRouter(TaskPageComponent);
