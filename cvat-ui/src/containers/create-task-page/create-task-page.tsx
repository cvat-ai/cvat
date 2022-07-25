// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import { CombinedState } from 'reducers';
import CreateTaskComponent from 'components/create-task-page/create-task-page';
import { CreateTaskData } from 'components/create-task-page/create-task-content';
import { createTaskAsync } from 'actions/tasks-actions';

interface StateToProps {
    taskId: number | null;
    status: string;
    error: string;
    installedGit: boolean;
    dumpers:[]
}

interface DispatchToProps {
    onCreate: (data: CreateTaskData) => void;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onCreate: (data: CreateTaskData): Promise<any> => dispatch(createTaskAsync(data)),
    };
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { creates } = state.tasks.activities;
    return {
        ...creates,
        installedGit: state.plugins.list.GIT_INTEGRATION,
        dumpers: state.formats.annotationFormats.dumpers,
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateTaskComponent);
