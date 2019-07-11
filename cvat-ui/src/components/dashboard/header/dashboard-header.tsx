import React, { Component } from 'react';

import { Layout, Row, Col, Button, Input, Affix } from 'antd';
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

    this.state = {};

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

  render() {
    return(
      <Affix offsetTop={0}>
        <Header className="dashboard-header">
          <Row type="flex" gutter={16}>
            <Col className="dashboard-header__logo" span={8}>
              <Title className="logo">Tasks</Title>
            </Col>
            <Col span={8} className="dashboard-header__search">
              <Search
                className="search"
                placeholder="Search for tasks"
                onSearch={ query => this.props.onSearch(query) }
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
      </Affix>
    );
  }

  private openUserGuide = () => {
    window.open(`${this.hostUrl}/documentation/user_guide.html`, '_blank')
  }
}

export default DashboardHeader;
