// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import jsonLogic from 'json-logic-js';
import _ from 'lodash';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';

import {
    Task, Job,
} from 'cvat-core-wrapper';
import { Indexable, JobsQuery } from 'reducers';
import JobItem from 'components/job-item/job-item';
import Pagination from 'antd/lib/pagination';
import {
    SortingComponent, ResourceFilterHOC, defaultVisibility, updateHistoryFromQuery,
} from 'components/resource-sorting-filtering';
import Button from 'antd/lib/button';
import { PlusOutlined } from '@ant-design/icons';
import Empty from 'antd/lib/empty';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues, config,
} from './jobs-filter-configuration';

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues,
);

interface Props {
    task: Task;
    onUpdateJob(jobInstance: Job): void;
}

const PAGE_SIZE = 10;
function setUpJobsList(jobs: Job[], query: JobsQuery): Job[] {
    let result = jobs;
    if (query.sort) {
        let sort = query.sort.split(',');
        const orders = sort.map((elem: string) => (elem.startsWith('-') ? 'desc' : 'asc'));
        sort = sort.map((elem: string) => (elem.startsWith('-') ? elem.substring(1) : elem));
        const assigneeInd = sort.indexOf('assignee');
        if (assigneeInd > -1) {
            sort[assigneeInd] = 'assignee.username';
        }
        result = _.orderBy(result, sort, orders);
    }
    if (query.filter) {
        const converted = result.map((job) => ({ ...job, assignee: job?.assignee?.username }));
        const filter = JSON.parse(query.filter);
        result = result.filter((job, index) => jsonLogic.apply(filter, converted[index]));
    }

    return result;
}

function JobListComponent(props: Props): JSX.Element {
    const {
        task: taskInstance,
        onUpdateJob,
    } = props;
    const [visibility, setVisibility] = useState(defaultVisibility);

    const history = useHistory();
    const { id: taskId } = taskInstance;
    const { jobs } = taskInstance;

    const queryParams = new URLSearchParams(history.location.search);
    const updatedQuery: JobsQuery = {
        page: 1,
        sort: null,
        search: null,
        filter: null,
    };
    for (const key of Object.keys(updatedQuery)) {
        (updatedQuery as Indexable)[key] = queryParams.get(key) || null;
        if (key === 'page') {
            updatedQuery.page = updatedQuery.page ? +updatedQuery.page : 1;
        }
    }
    const [query, setQuery] = useState<JobsQuery>(updatedQuery);
    const filteredJobs = setUpJobsList(jobs, query);
    const jobViews = filteredJobs
        .slice((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE)
        .map((job: Job) => <JobItem key={job.id} job={job} task={taskInstance} onJobUpdate={onUpdateJob} />);
    useEffect(() => {
        history.replace({
            search: updateHistoryFromQuery(query),
        });
    }, [query]);

    const onCreateJob = useCallback(() => {
        history.push(`/tasks/${taskId}/jobs/create`);
    }, []);

    return (
        <>
            <div className='cvat-jobs-list-filters-wrapper'>
                <SortingComponent
                    visible={visibility.sorting}
                    onVisibleChange={(visible: boolean) => (
                        setVisibility({ ...defaultVisibility, sorting: visible })
                    )}
                    defaultFields={query.sort?.split(',') || ['-ID']}
                    sortingFields={['ID', 'Assignee', 'State', 'Stage']}
                    onApplySorting={(sort: string | null) => {
                        setQuery({
                            ...query,
                            sort,
                        });
                    }}
                />
                <FilteringComponent
                    value={query.filter}
                    predefinedVisible={visibility.predefined}
                    builderVisible={visibility.builder}
                    recentVisible={visibility.recent}
                    onPredefinedVisibleChange={(visible: boolean) => (
                        setVisibility({ ...defaultVisibility, predefined: visible })
                    )}
                    onBuilderVisibleChange={(visible: boolean) => (
                        setVisibility({ ...defaultVisibility, builder: visible })
                    )}
                    onRecentVisibleChange={(visible: boolean) => (
                        setVisibility({ ...defaultVisibility, builder: visibility.builder, recent: visible })
                    )}
                    onApplyFilter={(filter: string | null) => {
                        setQuery({
                            ...query,
                            filter,
                        });
                    }}
                />
                <div className='cvat-job-add-wrapper'>
                    <Button onClick={onCreateJob} type='primary' className='cvat-create-job' icon={<PlusOutlined />} />
                </div>
            </div>

            {
                jobViews.length ? (
                    <>
                        <div className='cvat-task-job-list'>
                            <Col className='cvat-jobs-list'>
                                {jobViews}
                            </Col>
                        </div>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Pagination
                                    className='cvat-tasks-pagination'
                                    onChange={(page: number) => {
                                        setQuery({
                                            ...query,
                                            page,
                                        });
                                    }}
                                    showSizeChanger={false}
                                    total={filteredJobs.length}
                                    pageSize={PAGE_SIZE}
                                    current={query.page}
                                    showQuickJumper
                                />
                            </Col>
                        </Row>
                    </>
                ) : (
                    <Empty description='No jobs found' />
                )
            }
        </>
    );
}

export default React.memo(JobListComponent);
