import React, { PureComponent } from 'react';
import { Link } from 'react-router-dom';

import { connect } from 'react-redux';
import { loginAsync, isAuthenticatedAsync } from '../../actions/auth.actions';
import { getUsersAsync } from '../../actions/users.actions';

import { Button, Icon, Input, Form, Col, Row, Spin } from 'antd';
import Title from 'antd/lib/typography/Title';

import './login-page.scss';


class LoginForm extends PureComponent<any, any> {
  constructor(props: any) {
    super(props);

    this.state = { loading: false };
  }

  componentDidMount() {
    this.setState({ loading: true });

    this.props.dispatch(isAuthenticatedAsync()).then(
      (isAuthenticated: boolean) => {
        this.setState({ loading: false });

        if (this.props.isAuthenticated) {
          this.props.dispatch(getUsersAsync({ self: true }));
          this.props.history.replace(this.props.location.state ? this.props.location.state.from : '/tasks');
        }
      }
    );
  }

  render() {
    const { getFieldDecorator } = this.props.form;

    return (
      <Spin wrapperClassName="spinner" size="large" spinning={ this.state.loading }>
        <Row type="flex" justify="center" align="middle">
          <Col xs={12} md={10} lg={8} xl={6}>
            <Form className="login-form" onSubmit={ this.onSubmit }>
              <Title className="login-form__title">Login</Title>

              <Form.Item>
                {getFieldDecorator('username', {
                  rules: [{ required: true, message: 'Please enter your username!' }],
                })(
                  <Input
                    prefix={ <Icon type="user" /> }
                    type="text"
                    name="username"
                    placeholder="Username"
                  />,
                )}
              </Form.Item>

              <Form.Item>
                {getFieldDecorator('password', {
                  rules: [{ required: true, message: 'Please enter your password!' }],
                })(
                  <Input
                    prefix={ <Icon type="lock" /> }
                    type="password"
                    name="password"
                    placeholder="Password"
                  />,
                )}
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={ this.props.isFetching }>
                  Log in
                </Button>
              </Form.Item>

              Have not registered yet? <Link to="/register">Register here.</Link>
            </Form>
          </Col>
        </Row>
      </Spin>
    );
  }

  private onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    this.props.form.validateFields((error: any, values: any) => {
      if (!error) {
        this.props.dispatch(loginAsync(values.username, values.password, this.props.history)).then(
          (loggedIn: any) => {
            this.props.dispatch(getUsersAsync({ self: true }));
          },
        );
      }
    });
  }
}

const mapStateToProps = (state: any) => {
  return state.authContext;
};

export default Form.create()(connect(mapStateToProps)(LoginForm));
