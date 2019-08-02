import React, { Component } from 'react';

import { withRouter } from 'react-router-dom';

import { connect } from 'react-redux';
import { createTaskAsync, updateTaskAsync, deleteTaskAsync } from '../../../actions/tasks.actions';

import { Layout, Empty, Button, Modal, Col, Row } from 'antd';
import Title from 'antd/lib/typography/Title';

import TaskUpdateForm from '../../modals/task-update/task-update';
import TaskCreateForm from '../../modals/task-create/task-create';

import { deserializeLabels } from '../../../utils/labels';

import './dashboard-content.scss';


const { Content } = Layout;
const { confirm } = Modal;

class DashboardContent extends Component<any, any> {
  hostUrl: string | undefined;
  apiUrl: string | undefined;

  createFormRef: any;
  updateFormRef: any;

  constructor(props: any) {
    super(props);

    this.state = {};
    this.hostUrl = process.env.REACT_APP_API_HOST_URL;
    this.apiUrl = process.env.REACT_APP_API_FULL_URL;
  }

  render() {
    return(
      <>
        { this.props.tasks.length ? this.renderTasks() : this.renderPlaceholder() }
      </>
    );
  }

  private renderPlaceholder() {
    return (
      <Empty className="empty" description="No tasks found...">
        <Button type="primary" onClick={ this.onCreateTask }>
          Create task
        </Button>
      </Empty>
    )
  }

  private renderTasks() {
    return(
      <Content className="dashboard-content">
        {
          this.props.tasks.map(
            (task: any) => (
              <div className="dashboard-content-сard" key={ task.id }>
                <Row className="dashboard-content-сard__header" type="flex">
                  <Col span={24}>
                    <Title level={2}>{ `${task.name}: ${task.mode}` }</Title>
                  </Col>
                </Row>

                <Row className="dashboard-content-сard__content" type="flex">
                  <Col className="card-cover" span={8}>
                    <img alt="Task cover" src={ `${this.apiUrl}/tasks/${task.id}/frames/0` } />
                  </Col>

                  <Col className="card-actions" span={8}>
                    <Row type="flex">
                      <Button type="primary" onClick={ this.onDumpAnnotation }>
                        Dump annotation
                      </Button>
                    </Row>
                    <Row type="flex">
                      <Button type="primary" onClick={ this.onUploadAnnotation }>
                        Upload annotation
                      </Button>
                    </Row>
                    <Row type="flex">
                      <Button type="primary" onClick={ () => this.onUpdateTask(task) }>
                        Update task
                      </Button>
                    </Row>
                    <Row type="flex">
                      <Button type="primary" onClick={ () => this.onDeleteTask(task) }>
                        Delete task
                      </Button>
                    </Row>
                  </Col>

                  <Col className="сard-jobs" span={8}>
                    <Title level={3}>Jobs</Title>
                    {
                      task.jobs.map(
                        (job: any) => (
                          <Row type="flex" key={ job.id }>
                            <a href={`${this.hostUrl}?id=${job.id}`}>{`${this.hostUrl}?id=${job.id}`}</a>
                          </Row>
                        )
                      )
                    }
                  </Col>
                </Row>
              </div>
            )
          )
        }
      </Content>
    );
  }

  private setTaskCreateFormRef = (ref: any) => {
    this.createFormRef = ref;
  }

  private setTaskUpdateFormRef = (ref: any) => {
    this.updateFormRef = ref;
  }

  private onCreateTask = () => {
    confirm({
      title: 'Create new task',
      content: <TaskCreateForm ref={ this.setTaskCreateFormRef } />,
      centered: true,
      okText: 'Create',
      okType: 'primary',
      onOk: (closeFunction: Function) => {
        this.createFormRef.validateFields((error: any, values: any) => {
          if (!error) {
            const newTask = new (window as any).cvat.classes.Task({name: 'test', image_quality: 50});
            debugger;
            this.props.dispatch(createTaskAsync(newTask)).then(closeFunction());
          }
        });
      },
      onCancel: () => {
        return;
      },
    });
  }

  private onUpdateTask = (task: any) => {
    confirm({
      title: 'Update task',
      content: <TaskUpdateForm task={ task } ref={ this.setTaskUpdateFormRef } />,
      centered: true,
      okText: 'Update',
      okType: 'primary',
      onOk: (closeFunction: Function) => {
        this.updateFormRef.validateFields((error: any, values: any) => {
          if (!error) {
            const deserializedLabels = deserializeLabels(values.newLabels);
            const newLabels = deserializedLabels.map(label => new (window as any).cvat.classes.Label(label));
            task.labels = newLabels;
            this.props.dispatch(updateTaskAsync(task)).then(closeFunction());
          } else {
            return;
          }
        });
      },
      onCancel: () => {
        return;
      },
    });
  }

  private onDeleteTask = (task: any) => {
    confirm({
      title: 'Do you want to delete this task?',
      okText: 'Yes',
      okType: 'danger',
      centered: true,
      autoFocusButton: 'cancel',
      onOk: () => {
        return this.props.dispatch(deleteTaskAsync(task, this.props.history));
      },
      cancelText: 'No',
      onCancel: () => {
        return;
      },
    });
  }

  private onDumpAnnotation = () => {
    console.log('Dump annotation');
  }

  private onUploadAnnotation = () => {
    console.log('Upload annotation');
  }
}

const mapStateToProps = (state: any) => {
  return state.tasks;
};

export default withRouter(connect(mapStateToProps)(DashboardContent) as any);
