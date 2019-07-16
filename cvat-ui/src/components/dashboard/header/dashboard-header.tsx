import React, { Component } from 'react';

import { Layout, Row, Col, Button, Input } from 'antd';

import './dashboard-header.scss';

const { Header } = Layout;
const { Search } = Input;

interface DashboardHeaderAction {
  id: number,
  name: string,
  trigger: any,
}

class DashboardHeader extends Component<any, any> {
  actions: DashboardHeaderAction[];
  hostUrl: string | undefined;

  constructor(props: any) {
    super(props);

    this.state = {};

    this.hostUrl = process.env.REACT_APP_API_HOST_URL;

    this.actions = [
      // {
      //   id: 1,
      //   name: 'Create task',
      //   trigger: this.props.onSearch,
      // },
      {
        id: 2,
        name: 'User guide',
        trigger: this.openUserGuide,
      },
    ];
  }

  render() {
    return(
      <Header>
        <Row type="flex">
          <Col span={8}>
            Tasks
          </Col>
          <Col span={8}>
            <Search placeholder="Search for tasks" onSearch={ query => this.props.onSearch(query) } enterButton />
          </Col>
          <Col span={8}>
            {
              this.actions.map(
                (action: DashboardHeaderAction) => (
                  <Button type="primary" key={ action.id } onClick={ () => action.trigger() }>
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

  private openUserGuide = () => {
    window.open(`${this.hostUrl}/documentation/user_guide.html`, '_blank')
  }
}

export default DashboardHeader;
