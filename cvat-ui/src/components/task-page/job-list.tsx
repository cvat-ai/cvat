// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import jsonLogic from 'json-logic-js';
import _ from 'lodash';
import { Indexable, JobsQuery } from 'reducers';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Pagination from 'antd/lib/pagination';
import Empty from 'antd/lib/empty';
import Button from 'antd/lib/button';
import { PlusOutlined } from '@ant-design/icons';
import { Task, Job } from 'cvat-core-wrapper';
import JobItem from 'components/job-item/job-item';
import {
    SortingComponent, ResourceFilterHOC, defaultVisibility, updateHistoryFromQuery,
} from 'components/resource-sorting-filtering';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues, config,
} from './jobs-filter-configuration';

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues,
);

interface Props {
    task: Task;
    onJobUpdate(job: Job, data: Parameters<Job['save']>[0]): void;
}

const PAGE_SIZE = 10;
function setUpJobsList(jobs: Job[], query: JobsQuery): Job[] {
    let result = jobs;

    // consensus jobs will be under the collapse view
    result = result.filter((job) => job.parentJobId === null);

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
        const converted = result.map((job) => ({
            assignee: job.assignee ? job.assignee.username : null,
            stage: job.stage,
            state: job.state,
            dimension: job.dimension,
            updatedDate: job.updatedDate,
            type: job.type,
            id: job.id,
        }));
        const filter = JSON.parse(query.filter);
        result = result.filter((job, index) => jsonLogic.apply(filter, converted[index]));
    }

    return result;
}

function JobListComponent(props: Props): JSX.Element {
    const { task: taskInstance, onJobUpdate } = props;
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

    const [jobChildMapping, setJobChildMapping] = useState<Record<number, Job[]>>({});
    useEffect(() => {
        if (taskInstance.consensusEnabled) {
            const mapping = jobs.reduce((acc, job) => {
                if (job.parentJobId === null && !acc[job.id]) {
                    acc[job.id] = [];
                } else if (job.parentJobId !== null) {
                    if (!acc[job.parentJobId]) {
                        acc[job.parentJobId] = [];
                    }
                    acc[job.parentJobId].push(job);
                }
                return acc;
            }, {} as Record<number, Job[]>);
            setJobChildMapping(mapping);
        }
    }, [taskInstance]);

    const [uncollapsedJobs, setUncollapsedJobs] = useState<Record<number, boolean>>({});
    const onCollapseChange = useCallback((jobId: number) => {
        setUncollapsedJobs((prevState) => ({
            ...prevState,
            [jobId]: !prevState[jobId],
        }));
    }, []);

    const [query, setQuery] = useState<JobsQuery>(updatedQuery);
    const filteredJobs = setUpJobsList(jobs, query);
    const jobViews = filteredJobs
        .slice((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE)
        .map((job: Job) => (
            <JobItem
                key={job.id}
                job={job}
                task={taskInstance}
                onJobUpdate={onJobUpdate}
                childJobs={jobChildMapping[job.id] || []}
                defaultCollapsed={!uncollapsedJobs[job.id]}
                onCollapseChange={onCollapseChange}
            />
        ));
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
                <Row>
                    <Col>
                        <Text className='cvat-text-color cvat-jobs-header'> Jobs </Text>
                    </Col>
                </Row>
                <Row>
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
                </Row>
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
