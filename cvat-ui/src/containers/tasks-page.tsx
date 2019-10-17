import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
    Button,
    Input,
    Spin,
    Modal,
} from 'antd';

import { TasksState, TasksQuery } from '../reducers/interfaces';
import EmptyList from '../components/tasks-page/empty-list';
import TaskList from '../components/tasks-page/task-list';

import { getTasksAsync } from '../actions/tasks-actions';

interface StateToProps {
    tasks: TasksState;
}

interface DispatchToProps {
    getTasks: (query: TasksQuery) => void;
}

interface TasksPageState {
    searchString: string;
}

function mapStateToProps(state: any): object {
    return {
        tasks: state.tasks,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTasks: (query: TasksQuery) => {dispatch(getTasksAsync(query))}
    }
}

type TasksPageProps = StateToProps & DispatchToProps
    & RouteComponentProps;

class TasksPage extends React.PureComponent<TasksPageProps, TasksPageState> {
    constructor(props: any) {
        super(props);
    }

    private updateURL(query: TasksQuery) {
        let queryString = '?';
        for (const field of Object.keys(query)) {
            if (query[field] != null && field !== 'page') {
                queryString += `${field}=${query[field]}&`;
            }
        }
        this.props.history.replace({
            search: queryString.slice(0, -1),
        });
    }

    private computeSearchField(query: TasksQuery): string {
        let searchString = '';
        for (const field of Object.keys(query)) {

            if (query[field] != null && field !== 'page') {
                if (typeof (query[field] === 'number')) {
                    searchString += `${field}:${query[field]} AND `;
                } else {
                    searchString += `${field}:"${query[field]}" AND `;
                }
            }
        }

        return searchString.slice(0, -5);
    }

    private handlePagination(page: number): void {
        const query = { ...this.props.tasks.query };

        query.page = page;
        this.updateURL(query);
        this.props.getTasks(query);
    }

    private handleSearch(value: string): void {
        const query = { ...this.props.tasks.query };
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
        this.props.getTasks(query);
    }

    public componentDidMount() {
        const query = { ...this.props.tasks.query };
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
        this.props.getTasks(query);
    }

    private renderTaskList() {
        const searchString = this.computeSearchField(this.props.tasks.query);

        const List = this.props.tasks.array.length ? <TaskList
            tasks={this.props.tasks.array}
            previews={this.props.tasks.previews}
            page={this.props.tasks.query.page}
            count={this.props.tasks.count}
            goToPage={this.handlePagination.bind(this)}
        /> : <EmptyList/>

        if (this.props.tasks.error) {
            Modal.error({
                title: 'Could not receive tasks',
                content: `${this.props.tasks.error.toString()}`,
            });
        }

        return (
            <div className='tasks-page'>
                <Row type='flex' justify='center' align='middle'>
                    <Col md={22} lg={18} xl={16} xxl={14}>
                        <Text strong> Default project </Text>
                    </Col>
                </Row>
                <Row type='flex' justify='center' align='middle'>
                    <Col md={11} lg={9} xl={8} xxl={7}>
                        <Text className='cvat-title'> Tasks </Text>
                        <Input.Search
                            defaultValue={searchString}
                            onSearch={this.handleSearch.bind(this)}
                            size='large' placeholder='Search'
                        />
                    </Col>
                    <Col
                        md={{span: 11}}
                        lg={{span: 9}}
                        xl={{span: 8}}
                        xxl={{span: 7}}>
                        <Button size='large' id='cvat-create-task-button' type='primary' onClick={
                            () => window.open('/tasks/create', '_blank')
                        }> Create new task </Button>
                    </Col>
                </Row>
                {List}
            </div>
        )
    }

    public render() {
        if (this.props.tasks.initialized) {
            return this.renderTaskList();
        } else {
            return (
                <Spin size='large' style={{margin: '25% 50%'}}/>
            );
        }
    }
}

export default withRouter(connect(
    mapStateToProps,
    mapDispatchToProps,
)(TasksPage));
