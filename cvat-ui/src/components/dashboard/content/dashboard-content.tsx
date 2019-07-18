import React, { Component } from 'react';

import { Layout, Empty, Button, Modal, Col, Row } from 'antd';
import Title from 'antd/lib/typography/Title';

import './dashboard-content.scss';

const { Content } = Layout;
const { confirm } = Modal;

interface DashboardContentAction {
  id: number,
  name: string,
  trigger: Function,
}

class DashboardContent extends Component<any, any> {
  hostUrl: string | undefined;
  apiUrl: string | undefined;
  actions: DashboardContentAction[];

  constructor(props: any) {
    super(props);

    this.state = {};
    this.hostUrl = process.env.REACT_APP_API_HOST_URL;
    this.apiUrl = process.env.REACT_APP_API_FULL_URL;

    this.actions = [
      {
        id: 1,
        name: 'Dump annotation',
        trigger: () => {
          this.onDumpAnnotation();
        },
      },
      {
        id: 2,
        name: 'Upload annotation',
        trigger: () => {
          this.onUploadAnnotation();
        },
      },
      {
        id: 3,
        name: 'Update task',
        trigger: (task: any) => {
          this.onUpdateTask(task);
        },
      },
      {
        id: 4,
        name: 'Delete task',
        trigger: (task: any) => {
          this.onDeleteTask(task);
        },
      },
    ];
  }

  render() {
    return(
      <>
        { this.props.tasks.length ? this.renderTasks() : this.renderPlaceholder() }
      </>
    );
  }

  private onDumpAnnotation() {
    console.log('Dump');
  }

  private onUploadAnnotation() {
    console.log('Upload');
  }

  private onUpdateTask(task: any) {
    console.log('Update');
  }

  private onDeleteTask(task: any) {
    const props = this.props;

    confirm({
      title: 'Do you want to delete this task?',
      okText: 'Yes',
      okType: 'danger',
      centered: true,
      onOk() {
        return props.deleteTask(task);
      },
      cancelText: 'No',
      onCancel() {
        return;
      },
    });
  }

  private renderPlaceholder() {
    return (
      <Empty
        className="empty"
        description={
          <span>
            No tasks found...
          </span>
        }
      >
        <Button type="primary">
          Create a new task
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
                    {
                      this.actions.map(
                        (action: DashboardContentAction) => (
                          <Row type="flex" key={ action.id }>
                            <Button type="primary" onClick={ () => action.trigger(task) }>
                              { action.name }
                            </Button>
                          </Row>
                        )
                      )
                    }
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
}

export default DashboardContent;
