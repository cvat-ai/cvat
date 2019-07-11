import React, { PureComponent } from 'react';

import { Layout, Pagination, Affix } from 'antd';

import './dashboard-footer.scss';

const { Footer } = Layout;

class DashboardFooter extends PureComponent<any, any> {
  render() {
    return(
      <Affix offsetBottom={0}>
        <Footer className="dashboard-footer">
          <Pagination
            className="dashboard-footer__pagination"
            onChange={ this.props.onPageChange }
            total={ this.props.tasksCount }>
          </Pagination>
        </Footer>
      </Affix>
    );
  }
}

export default DashboardFooter;
