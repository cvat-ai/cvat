import React, { Component } from 'react';

import { Layout, Pagination } from 'antd';

import './dashboard-footer.scss';

const { Footer } = Layout;

class DashboardFooter extends Component<any, any> {
  constructor(props: any) {
    super(props);

    this.state = {};
  }

  render() {
    return(
      <Footer>
        <Pagination onChange={ this.props.onPageChange } total={ this.props.tasksCount } />
      </Footer>
    );
  }
}

export default DashboardFooter;
