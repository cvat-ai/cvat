import React, { Component } from 'react';

import { withRouter } from 'react-router-dom';

import { connect } from 'react-redux';
import { createTaskAsync } from '../../../actions/tasks.actions';

import { Modal, Layout, Row, Col, Button, Input } from 'antd';
import Title from 'antd/lib/typography/Title';

import TaskCreateForm from '../../modals/task-create/task-create';

import { taskDTO } from '../../../utils/tasks-dto';

import './dashboard-header.scss';


const { Header } = Layout;
const { Search } = Input;

class DashboardHeader extends Component<any, any> {
  hostUrl: string | undefined;

  createFormRef: any;

  constructor(props: any) {
    super(props);

    this.state = { searchQuery: this.props.searchQuery };

    this.hostUrl = process.env.REACT_APP_API_HOST_URL;
  }

  componentDidUpdate(prevProps: any) {
    if (this.props.searchQuery !== prevProps.searchQuery) {
      this.setState({ searchQuery: this.props.searchQuery });
    }
  }

  render() {
    return(
      <Header className="dashboard-header">
        <Row type="flex" gutter={16}>
          <Col className="dashboard-header__logo" span={8}>
            <Title className="logo">Tasks</Title>
          </Col>
          <Col className="dashboard-header__search" span={8}>
            <Search
              className="search"
              placeholder="Search for tasks"
              value={ this.state.searchQuery }
              onChange={ this.onValueChange }
              onSearch={ query => this.onSearch(query) }
              enterButton>
            </Search>
          </Col>
          <Col className="dashboard-header__actions" span={8}>
            <Button
              className="action"
              type="primary"
              onClick={ this.onCreateTask }>
              Create task
            </Button>
            <Button
              className="action"
              type="primary"
              href={ `${this.hostUrl}/documentation/user_guide.html` }
              target="blank">
              User guide
            </Button>
          </Col>
        </Row>
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

export default withRouter(connect(mapStateToProps)(DashboardHeader) as any);
