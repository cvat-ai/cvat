import React, { Component } from 'react';

import { Layout } from 'antd';

import DashboardHeader from './header/dashboard-header';
import DashboardContent from './content/dashboard-content';
import DashboardFooter from './footer/dashboard-footer';

import './dashboard.scss';

interface DashboardState {
  tasks: [];
  tasksCount: number;
}

class Dashboard extends Component<any, DashboardState> {
  constructor(props: any) {
    super(props);

    this.state = { tasks: [], tasksCount: 0 };
  }

  componentDidMount() {
    this.getTasks();
  }

  render() {
    return (
      <Layout>
        <DashboardHeader onSearch={ this.getTasks } />
        <DashboardContent tasks={ this.state.tasks } deleteTask={ this.deleteTask } />
        <DashboardFooter tasksCount={ this.state.tasksCount } onPageChange={ this.onPageChange } />
      </Layout>
    );
  }

  private getTasks = (query?: string) => {
    const queryObject = {
      search: query
    };

    (window as any).cvat.tasks.get(query ? queryObject : {}).then(
      (tasks: any) => {
        this.setState({ tasks, tasksCount: tasks.count });
      },
      (error: any) => {
        console.log(error);
      }
    );
  }

  private onPageChange = (page: number) => {
    (window as any).cvat.tasks.get({ page }).then(
      (tasks: any) => {
        this.setState({ tasks });
      },
      (error: any) => {
        console.log(error);
      }
    );
  }

  private deleteTask = (task: any) => {
    task.delete().then(
      (_deleted: any) => {
        setTimeout(() => {

          this.getTasks();
        }, 1000);
        // const tasks = this.state.tasks.filter((taskToDelete: any) => taskToDelete.id !== task.id) as any;

        // this.setState({ tasks, tasksCount: this.state.tasksCount - 1 });
      },
      (error: any) => {
        console.log(error);
      }
    );
  }
}

export default Dashboard;
