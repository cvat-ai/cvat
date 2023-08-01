// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import JobListComponent from 'components/task-page/job-list';
import { updateJobAsync, searchImage } from 'actions/tasks-actions';
import { Task, ImageSearch } from 'reducers';

interface OwnProps {
    task: Task;
    imageSearch: ImageSearch,
}

interface DispatchToProps {
    onJobUpdate(jobInstance: any): void;
    onImageSearch(taskInstance: any, name: string): void;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onJobUpdate: (jobInstance: any): void => dispatch(updateJobAsync(jobInstance)),
        onImageSearch: (taskInstance: any, name: string): void => dispatch(searchImage(taskInstance, name)),
    };
}

function TaskPageContainer(props: DispatchToProps & OwnProps): JSX.Element {
    const {
        task, imageSearch, onJobUpdate, onImageSearch,
    } = props;

    return (
        <JobListComponent
            taskInstance={task.instance}
            onJobUpdate={onJobUpdate}
            imageSearchQuery={imageSearch.query}
            foundImages={imageSearch.results}
            onImageSearch={onImageSearch}
        />
    );
}

export default connect(null, mapDispatchToProps)(TaskPageContainer);
