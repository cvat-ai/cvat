import React, { PureComponent } from 'react';

import { Layout, Pagination, Row, Col } from 'antd';

import './dashboard-footer.scss';

const { Footer } = Layout;

class DashboardFooter extends PureComponent<any, any> {
  render() {
    const pagination = (
      <Col span={24}>
        <Pagination
          className="dashboard-footer__pagination"
          hideOnSinglePage
          onChange={ this.props.onPageChange }
          total={ this.props.tasksCount }>
        </Pagination>
      </Col>
    );

    return(
      <Footer className="dashboard-footer">
        <Row type="flex" gutter={16}>
          { this.props.tasksCount ? pagination : '' }
        </Row>
      </Footer>
    );
  }
}

export default DashboardFooter;
