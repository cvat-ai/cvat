import React, { Component } from 'react';

import { Layout } from 'antd';

import './dashboard-footer.scss';

const { Footer } = Layout;

interface DashboardFooterState {

}

class DashboardFooter extends Component<any, DashboardFooterState> {
  constructor(props: any) {
    super(props);

    this.state = {};
  }

  render() {
    return(
      <Footer>
        Pagination here
      </Footer>
    );
  }
}

export default DashboardFooter;
