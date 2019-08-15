import React, { PureComponent } from 'react';

import { connect } from 'react-redux';
import { loginAsync } from '../../actions/auth.actions';

import { Button, Icon, Input, Form, Col, Row } from 'antd';
import Title from 'antd/lib/typography/Title';

import './login-page.scss';


class LoginForm extends PureComponent<any, any> {
  componentWillMount() {
    if (localStorage.getItem('session')) {
      this.props.history.push('/dashboard');
    }
  }

  render() {
    const { getFieldDecorator } = this.props.form;

    return (
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

            Have not registered yet? <a href="/register">Register here.</a>
          </Form>
        </Col>
      </Row>
    );
  }

  private onSubmit = (event: React.FormEvent<HTMLInputElement>) => {
    event.preventDefault();

    this.props.form.validateFields((error: any, values: any) => {
      if (!error) {
        this.props.dispatch(loginAsync(values.username, values.password, this.props.history));
      }
    });
  }
}

const mapStateToProps = (state: any) => {
  return state.authContext;
};

export default Form.create()(connect(mapStateToProps)(LoginForm));
