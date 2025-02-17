// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import CreateTaskComponent from 'components/create-task-page/create-task-page';
import { CreateTaskData } from 'components/create-task-page/create-task-content';
import { createTaskAsync } from 'actions/tasks-actions';

interface DispatchToProps {
    onCreate: (data: CreateTaskData, onProgress?: (status: string) => void) => Promise<any>;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onCreate: (data, onProgress) => dispatch(createTaskAsync(data, onProgress)),
    };
}

export default connect(null, mapDispatchToProps)(CreateTaskComponent);
