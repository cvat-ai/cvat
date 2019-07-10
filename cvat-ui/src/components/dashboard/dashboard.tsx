import React, { Component } from 'react';

import { Layout } from 'antd';

import DashboardHeader from './header/dashboard-header';
import DashboardContent from './content/dashboard-content';
import DashboardFooter from './footer/dashboard-footer';

import './dashboard.scss';

interface DashboardState {
  tasks: [];
}

class Dashboard extends Component<any, DashboardState> {
  constructor(props: any) {
    super(props);

    this.state = { tasks: [] };
  }

  componentDidMount() {
    this.getTasks();
  }

  render() {
    return (
      <Layout>
        <DashboardHeader onSearch={ this.getTasks } />
        <DashboardContent tasks={ this.state.tasks } deleteTask={ this.deleteTask } />
        <DashboardFooter tasksCount={ (this.state.tasks as any)['count'] } onPageChange={ this.onPageChange } />
      </Layout>
    );
  }

  private getTasks = (query?: string) => {
    const queryObject = {
      search: query
    };

    (window as any).cvat.tasks.get(query ? queryObject : {}).then(
      (tasks: any) => {
        this.setState({ tasks });
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
        this.getTasks();
      },
      (error: any) => {
        console.log(error);
      }
    );
  }
}

export default Dashboard;
