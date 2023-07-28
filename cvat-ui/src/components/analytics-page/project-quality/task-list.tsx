// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import { DownloadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { ColumnFilterItem } from 'antd/lib/table/interface';
import Table from 'antd/lib/table';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import notification from 'antd/lib/notification';

import { Task, QualityReport, getCore } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import { QualityQuery, TasksQuery } from 'reducers';
import Tag from 'antd/lib/tag';
import { useIsMounted } from 'utils/hooks';
import { getQualityColor } from '../utils/quality-color';
import { ConflictsTooltip } from './conflicts-summary';
import { percent, toRepresentation } from '../utils/text-formatting';

interface Props {
    projectId: number;
    projectReport: QualityReport | null;
}

function TaskListComponent(props: Props): JSX.Element {
    const { projectId, projectReport } = props;
    const projectReportId = projectReport?.id;

    const history = useHistory();
    const isMounted = useIsMounted();

    const [fetching, setFetching] = useState<boolean>(true);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [tasksMap, setTasksMap] = useState<Record<number, Task>>({});
    const [taskReportsMap, setTaskReportsMap] = useState<Record<number, QualityReport | null>>({});
    const [query] = useState<{ tasks: TasksQuery, quality: QualityQuery } | null>({
        tasks: { pageSize: 'all' },
        quality: { pageSize: 'all' },
    });

    const [displayedTasks, setDisplayedTasks] = useState<Task[]>(tasks);

    useEffect(() => {
        setFetching(true);

        if (!projectId || !projectReportId) {
            setTasks([]);
            setFetching(false);
            return;
        }

        const core = getCore();

        const reportsPromise = core.analytics.quality.reports({
            ...query?.quality || {},
            projectId,
            target: 'task',
            parentId: projectReportId,
            ordering: 'task_id',
        })
            .catch((_error: any) => {
                if (isMounted()) {
                    notification.error({
                        description: _error.toString(),
                        message: "Couldn't fetch project quality reports",
                        className: 'cvat-notification-notice-get-reports-error',
                    });
                }
            });

        const tasksPromise = core.tasks.get({
            ...query?.tasks || {},
            projectId,
            ordering: 'id',
        })
            .catch((_error: any) => {
                if (isMounted()) {
                    notification.error({
                        description: _error.toString(),
                        message: "Couldn't fetch project quality reports",
                        className: 'cvat-notification-notice-get-reports-error',
                    });
                }
            });

        Promise.all([reportsPromise, tasksPromise])
            .then((values: [QualityReport[], Task[]]) => {
                const [fetchedTaskReports, fetchedTasks] = values;
                setTasks(fetchedTasks);

                const newTasksMap: Record<number, Task> = {};
                for (const task of (fetchedTasks || [])) {
                    newTasksMap[task.id] = task;
                }
                setTasksMap(newTasksMap);

                const tasksReportsMap: Record<number, QualityReport | null> = {};
                for (const task of (fetchedTasks || [])) {
                    tasksReportsMap[task.id] = null;
                }
                for (const report of (fetchedTaskReports || [])) {
                    if (report.taskId in tasksReportsMap) {
                        tasksReportsMap[report.taskId] = report;
                    }
                }
                setTaskReportsMap(tasksReportsMap);

                setDisplayedTasks(fetchedTasks);
            })
            .finally(() => {
                if (isMounted()) {
                    setFetching(false);
                }
            });
    }, [projectId, projectReportId, query]);

    function sorter(path: string) {
        return (obj1: any, obj2: any): number => {
            let currentObj1 = obj1;
            let currentObj2 = obj2;
            let field1: string | number | null = null;
            let field2: string | number | null = null;
            for (const pathSegment of path.split('.')) {
                field1 = currentObj1 && pathSegment in currentObj1 ? currentObj1[pathSegment] : null;
                field2 = currentObj2 && pathSegment in currentObj2 ? currentObj2[pathSegment] : null;
                currentObj1 = currentObj1 && pathSegment in currentObj1 ? currentObj1[pathSegment] : null;
                currentObj2 = currentObj2 && pathSegment in currentObj2 ? currentObj2[pathSegment] : null;
            }

            if (field1 !== null && field2 !== null) {
                if (typeof field1 === 'string' && typeof field2 === 'string') return field1.localeCompare(field2);
                if (typeof field1 === 'number' && typeof field2 === 'number' &&
                Number.isFinite(field1) && Number.isFinite(field2)) return field1 - field2;
            }

            if (field1 === null || !Number.isFinite(field1)) {
                return -1;
            }

            return 1;
        };
    }

    function collectUsers(path: string): ColumnFilterItem[] {
        return Array.from<string | null>(
            new Set(
                tasks.map((task: any) => {
                    if (task[path] === null) {
                        return null;
                    }

                    return task[path].username;
                }),
            ),
        ).map((value: string | null) => ({ text: value || 'Is Empty', value: value || false }));
    }

    const columns = [
        {
            title: 'Task',
            dataIndex: 'task',
            key: 'task',
            sorter: sorter('task'),
            render: (id: number): JSX.Element => (
                <div>
                    <Button
                        className='cvat-open-task-button'
                        type='link'
                        onClick={(e: React.MouseEvent): void => {
                            e.preventDefault();
                            history.push(`/tasks/${id}/analytics`);
                        }}
                        href={`/tasks/${id}/analytics`}
                    >
                        {`#${id}`}
                        {`: ${tasksMap[id].name.substring(0, 20) + (tasksMap[id].name.length > 20 ? '...' : '')}` }
                    </Button>
                </div>
            ),
        },
        {
            title: 'Subset',
            dataIndex: 'subset',
            key: 'subset',
            className: 'cvat-task-item-subset',
            render: (taskInstance: any): JSX.Element => {
                const { subset } = taskInstance;

                return (
                    <div>
                        <Text>{subset}</Text>
                    </div>
                );
            },
            sorter: sorter('subset.subset'),
            filters: [
                { text: 'annotation', value: 'annotation' },
                { text: 'validation', value: 'validation' },
                { text: 'acceptance', value: 'acceptance' },
            ],
            onFilter: (value: string | number | boolean, record: any) => record.subset.subset === value,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            className: 'cvat-task-item-status',
            render: (taskInstance: any): JSX.Element => {
                const { status } = taskInstance;

                return (
                    <div>
                        <Text>
                            {status}
                            <br />
                            {taskInstance.progress.completedJobs}
                            {' / '}
                            {taskInstance.progress.totalJobs}
                            {taskInstance.progress.completedJobs ?
                                ` (${percent(taskInstance.progress.completedJobs, taskInstance.progress.totalJobs, 0)})` : ''}
                        </Text>
                    </div>
                );
            },
            sorter: sorter('status.status'),
            filters: [
                { text: 'annotation', value: 'annotation' },
                { text: 'validation', value: 'validation' },
                { text: 'acceptance', value: 'acceptance' },
            ],
            onFilter: (value: string | number | boolean, record: any) => record.status.status === value,
        },
        {
            title: 'Assignee',
            dataIndex: 'assignee',
            key: 'assignee',
            className: 'cvat-task-item-assignee',
            render: (taskInstance: any): JSX.Element => (
                <Text>{taskInstance?.assignee?.username}</Text>
            ),
            sorter: sorter('assignee.assignee.username'),
            filters: collectUsers('assignee'),
            onFilter: (value: string | number | boolean, record: any) => (
                record.assignee.assignee?.username || false
            ) === value,
        },
        {
            title: 'Errors',
            dataIndex: 'errors',
            key: 'errors',
            className: 'cvat-task-item-errors',
            sorter: sorter('errors.summary.errorCount'),
            render: (report: QualityReport): JSX.Element => {
                const errorCount = report?.summary?.errorCount;
                return (
                    <div className='cvat-task-list-item-errors'>
                        <Text>
                            {errorCount || 0}
                            {errorCount ? ` (${percent(errorCount, projectReport?.summary?.errorCount)})` : ''}
                        </Text>
                        <CVATTooltip
                            title={<ConflictsTooltip reportSummary={report?.summary} />}
                            className='cvat-analytics-tooltip'
                            overlayStyle={{ maxWidth: '500px' }}
                        >
                            <QuestionCircleOutlined
                                style={{ opacity: 0.5 }}
                            />
                        </CVATTooltip>
                    </div>
                );
            },
        },
        {
            title: 'Quality',
            dataIndex: 'quality',
            key: 'quality',
            align: 'center' as const,
            className: 'cvat-task-item-quality',
            sorter: sorter('quality.summary.accuracy'),
            render: (report?: QualityReport): JSX.Element => {
                const meanAccuracy = report?.summary?.accuracy;
                const accuracyRepresentation = toRepresentation(meanAccuracy);
                return (
                    accuracyRepresentation.includes('N/A') ? (
                        <Text
                            style={{
                                color: getQualityColor(meanAccuracy),
                            }}
                        >
                            N/A
                        </Text>
                    ) :
                        <Tag color={getQualityColor(meanAccuracy)}>{accuracyRepresentation}</Tag>
                );
            },
        },
        {
            title: 'Download',
            dataIndex: 'download',
            key: 'download',
            className: 'cvat-task-item-quality-report-download',
            align: 'center' as const,
            render: (task: Task): JSX.Element => {
                const report = taskReportsMap[task.id];
                const reportID = report?.id || null;
                return (
                    report ? (
                        <a
                            href={`${getCore().config.backendAPI}/quality/reports/${reportID}/data`}
                            download={`quality-report-task_${task.id}-${reportID}.json`}
                        >
                            <DownloadOutlined />
                        </a>
                    ) : <DownloadOutlined />
                );
            },
        },
    ];

    const data = displayedTasks.reduce((acc: any[], task: Task) => {
        const report = taskReportsMap[task.id];
        acc.push({
            key: task.id,
            task: task.id,
            download: task,
            subset: task,
            status: task,
            assignee: task,
            quality: report || undefined,
            errors: report || undefined,
        });

        return acc;
    }, []);

    return (
        <div className='cvat-quality-task-list'>
            <Row justify='space-between' align='middle'>
                <Col>
                    <Text className='cvat-text-color cvat-tasks-header'> Tasks </Text>
                </Col>
            </Row>
            {
                fetching ? (
                    <CVATLoadingSpinner size='small' />
                ) : (
                    <Table
                        className='cvat-project-tasks-table'
                        rowClassName={() => 'cvat-project-tasks-table-row'}
                        columns={columns}
                        dataSource={data}
                        size='small'
                    />
                )
            }
        </div>
    );
}

export default React.memo(TaskListComponent);
