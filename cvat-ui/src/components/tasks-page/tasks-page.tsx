import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Spin,
    Modal,
} from 'antd';

import {
    TasksQuery,
} from '../../reducers/interfaces';

import TopBar from './top-bar';
import EmptyListComponent from './empty-list';
import TaskListContainer from '../../containers/tasks-page/tasks-list';

interface TasksPageProps {
    dumpError: any;
    tasksAreBeingFetched: boolean;
    tasksFetchingError: any;
    tasksQuery: TasksQuery;
    numberOfTasks: number;
    numberOfVisibleTasks: number;
    onGetTasks: (query: TasksQuery) => void;
}

class VisibleTasksPage extends React.PureComponent<TasksPageProps & RouteComponentProps> {
    constructor(props: any) {
        super(props);
    }

    private updateURL(query: TasksQuery) {
        let queryString = '?';
        for (const field of Object.keys(query)) {
            if (query[field] !== null) {
                queryString += `${field}=${query[field]}&`;
            }
        }
        this.props.history.replace({
            search: queryString.slice(0, -1),
        });
    }

    private getSearchField(query: TasksQuery): string {
        let searchString = '';
        for (const field of Object.keys(query)) {
            if (query[field] !== null && field !== 'page') {
                if (field === 'search') {
                    return (query[field] as any) as string;
                } else {
                    if (typeof (query[field] === 'number')) {
                        searchString += `${field}:${query[field]} AND `;
                    } else {
                        searchString += `${field}:"${query[field]}" AND `;
                    }
                }
            }
        }

        return searchString.slice(0, -5);
    }

    private handleSearch(value: string): void {
        const query = { ...this.props.tasksQuery };
        const search = value.replace(/\s+/g, ' ').replace(/\s*:+\s*/g, ':').trim();

        const fields = ['name', 'mode', 'owner', 'assignee', 'status', 'id'];
        for (const field of fields) {
            query[field] = null;
        }
        query.search = null;

        let specificRequest = false;
        for (const param of search.split(/[\s]+and[\s]+|[\s]+AND[\s]+/)) {
            if (param.includes(':')) {
                const [name, value] = param.split(':');
                if (fields.includes(name) && !!value) {
                    specificRequest = true;
                    if (name === 'id') {
                        if (Number.isInteger(+value)) {
                            query[name] = +value;
                        }
                    } else {
                        query[name] = value;
                    }
                }
            }
        }

        query.page = 1;
        if (!specificRequest && value) { // only id
            query.search = value;
        }

        this.updateURL(query);
        this.props.onGetTasks(query);
    }

    private handlePagination(page: number): void {
        const query = { ...this.props.tasksQuery };

        query.page = page;
        this.updateURL(query);
        this.props.onGetTasks(query);
    }

    public componentDidMount() {
        const query = { ...this.props.tasksQuery };
        const params = new URLSearchParams(this.props.location.search);

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
            }
        }

        this.updateURL(query);
        this.props.onGetTasks(query);
    }

    public componentDidUpdate() {
        if (this.props.tasksFetchingError) {
            Modal.error({
                title: 'Could not receive tasks',
                content: `${this.props.tasksFetchingError.toString()}`,
            });
        }

        if (this.props.dumpError) {
            Modal.error({
                title: 'Could not dump annotation tasks',
                content: `${this.props.dumpError.toString()}`,
            });;
        }
    }

    public render() {
        if (this.props.tasksAreBeingFetched) {
            return (
                <Spin size='large' style={{margin: '25% 50%'}}/>
            );
        } else {
            return (
                <div className='tasks-page'>
                    <TopBar
                        onSearch={this.handleSearch.bind(this)}
                        searchValue={this.getSearchField(this.props.tasksQuery)}
                    />
                    {this.props.numberOfVisibleTasks ?
                        <TaskListContainer
                            onPageChange={this.handlePagination.bind(this)}
                        /> : <EmptyListComponent/>}
                </div>
            )
        }
    }
}

export default withRouter(VisibleTasksPage);