import React from 'react';
import { connect } from 'react-redux';

import DetailsComponent from '../../components/task-page/details';
import { CombinedState } from '../../reducers/root-reducer';

interface StateToProps {
    previewImage: string;
    taskInstance: any;
    installedGit: boolean;
}


function mapStateToProps(state: CombinedState): StateToProps {
    const { plugins } = state.plugins;
    const taskInstance = (state.activeTask.task as any).instance;
    const previewImage = (state.activeTask.task as any).preview;

    return {
        taskInstance,
        previewImage,
        installedGit: plugins.GIT_INTEGRATION,
    };
}


function TaskPageContainer(props: StateToProps) {
    return (
        <DetailsComponent
            previewImage={props.previewImage}
            taskInstance={props.taskInstance}
            installedGit={props.installedGit}
        />
    );
}

export default connect(
    mapStateToProps, {}
)(TaskPageContainer);