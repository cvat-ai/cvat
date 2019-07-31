import React, { PureComponent } from 'react';
import { Location, Action } from 'history';

import * as queryString from 'query-string';

import setQueryObject from '../../utils/tasks-filter-dto'

import { connect } from 'react-redux';
import { getTasksAsync } from '../../actions/tasks.actions';
import { filterTasks } from '../../actions/tasks-filter.actions';

import { Layout } from 'antd';

import DashboardHeader from './header/dashboard-header';
import DashboardContent from './content/dashboard-content';
import DashboardFooter from './footer/dashboard-footer';

import './dashboard-page.scss';


class Dashboard extends PureComponent<any, any> {
  componentDidMount() {
    this.loadTasks(this.props.location.search);

    this.props.history.listen((location: Location, action: Action) => {
      this.loadTasks(location.search);
    });
  }

  render() {
    return (
      <Layout className="layout">
        <DashboardHeader />
        <DashboardContent />
        <DashboardFooter />
      </Layout>
    );
  }

  private loadTasks = (params: any) => {
    const query = queryString.parse(params);
    const queryObject = setQueryObject(query);

    this.props.dispatch(filterTasks(queryObject));
    this.props.dispatch(getTasksAsync(queryObject));
  }
}

const mapStateToProps = (state: any) => {
  return { ...state.tasks, ...state.tasksFilter };
};

export default connect(mapStateToProps)(Dashboard);
