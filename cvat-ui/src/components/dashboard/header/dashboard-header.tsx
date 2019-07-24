import React, { Component } from 'react';

import { withRouter } from 'react-router-dom';

import { connect } from 'react-redux';

import { Layout, Row, Col, Button, Input } from 'antd';
import Title from 'antd/lib/typography/Title';

import './dashboard-header.scss';

const { Header } = Layout;
const { Search } = Input;

interface DashboardHeaderAction {
  id: number,
  name: string,
  trigger: Function,
}

class DashboardHeader extends Component<any, any> {
  actions: DashboardHeaderAction[];
  hostUrl: string | undefined;

  constructor(props: any) {
    super(props);

    this.state = { searchQuery: this.props.searchQuery };

    this.hostUrl = process.env.REACT_APP_API_HOST_URL;

    this.actions = [
      {
        id: 1,
        name: 'Create task',
        trigger: () => {},
      },
      {
        id: 2,
        name: 'User guide',
        trigger: this.openUserGuide,
      },
    ];
  }

  componentDidUpdate(prevProps: any) {
    if (this.props.searchQuery !== prevProps.searchQuery) {
      this.setState({ searchQuery: this.props.searchQuery });
    }
  }

  render() {
    return(
      <Header className="dashboard-header">
        <Row type="flex" gutter={16}>
          <Col className="dashboard-header__logo" span={8}>
            <Title className="logo">Tasks</Title>
          </Col>
          <Col className="dashboard-header__search" span={8}>
            <Search
              className="search"
              placeholder="Search for tasks"
              value={ this.state.searchQuery }
              onChange={ this.onValueChange }
              onSearch={ query => this.onSearch(query) }
              enterButton>
            </Search>
          </Col>
          <Col className="dashboard-header__actions" span={8}>
            {
              this.actions.map(
                (action: DashboardHeaderAction) => (
                  <Button
                    className="action"
                    type="primary"
                    key={ action.id }
                    onClick={ () => action.trigger() }>
                    { action.name }
                  </Button>
                )
              )
            }
          </Col>
        </Row>
      </Header>
    );
  }

  private onValueChange = (event: any) => {
    this.setState({ searchQuery: event.target.value });
  }

  private onSearch = (query: string) => {
    if (query) {
      this.props.history.push(`?search=${query}`);
    }
  }

  private openUserGuide = () => {
    window.open(`${this.hostUrl}/documentation/user_guide.html`, '_blank')
  }
}

const mapStateToProps = (state: any) => {
  return { ...state.tasks, ...state.tasksFilter };
};

export default withRouter(connect(mapStateToProps)(DashboardHeader) as any);
