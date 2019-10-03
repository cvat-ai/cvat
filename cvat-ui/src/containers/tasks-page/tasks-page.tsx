import React from 'react';
import { connect } from 'react-redux';

import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
    Button,
    Input,
    Spin,
} from 'antd';

import { TasksState, TasksQuery } from '../../reducers/interfaces';
import EmptyList from '../../components/tasks-page/empty-list';
import TaskList from '../../components/tasks-page/task-list';

import { getTasksAsync } from '../../actions/tasks-actions';

interface StateToProps {
    tasks: TasksState;
}

interface DispatchToProps {
    getTasks: (query: TasksQuery) => void;
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

type TasksPageProps = StateToProps & DispatchToProps;

class TasksPage extends React.PureComponent<TasksPageProps> {
    constructor(props: any) {
        super(props);
    }

    public componentDidMount() {
        // TODO: Parse filter from URL
        this.props.getTasks(this.props.tasks.query);
    }

    public componentDidUpdated() {
        // TODO:
        // set new url queries
        // put text into search
    }

    public render() {
        //this.props.tasks.array.length = 0;
        if (this.props.tasks.initialized) {
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
                            <Input.Search size='large' placeholder='Search'/>
                        </Col>
                        <Col
                            md={{span: 11}}
                            lg={{span: 9}}
                            xl={{span: 8}}
                            xxl={{span: 7}}>
                            <Button size='large' id='create-task-button' type='primary' onClick={
                                () => window.open('/tasks/create', '_blank')
                            }> Create new task </Button>
                        </Col>
                    </Row>
                    {this.props.tasks.array.length ? <TaskList
                        tasks={this.props.tasks.array}
                        page={this.props.tasks.query.page}
                        count={this.props.tasks.count}
                        goToPage={(page) => {console.log(page)}}
                        // TODO: implement async events: go to page, dump, run tf annotation, run auto annotation, upload, open bug tracker
                    /> : <EmptyList/>}
                </div>
            )
        } else {
            return (
                <Spin size="large" style={{margin: '25% 50%'}}/>
            );
        }
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TasksPage);
