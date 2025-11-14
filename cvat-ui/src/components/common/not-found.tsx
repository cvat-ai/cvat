// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT


import React from 'react';
import Result from 'antd/lib/result';
import Button from 'antd/lib/button';
import { useHistory } from 'react-router';

export const JobNotFoundComponent = React.memo((): JSX.Element => {
    const history = useHistory();
    const handleGoToJobs = () => {
        history.push('/jobs');
    };
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title='Sorry, but this job was not found'
            subTitle='Please, be sure information you tried to get exist and you have access'
            extra={
                <Button type='primary' onClick={handleGoToJobs}>
                    Go to Jobs (reset filters)
                </Button>
            }
        />
    );
});

export const TaskNotFoundComponent = React.memo((): JSX.Element => {
    const history = useHistory();
    const handleGoToTasks = () => {
        history.push('/tasks');
    };
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title='There was something wrong during getting the task'
            subTitle='Please, be sure, that information you tried to get exist and you are eligible to access it'
            extra={
                <Button type='primary' onClick={handleGoToTasks}>
                    Go to Tasks (reset filters)
                </Button>
            }
        />
    );
});

export const ProjectNotFoundComponent = React.memo((): JSX.Element => (
    <Result
        className='cvat-not-found'
        status='404'
        title='There was something wrong during getting the project'
        subTitle='Please, be sure, that information you tried to get exist and you are eligible to access it'
    />
));

export const CloudStorageNotFoundComponent = React.memo((): JSX.Element => (
    <Result
        className='cvat-not-found'
        status='404'
        title='Sorry, but the requested cloud storage was not found'
        subTitle='Please, be sure id you requested exists and you have appropriate permissions'
    />
));
