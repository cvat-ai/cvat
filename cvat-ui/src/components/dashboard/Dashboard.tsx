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
        <DashboardHeader onSearch={ this.getTasks }/>
        <DashboardContent tasks={ this.state.tasks } />
        <DashboardFooter />
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
}

export default Dashboard;
