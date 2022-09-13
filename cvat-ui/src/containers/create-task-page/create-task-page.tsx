// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import { CombinedState } from 'reducers';
import CreateTaskComponent from 'components/create-task-page/create-task-page';
import { CreateTaskData } from 'components/create-task-page/create-task-content';
import { createTaskAsync } from 'actions/tasks-actions';

interface StateToProps {
    installedGit: boolean;
    dumpers:[]
}

interface DispatchToProps {
    onCreate: (data: CreateTaskData, onProgress?: (status: string) => void) => Promise<any>;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onCreate: (data, onProgress) => dispatch(createTaskAsync(data, onProgress)),
    };
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        installedGit: state.plugins.list.GIT_INTEGRATION,
        dumpers: state.formats.annotationFormats.dumpers,
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateTaskComponent);
