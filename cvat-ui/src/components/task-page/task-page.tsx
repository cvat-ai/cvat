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

function TaskPageComponent(props: TaskPageComponentProps & RouteComponentProps<{id: string}>) {
    const { id } = props.match.params;
    if (!props.taskInstance && !props.taskFetchingError || props.taskInstance.id != +id) {
        props.onFetchTask(+id);
        return (
            <Spin size='large' style={{margin: '25% 50%'}}/>
        );
    } else if (props.taskFetchingError) {
        Modal.error({
            title: `Could not receive task ${id}`,
            content: props.taskFetchingError,
        });

        return (
            <div> </div>
        )
    } else {
        return (
            <Row type='flex' justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <TopBarComponent
                        taskInstance={props.taskInstance}
                        loaders={props.loaders}
                        dumpers={props.dumpers}
                        loadActivity={props.loadActivity}
                        dumpActivities={props.dumpActivities}
                        installedTFAnnotation={props.installedTFAnnotation}
                        installedAutoAnnotation={props.installedAutoAnnotation}
                        onLoadAnnotation={props.onLoadAnnotation}
                        onDumpAnnotation={props.onDumpAnnotation}
                        onDeleteTask={props.onDeleteTask}
                    />
                    <DetailsComponent/>
                    <JobListComponent/>
                </Col>
            </Row>
        );
    }
}

export default withRouter(TaskPageComponent);
