import React, { PureComponent } from 'react';

import { connect } from 'react-redux';
// import { registerAsync } from '../../actions/auth.actions';

import { Button, Icon, Input, Form, Col, Row } from 'antd';
import Title from 'antd/lib/typography/Title';

import './register-page.scss';


class RegisterForm extends PureComponent<any, any> {
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
          <Form className="register-form" onSubmit={ this.onSubmit }>
            <Title className="register-form__title">Register</Title>

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
              {getFieldDecorator('firstName', {
                rules: [{ required: true, message: 'Please enter your first name!' }],
              })(
                <Input
                  prefix={ <Icon type="idcard" /> }
                  type="text"
                  name="first-name"
                  placeholder="First name"
                />,
              )}
            </Form.Item>

            <Form.Item>
              {getFieldDecorator('lastName', {
                rules: [{ required: true, message: 'Please enter your last name!' }],
              })(
                <Input
                  prefix={ <Icon type="idcard" /> }
                  type="text"
                  name="last-name"
                  placeholder="Last name"
                />,
              )}
            </Form.Item>

            <Form.Item>
              {getFieldDecorator('email', {
                rules: [{ required: true, message: 'Please enter your email!' }],
              })(
                <Input
                  prefix={ <Icon type="mail" /> }
                  type="text"
                  name="email"
                  placeholder="Email"
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
              {getFieldDecorator('passwordConfirmation', {
                rules: [{ required: true, message: 'Please re-enter your password!' }],
              })(
                <Input
                  prefix={ <Icon type="lock" /> }
                  type="password-confirmation"
                  name="password-confirmation"
                  placeholder="Password confirmation"
                />,
              )}
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={ this.props.isFetching }>
                Register
              </Button>
            </Form.Item>
          </Form>
        </Col>
      </Row>
    );
  }

  private onSubmit = (event: any) => {
    event.preventDefault();

    this.props.form.validateFields((error: any, values: any) => {
      if (!error) {
        // this.props.dispatch(registerAsync(values.username, values.password, this.props.history));
      }
    });
  }
}

const mapStateToProps = (state: any) => {
  return state.authContext;
};

export default Form.create()(connect(mapStateToProps)(RegisterForm));
