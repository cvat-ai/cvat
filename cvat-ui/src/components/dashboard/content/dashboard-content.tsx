import React, { Component } from 'react';

import { Layout, Empty, Button, Col, Row } from 'antd';

import './dashboard-content.scss';

const { Content } = Layout;

interface DashboardContentAction {
  id: number,
  name: string,
  trigger: Function,
}

class DashboardContent extends Component<any, any> {
  hostUrl: string;
  apiUrl: string;
  actions: DashboardContentAction[];

  constructor(props: any) {
    super(props);

    this.state = {};
    this.hostUrl = 'http://localhost:7000';
    this.apiUrl = 'http://localhost:7000/api/v1';

    this.actions = [
      // {
      //   id: 1,
      //   name: 'Dump annotation',
      //   trigger: () => {},
      // },
      // {
      //   id: 2,
      //   name: 'Upload annotation',
      //   trigger: () => {},
      // },
      // {
      //   id: 3,
      //   name: 'Update task',
      //   trigger: () => {},
      // },
      {
        id: 4,
        name: 'Delete task',
        trigger: (task: any) => {
          this.props.deleteTask(task);
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

  private renderPlaceholder() {
    return (
      <Empty
        description={
          <span>
            No tasks in this workspace yet...
          </span>
        }
      >
        <Button type="primary">Create a new task</Button>
      </Empty>
    )
  }

  private renderTasks() {
    return(
      <Content>
        {
          this.props.tasks.map(
            (task: any) => (
              <div className="dashboard-content-сard" key={ task.id }>
                <Row className="dashboard-content-сard__header" type="flex">
                  <Col span={24}>
                    <h2>{ `${task.name}: ${task.mode}` }</h2>
                  </Col>
                </Row>

                <Row className="dashboard-content-сard__content" type="flex">
                  <Col className="card-cover" span={8}>
                    <img alt="Task cover" src={ `${this.apiUrl}/tasks/${task.id}/frames/0` } />
                  </Col>

                  <Col className="сard-actions" span={8}>
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
                    Jobs
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
