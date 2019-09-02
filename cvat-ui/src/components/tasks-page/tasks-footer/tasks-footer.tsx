import React, { PureComponent } from 'react';

import * as queryString from 'query-string';

import { withRouter } from 'react-router-dom'

import { connect } from 'react-redux';

import { Layout, Pagination, Row, Col } from 'antd';

import './tasks-footer.scss';


const { Footer } = Layout;

class TasksFooter extends PureComponent<any, any> {
  render() {
    return(
      <Footer className="tasks-footer">
        <Row type="flex" gutter={16}>
          <Col span={24}>
            <Pagination
              className="tasks-footer__pagination"
              current={ this.props.currentPage || 1 }
              hideOnSinglePage
              onChange={ this.onPageChange }
              total={ this.props.tasksCount }>
            </Pagination>
          </Col>
        </Row>
      </Footer>
    );
  }

  private onPageChange = (page: number, pageSize?: number) => {
    const params = { search: this.props.searchQuery, page }

    this.props.history.push({ search: queryString.stringify(params) });
  }
}

const mapStateToProps = (state: any) => {
  return { ...state.tasks, ...state.tasksFilter };
};

export default withRouter(connect(mapStateToProps)(TasksFooter) as any);
