import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Spin,
} from 'antd';

import {
    TasksQuery,
} from '../../reducers/interfaces';

import TopBar from './top-bar';
import EmptyListComponent from './empty-list';
import TaskListContainer from '../../containers/tasks-page/tasks-list';

interface TasksPageProps {
    tasksFetching: boolean;
    gettingQuery: TasksQuery;
    numberOfTasks: number;
    numberOfVisibleTasks: number;
    onGetTasks: (gettingQuery: TasksQuery) => void;
}

function getSearchField(gettingQuery: TasksQuery): string {
    let searchString = '';
    for (const field of Object.keys(gettingQuery)) {
        if (gettingQuery[field] !== null && field !== 'page') {
            if (field === 'search') {
                return (gettingQuery[field] as any) as string;
            }

            // not constant condition
            // eslint-disable-next-line
            if (typeof (gettingQuery[field] === 'number')) {
                searchString += `${field}:${gettingQuery[field]} AND `;
            } else {
                searchString += `${field}:"${gettingQuery[field]}" AND `;
            }
        }
    }

    return searchString.slice(0, -5);
}

class TasksPageComponent extends React.PureComponent<TasksPageProps & RouteComponentProps> {
    public componentDidMount(): void {
        const {
            gettingQuery,
            location,
            onGetTasks,
        } = this.props;
        const params = new URLSearchParams(location.search);

        const query = { ...gettingQuery };
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

        this.updateURL(query);
        onGetTasks(query);
    }

    private handleSearch = (value: string): void => {
        const {
            gettingQuery,
            onGetTasks,
        } = this.props;

        const query = { ...gettingQuery };
        const search = value.replace(/\s+/g, ' ').replace(/\s*:+\s*/g, ':').trim();

        const fields = ['name', 'mode', 'owner', 'assignee', 'status', 'id'];
        for (const field of fields) {
            query[field] = null;
        }
        query.search = null;

        let specificRequest = false;
        for (const param of search.split(/[\s]+and[\s]+|[\s]+AND[\s]+/)) {
            if (param.includes(':')) {
                const [field, fieldValue] = param.split(':');
                if (fields.includes(field) && !!fieldValue) {
                    specificRequest = true;
                    if (field === 'id') {
                        if (Number.isInteger(+fieldValue)) {
                            query[field] = +fieldValue;
                        }
                    } else {
                        query[field] = fieldValue;
                    }
                }
            }
        }

        query.page = 1;
        if (!specificRequest && value) { // only id
            query.search = value;
        }

        this.updateURL(query);
        onGetTasks(query);
    };

    private handlePagination = (page: number): void => {
        const {
            gettingQuery,
            onGetTasks,
        } = this.props;
        const query = { ...gettingQuery };

        query.page = page;
        this.updateURL(query);
        onGetTasks(query);
    };

    private updateURL(gettingQuery: TasksQuery): void {
        const { history } = this.props;
        let queryString = '?';
        for (const field of Object.keys(gettingQuery)) {
            if (gettingQuery[field] !== null) {
                queryString += `${field}=${gettingQuery[field]}&`;
            }
        }
        history.replace({
            search: queryString.slice(0, -1),
        });
    }

    public render(): JSX.Element {
        const {
            tasksFetching,
            gettingQuery,
            numberOfVisibleTasks,
        } = this.props;

        if (tasksFetching) {
            return (
                <Spin size='large' style={{ margin: '25% 45%' }} />
            );
        }

        return (
            <div className='cvat-tasks-page'>
                <TopBar
                    onSearch={this.handleSearch}
                    searchValue={getSearchField(gettingQuery)}
                />
                {numberOfVisibleTasks
                    ? (
                        <TaskListContainer
                            onSwitchPage={this.handlePagination}
                        />
                    ) : <EmptyListComponent />
                }
            </div>
        );
    }
}

export default withRouter(TasksPageComponent);
