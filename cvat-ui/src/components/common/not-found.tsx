// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Result from 'antd/lib/result';
import Button from 'antd/lib/button';
import { useHistory } from 'react-router-dom';

function useReturnButton(fallbackPath: string): () => void {
    const history = useHistory();
    const handleReturn = (): void => {
        if (history.length > 2) {
            history.goBack();
        } else {
            history.push(fallbackPath);
        }
    };
    return handleReturn;
}

export const JobNotFoundComponent = React.memo((): JSX.Element => {
    const handleReturn = useReturnButton('/jobs');
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title='Sorry, but this job was not found'
            subTitle='Please, be sure information you tried to get exist and you have access'
            extra={<Button type='primary' onClick={handleReturn}>Return to Previous Page</Button>}
        />
    );
});

export const TaskNotFoundComponent = React.memo((): JSX.Element => {
    const handleReturn = useReturnButton('/tasks');
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title='There was something wrong during getting the task'
            subTitle='Please, be sure information you tried to get exist and you have access'
            extra={<Button type='primary' onClick={handleReturn}>Return to Previous Page</Button>}
        />
    );
});

export const ProjectNotFoundComponent = React.memo((): JSX.Element => {
    const handleReturn = useReturnButton('/projects');
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title='There was something wrong during getting the project'
            subTitle='Please, be sure, that information you tried to get exist and you are eligible to access it'
            extra={<Button type='primary' onClick={handleReturn}>Return to Previous Page</Button>}
        />
    );
});

export const CloudStorageNotFoundComponent = React.memo((): JSX.Element => {
    const handleReturn = useReturnButton('/cloudstorages');
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title='Sorry, but the requested cloud storage was not found'
            subTitle='Please, be sure id you requested exists and you have appropriate permissions'
            extra={<Button type='primary' onClick={handleReturn}>Return to Previous Page</Button>}
        />
    );
});
