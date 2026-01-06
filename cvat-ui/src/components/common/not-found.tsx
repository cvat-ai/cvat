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
            title='抱歉，未找到此作业'
            subTitle='请确认您要访问的信息存在且您有访问权限'
            extra={<Button type='primary' onClick={handleReturn}>返回上一页</Button>}
        />
    );
});

export const TaskNotFoundComponent = React.memo((): JSX.Element => {
    const handleReturn = useReturnButton('/tasks');
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title='获取任务时出错'
            subTitle='请确认您要访问的信息存在且您有访问权限'
            extra={<Button type='primary' onClick={handleReturn}>返回上一页</Button>}
        />
    );
});

export const ProjectNotFoundComponent = React.memo((): JSX.Element => {
    const handleReturn = useReturnButton('/projects');
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title='获取项目时出错'
            subTitle='请确认您要访问的信息存在且您有相应的访问权限'
            extra={<Button type='primary' onClick={handleReturn}>返回上一页</Button>}
        />
    );
});

export const CloudStorageNotFoundComponent = React.memo((): JSX.Element => {
    const handleReturn = useReturnButton('/cloudstorages');
    return (
        <Result
            className='cvat-not-found'
            status='404'
            title='抱歉，未找到请求的云存储'
            subTitle='请确认请求的 ID 存在且您拥有相应的权限'
            extra={<Button type='primary' onClick={handleReturn}>返回上一页</Button>}
        />
    );
});

