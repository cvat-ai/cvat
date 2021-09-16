// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import Spin from 'antd/lib/spin';
import Button from 'antd/lib/button';
import message from 'antd/lib/message';
import Text from 'antd/lib/typography/Text';

import { TasksQuery } from 'reducers/interfaces';
import FeedbackComponent from 'components/feedback/feedback';
import TaskListContainer from 'containers/tasks-page/tasks-list';
import ExportDatasetModal from 'components/export-dataset/export-dataset-modal';
import TopBar from './top-bar';
import EmptyListComponent from './empty-list';

interface TasksPageProps {
    tasksFetching: boolean;
    gettingQuery: TasksQuery;
    numberOfTasks: number;
    numberOfVisibleTasks: number;
    numberOfHiddenTasks: number;
    onGetTasks: (gettingQuery: TasksQuery) => void;
    hideEmptyTasks: (hideEmpty: boolean) => void;
    onImportTask: (file: File) => void;
    taskImporting: boolean;
}

function updateQuery(previousQuery: TasksQuery, searchString: string): TasksQuery {
    const params = new URLSearchParams(searchString);
    const query = { ...previousQuery };
    for (const field of Object.keys(query)) {
        if (params.has(field)) {
            const value = params.get(field);
            if (value) {
                if (field === 'id' || field === 'page') {
                    if (Number.isInteger(+value)) {
                        query[field] = +value;
                    }
                } else {
                    query[field] = value;
                }
            }
        } else if (field === 'page') {
            query[field] = 1;
        } else {
            query[field] = null;
        }
    }

    return query;
}

class TasksPageComponent extends React.PureComponent<TasksPageProps & RouteComponentProps> {
    public componentDidMount(): void {
        const { gettingQuery, location, onGetTasks } = this.props;
        const query = updateQuery(gettingQuery, location.search);
        onGetTasks(query);
    }

    public componentDidUpdate(prevProps: TasksPageProps & RouteComponentProps): void {
        const {
            location,
            gettingQuery,
            tasksFetching,
            numberOfHiddenTasks,
            onGetTasks,
            hideEmptyTasks,
            taskImporting,
        } = this.props;

        if (
            prevProps.location.search !== location.search ||
            (prevProps.taskImporting === true && taskImporting === false)
        ) {
            // get new tasks if any query changes
            const query = updateQuery(gettingQuery, location.search);
            message.destroy();
            onGetTasks(query);
            return;
        }

        if (prevProps.tasksFetching && !tasksFetching) {
            if (numberOfHiddenTasks) {
                message.destroy();
                message.info(
                    <>
                        <Text>Some tasks are temporary hidden since they are without any data</Text>
                        <Button
                            type='link'
                            onClick={(): void => {
                                hideEmptyTasks(false);
                                message.destroy();
                            }}
                        >
                            Show all
                        </Button>
                    </>,
                    5,
                );
            }
        }
    }

    private handlePagination = (page: number): void => {
        const { gettingQuery } = this.props;

        // modify query object
        const query = { ...gettingQuery };
        query.page = page;

        // update url according to new query object
        this.updateURL(query);
    };

    private updateURL = (gettingQuery: TasksQuery): void => {
        const { history } = this.props;
        let queryString = '?';
        for (const field of Object.keys(gettingQuery)) {
            if (gettingQuery[field] !== null) {
                queryString += `${field}=${gettingQuery[field]}&`;
            }
        }

        const oldQueryString = history.location.search;
        if (oldQueryString !== queryString) {
            history.push({
                search: queryString.slice(0, -1),
            });

            // force update if any changes
            this.forceUpdate();
        }
    };

    public render(): JSX.Element {
        const {
            tasksFetching, gettingQuery, numberOfVisibleTasks, onImportTask, taskImporting,
        } = this.props;

        if (tasksFetching) {
            return <Spin size='large' className='cvat-spinner' />;
        }

        return (
            <div className='cvat-tasks-page'>
                <TopBar
                    onSearch={this.updateURL}
                    query={gettingQuery}
                    onFileUpload={onImportTask}
                    taskImporting={taskImporting}
                />
                {numberOfVisibleTasks ? (
                    <TaskListContainer onSwitchPage={this.handlePagination} />
                ) : (
                    <EmptyListComponent />
                )}
                <FeedbackComponent />
                <ExportDatasetModal />
            </div>
        );
    }
}

export default withRouter(TasksPageComponent);
