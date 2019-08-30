import React, { PureComponent } from 'react';

import { Link, withRouter } from 'react-router-dom';

import { connect } from 'react-redux';

import { logoutAsync } from '../../actions/auth.actions';

import { Layout, Row, Col, Menu, Dropdown, Icon } from 'antd';
import { ClickParam } from 'antd/lib/menu';

import './header-layout.scss';


const { Header } = Layout;

class HeaderLayout extends PureComponent<any, any> {
  hostUrl: string | undefined;

  constructor(props: any) {
    super(props);

    this.state = {
      selectedMenuItem: null,
    };

    this.hostUrl = process.env.REACT_APP_API_HOST_URL;
  }

  componentDidMount() {
    this.setState({ selectedMenuItem: this.props.location.pathname.split('/')[1] });
  }

  render() {
    const dropdownMenu = (
      <Menu>
        <Menu.Item onClick={ this.logout } key="logout">Logout</Menu.Item>
      </Menu>
    );

    return (
      <Header className="header-layout">
        <Row type="flex" gutter={24}>
          <Col className="header-layout__logo" span={2}>
            <img src="./images/cvat-logo.svg" alt="CVAT logo" />
          </Col>
          <Col className="header-layout__menu" span={18}>
            <Menu onClick={ this.selectMenuItem } selectedKeys={ [this.state.selectedMenuItem] } mode="horizontal">
              <Menu.Item key="tasks">
                <Link to="/tasks">Tasks</Link>
              </Menu.Item>
              <Menu.Item disabled key="models">
                <Link to="/models">Models</Link>
              </Menu.Item>
              <Menu.Item disabled key="analitics">
                <Link to="/analitics">Analitics</Link>
              </Menu.Item>

              <a className="last-menu-item" href={ `${this.hostUrl}/documentation/user_guide.html` } target="blank">Help</a>
            </Menu>
          </Col>
          <Dropdown className="header-layout__dropdown" overlay={ dropdownMenu } trigger={ ['click'] }>
            <Col span={4}>
              <Icon type="user" />
              { this.props.currentUser ? <span>{ this.props.currentUser.username }</span> : null }
              <Icon type="caret-down" />
            </Col>
          </Dropdown>
        </Row>
      </Header>
    );
  }

  private selectMenuItem = (event: ClickParam) => {
    this.setState({ selectedMenuItem: event.key });
  }

  private logout = () => {
    this.props.dispatch(logoutAsync());
  }
}

const mapStateToProps = (state: any) => {
  return { ...state.authContext, ...state.users };
};

export default withRouter(connect(mapStateToProps)(HeaderLayout) as any);
