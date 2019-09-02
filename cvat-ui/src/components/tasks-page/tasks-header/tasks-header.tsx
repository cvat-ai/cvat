import React, { Component } from 'react';

import { withRouter } from 'react-router-dom';

import { connect } from 'react-redux';
import { createTaskAsync } from '../../../actions/tasks.actions';

import { Modal, Layout, Col, Button, Input } from 'antd';
import Title from 'antd/lib/typography/Title';

import TaskCreateForm from '../../modals/task-create/task-create';

import { taskDTO } from '../../../utils/tasks-dto';

import './tasks-header.scss';


const { Header } = Layout;
const { Search } = Input;

class TasksHeader extends Component<any, any> {
  createFormRef: any;

  constructor(props: any) {
    super(props);

    this.state = { searchQuery: this.props.searchQuery };
  }

  componentDidUpdate(prevProps: any) {
    if (this.props.searchQuery !== prevProps.searchQuery) {
      this.setState({ searchQuery: this.props.searchQuery });
    }
  }

  render() {
    return(
      <Header className="tasks-header">
        <Col className="tasks-header__logo" span={3}>
          <Title className="logo">Tasks</Title>
        </Col>
        <Col className="tasks-header__search" span={6}>
          <Search
            className="search"
            size="large"
            placeholder="Search"
            value={ this.state.searchQuery }
            onChange={ this.onValueChange }
            onSearch={ query => this.onSearch(query) }>
          </Search>
        </Col>
        <Col className="tasks-header__actions" span={15}>
          <Button
            className="action"
            size="large"
            type="primary"
            onClick={ this.onCreateTask }>
            Create task
          </Button>
        </Col>
      </Header>
    );
  }

  private setTaskCreateFormRef = (ref: any) => {
    this.createFormRef = ref;
  }

  private onCreateTask = () => {
    Modal.confirm({
      title: 'Create new task',
      content: <TaskCreateForm ref={ this.setTaskCreateFormRef }/>,
      centered: true,
      className: 'crud-modal',
      okText: 'Create',
      okType: 'primary',
      onOk: (closeFunction: Function) => {
        return new Promise((resolve, reject) => {
          this.createFormRef.validateFields((error: any, values: any) => {
            if (!error) {
              const newTask = taskDTO(values);

              this.props.dispatch(createTaskAsync(newTask)).then(
                (data: any) => {
                  resolve(data);
                  closeFunction();
                },
                (error: any) => {
                  reject(error);
                  Modal.error({ title: error.message, centered: true, okType: 'danger' })
                }
              );
            } else {
              reject(error);
            }
          });
        });
      },
      onCancel: () => {
        return;
      },
    });
  }

  private onValueChange = (event: any) => {
    this.setState({ searchQuery: event.target.value });
  }

  private onSearch = (query: string) => {
    if (query !== this.props.searchQuery) {
      query ? this.props.history.push(`?search=${query}`) : this.props.history.push(this.props.location.pathname);
    }
  }
}

const mapStateToProps = (state: any) => {
  return { ...state.tasks, ...state.tasksFilter };
};

export default withRouter(connect(mapStateToProps)(TasksHeader) as any);
