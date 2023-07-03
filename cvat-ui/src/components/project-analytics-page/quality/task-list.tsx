// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

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
import { QualityQuery, TasksQuery } from 'reducers';
import { getQualityColor } from 'utils/quality-color';
import Tag from 'antd/lib/tag';
import { ConflictsTooltip } from './conflicts-summary';
import { useIsMounted } from 'utils/hooks';
import { percent, toRepresentation } from '../../../utils/quality-common';

interface Props {
    projectId: number;
    projectReportId: number | null;
}

function TaskListComponent(props: Props): JSX.Element {
    const { projectId, projectReportId } = props;

    const history = useHistory();
    const isMounted = useIsMounted();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskReports, setTaskReports] = useState<QualityReport[]>([]);
    const [tasksMap, setTasksMap] = useState<Record<number, Task>>({});
    const [taskReportsMap, setTaskReportsMap] = useState<Record<number, QualityReport | null>>({});
    const [query, setQuery] = useState<{tasks: TasksQuery, quality: QualityQuery} | null>(null);

    const [displayedTasks, setDisplayedTasks] = useState<Task[]>(tasks);

    useEffect(() => {
        if (!projectId || !projectReportId) {
            setTaskReports([]);
            setTasks([]);
            return;
        }

        const core = getCore();

        /* TODO: implement pagination / caching / prefetch */

        const reportsPromise = core.analytics.quality.reports({
            ...query?.quality || {},
            projectId: projectId,
            target: 'task',
            parentId: projectReportId,
        })
            .catch((_error: any) => {
                if (isMounted()) {
                    notification.error({
                        description: _error.toString(),
                        message: "Couldn't fetch project quality reports",
                        className: 'cvat-notification-notice-get-reports-error',
                    });
                }
            })

        const tasksPromise = core.tasks.get({
            ...query?.tasks || {},
            projectId: projectId,
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
                const [taskReports, tasks] = values;
                setTaskReports(taskReports);
                setTasks(tasks);

                const tasksMap: Record<number, Task> = {};
                for (const task of (tasks || [])) {
                    tasksMap[task.id] = task;
                }
                setTasksMap(tasksMap);

                const tasksReportsMap: Record<number, QualityReport | null> = {};
                for (const task of (tasks || [])) {
                    tasksReportsMap[task.id] = null;
                }
                for (const report of (taskReports || [])) {
                    if (report.taskId in tasksReportsMap) {
                        tasksReportsMap[report.taskId] = report;
                    }
                }
                setTaskReportsMap(tasksReportsMap);

                setDisplayedTasks(tasks);
            })
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
                return 1;
            }

            return -1;
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
                        {`#${id}`}{`: ${tasksMap[id].name}` /* TODO: restrict maximum length */ }
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
                            {taskInstance.progress.completedJobs} / {taskInstance.progress.totalJobs} ({percent(taskInstance.progress.completedJobs, taskInstance.progress.totalJobs, 0)})
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
            quality: report || 'N/A',
            errors: report || 'N/A',
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
            <Table
                className='cvat-project-tasks-table'
                rowClassName={() => 'cvat-project-tasks-table-row'}
                columns={columns}
                dataSource={data}
                size='small'
            />
        </div>
    );
}

export default React.memo(TaskListComponent);
