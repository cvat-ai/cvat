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
    dumpingError: string;
    loadingError: string;
    tasksFetchingError: string;
    loadingDoneMessage: string;
    tasksAreBeingFetched: boolean;
    gettingQuery: TasksQuery;
    numberOfTasks: number;
    numberOfVisibleTasks: number;
    onGetTasks: (gettingQuery: TasksQuery) => void;
}

class TasksPageComponent extends React.PureComponent<TasksPageProps & RouteComponentProps> {
    constructor(props: any) {
        super(props);
    }

    private updateURL(gettingQuery: TasksQuery) {
        let queryString = '?';
        for (const field of Object.keys(gettingQuery)) {
            if (gettingQuery[field] !== null) {
                queryString += `${field}=${gettingQuery[field]}&`;
            }
        }
        this.props.history.replace({
            search: queryString.slice(0, -1),
        });
    }

    private getSearchField(gettingQuery: TasksQuery): string {
        let searchString = '';
        for (const field of Object.keys(gettingQuery)) {
            if (gettingQuery[field] !== null && field !== 'page') {
                if (field === 'search') {
                    return (gettingQuery[field] as any) as string;
                } else {
                    if (typeof (gettingQuery[field] === 'number')) {
                        searchString += `${field}:${gettingQuery[field]} AND `;
                    } else {
                        searchString += `${field}:"${gettingQuery[field]}" AND `;
                    }
                }
            }
        }

        return searchString.slice(0, -5);
    }

    private handleSearch = (value: string): void => {
        const gettingQuery = { ...this.props.gettingQuery };
        const search = value.replace(/\s+/g, ' ').replace(/\s*:+\s*/g, ':').trim();

        const fields = ['name', 'mode', 'owner', 'assignee', 'status', 'id'];
        for (const field of fields) {
            gettingQuery[field] = null;
        }
        gettingQuery.search = null;

        let specificRequest = false;
        for (const param of search.split(/[\s]+and[\s]+|[\s]+AND[\s]+/)) {
            if (param.includes(':')) {
                const [name, value] = param.split(':');
                if (fields.includes(name) && !!value) {
                    specificRequest = true;
                    if (name === 'id') {
                        if (Number.isInteger(+value)) {
                            gettingQuery[name] = +value;
                        }
                    } else {
                        gettingQuery[name] = value;
                    }
                }
            }
        }

        gettingQuery.page = 1;
        if (!specificRequest && value) { // only id
            gettingQuery.search = value;
        }

        this.updateURL(gettingQuery);
        this.props.onGetTasks(gettingQuery);
    }

    private handlePagination = (page: number): void => {
        const gettingQuery = { ...this.props.gettingQuery };

        gettingQuery.page = page;
        this.updateURL(gettingQuery);
        this.props.onGetTasks(gettingQuery);
    }

    public componentDidMount() {
        const gettingQuery = { ...this.props.gettingQuery };
        const params = new URLSearchParams(this.props.location.search);

        for (const field of Object.keys(gettingQuery)) {
            if (params.has(field)) {
                const value = params.get(field);
                if (value) {
                    if (field === 'id' || field === 'page') {
                        if (Number.isInteger(+value)) {
                            gettingQuery[field] = +value;
                        }
                    } else {
                        gettingQuery[field] = value;
                    }
                }
            }
        }

        this.updateURL(gettingQuery);
        this.props.onGetTasks(gettingQuery);
    }

    public componentDidUpdate() {
        if (this.props.tasksFetchingError) {
            Modal.error({
                title: 'Could not receive tasks',
                content: this.props.tasksFetchingError,
            });
        }

        if (this.props.dumpingError) {
            Modal.error({
                title: 'Could not dump annotations',
                content: this.props.dumpingError,
            });;
        }

        if (this.props.loadingError) {
            Modal.error({
                title: 'Could not load annotations',
                content: this.props.loadingError,
            });;
        }

        if (this.props.loadingDoneMessage) {
            Modal.info({
                title: 'Successful loading of annotations',
                content: this.props.loadingDoneMessage,
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
                        onSearch={this.handleSearch}
                        searchValue={this.getSearchField(this.props.gettingQuery)}
                    />
                    {this.props.numberOfVisibleTasks ?
                        <TaskListContainer
                            onSwitchPage={this.handlePagination}
                        /> : <EmptyListComponent/>}
                </div>
            )
        }
    }
}

export default withRouter(TasksPageComponent);