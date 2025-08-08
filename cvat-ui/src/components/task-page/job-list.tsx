// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import jsonLogic from 'json-logic-js';
import _ from 'lodash';
import { CombinedState, JobsQuery, SelectedResourceType } from 'reducers';
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
    SortingComponent, ResourceFilterHOC, defaultVisibility, updateHistoryFromQuery, ResourceSelectionInfo,
} from 'components/resource-sorting-filtering';
import { useResourceQuery } from 'utils/hooks';
import BulkWrapper from 'components/bulk-wrapper';
import { selectionActions } from 'actions/selection-actions';
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

function filterJobs(jobs: Job[], query: JobsQuery): Job[] {
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

function setUpJobsList(jobs: Job[], newPage: number, pageSize: number): Job[] {
    return jobs.slice((newPage - 1) * pageSize, newPage * pageSize);
}

function JobListComponent(props: Readonly<Props>): JSX.Element {
    const { task: taskInstance, onJobUpdate } = props;
    const [visibility, setVisibility] = useState(defaultVisibility);

    const history = useHistory();
    const { id: taskId } = taskInstance;
    const { jobs } = taskInstance;

    const defaultQuery: JobsQuery = {
        page: 1,
        pageSize: 10,
        sort: null,
        search: null,
        filter: null,
    };
    const updatedQuery = useResourceQuery<JobsQuery>(defaultQuery);

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

    const jobChildIdMapping = Object.keys(jobChildMapping).reduce((acc, jobId) => {
        const childIds = jobChildMapping[Number(jobId)].map((job) => job.id);
        acc[Number(jobId)] = childIds;
        return acc;
    }, {} as Record<number, number[]>);

    const [uncollapsedJobs, setUncollapsedJobs] = useState<Record<number, boolean>>({});
    useEffect(() => {
        const savedState = localStorage.getItem('uncollapsedJobs');
        if (savedState) {
            setUncollapsedJobs(JSON.parse(savedState));
        }
    }, []);
    const onCollapseChange = useCallback((jobId: number) => {
        setUncollapsedJobs((prevState) => {
            const newState = { ...prevState };
            newState[jobId] = !prevState[jobId];

            localStorage.setItem('uncollapsedJobs', JSON.stringify(newState));
            return newState;
        });
    }, []);

    const [query, setQuery] = useState<JobsQuery>(updatedQuery);
    const filteredJobs = filterJobs(jobs, query);
    const jobIds = filteredJobs.map((job) => job.id);
    const viewedJobs = setUpJobsList(filteredJobs, query.page, query.pageSize);
    useEffect(() => {
        history.replace({
            search: updateHistoryFromQuery(query),
        });
    }, [query]);

    const onCreateJob = useCallback(() => {
        history.push(`/tasks/${taskId}/jobs/create`);
    }, []);

    const dispatch = useDispatch();
    const selectedCount = useSelector((state: CombinedState) => state.jobs.selected.length);
    const onSelectAll = useCallback(() => {
        const allJobIds = viewedJobs.flatMap((job) => [
            job.id,
            ...(jobChildIdMapping[job.id] || []),
        ]);
        dispatch(selectionActions.selectResources(allJobIds, SelectedResourceType.JOBS));
    }, [dispatch, filteredJobs]);

    return (
        <>
            <div className='cvat-jobs-list-filters-wrapper'>
                <Row>
                    <Col>
                        <Text className='cvat-text-color cvat-jobs-header'> Jobs </Text>
                        <ResourceSelectionInfo selectedCount={selectedCount} onSelectAll={onSelectAll} />
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
            {jobIds.length ? (
                <div className='cvat-task-job-list'>
                    <Col className='cvat-jobs-list'>
                        <BulkWrapper
                            currentResourceIds={jobIds}
                            parentToChildrenMap={jobChildIdMapping}
                            resourceType={SelectedResourceType.JOBS}
                        >
                            {(selectProps) => (
                                viewedJobs
                                    .map((job: Job, idx: number) => {
                                        const { selected, onClick } = selectProps(job.id, idx);
                                        return (
                                            <JobItem
                                                key={job.id}
                                                job={job}
                                                task={taskInstance}
                                                onJobUpdate={onJobUpdate}
                                                childJobs={jobChildMapping[job.id] || []}
                                                defaultCollapsed={!uncollapsedJobs[job.id]}
                                                onCollapseChange={onCollapseChange}
                                                selected={selected}
                                                onClick={onClick}
                                            />
                                        );
                                    })
                            )}
                        </BulkWrapper>
                    </Col>
                </div>
            ) : (
                <Empty description='No jobs found' />
            )}
            <Row justify='center' align='middle'>
                <Col>
                    <Pagination
                        className='cvat-tasks-pagination'
                        onChange={(page: number, pageSize: number) => {
                            setQuery({
                                ...query,
                                page,
                                pageSize,
                            });
                        }}
                        total={filteredJobs.length}
                        pageSize={query.pageSize}
                        current={query.page}
                        showQuickJumper
                        showSizeChanger
                    />
                </Col>
            </Row>
        </>
    );
}

export default React.memo(JobListComponent);
