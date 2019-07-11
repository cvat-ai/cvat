import React, { PureComponent } from 'react';

import { Layout, Pagination, Row, Col } from 'antd';

import './dashboard-footer.scss';

const { Footer } = Layout;

class DashboardFooter extends PureComponent<any, any> {
  render() {
    return(
      <Footer className="dashboard-footer">
        <Row type="flex" gutter={16}>
          <Col span={24}>
            <Pagination
              className="dashboard-footer__pagination"
              onChange={ this.props.onPageChange }
              total={ this.props.tasksCount }>
            </Pagination>
          </Col>
        </Row>
      </Footer>
    );
  }
}

export default DashboardFooter;
