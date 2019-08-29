import React, { PureComponent } from 'react';
import { Link } from 'react-router-dom';

import { connect } from 'react-redux';
import { registerAsync, isAuthenticatedAsync } from '../../actions/auth.actions';

import { Button, Icon, Input, Form, Col, Row, Spin } from 'antd';
import Title from 'antd/lib/typography/Title';

import './register-page.scss';


class RegisterForm extends PureComponent<any, any> {
  constructor(props: any) {
    super(props);

    this.state = { confirmDirty: false, loading: false };
  }

  componentDidMount() {
    this.setState({ loading: true });

    this.props.dispatch(isAuthenticatedAsync()).then(
      (isAuthenticated: boolean) => {
        this.setState({ loading: false });

        if (this.props.isAuthenticated) {
          this.props.history.replace('/tasks');
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
                  rules: [],
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
                  rules: [],
                })(
                  <Input
                    prefix={ <Icon type="idcard" /> }
                    type="text"
                    name="last-name"
                    placeholder="Last name"
                  />,
                )}
              </Form.Item>

              <Form.Item hasFeedback>
                {getFieldDecorator('email', {
                  rules: [
                    {
                      type: 'email',
                      message: 'The input is not valid email!',
                    },
                    {
                      required: true,
                      message: 'Please input your email!',
                    },
                  ],
                })(
                  <Input
                    prefix={ <Icon type="mail" /> }
                    type="text"
                    name="email"
                    placeholder="Email"
                  />,
                )}
              </Form.Item>

              <Form.Item hasFeedback>
                {getFieldDecorator('password', {
                  rules: [
                    {
                      required: true,
                      message: 'Please input your password!',
                    },
                    {
                      validator: this.validateToNextPassword,
                    },
                  ],
                })(
                  <Input.Password
                    prefix={ <Icon type="lock" /> }
                    name="password"
                    placeholder="Password"
                  />,
                )}
              </Form.Item>

              <Form.Item hasFeedback>
                {getFieldDecorator('passwordConfirmation', {
                  rules: [
                    {
                      required: true,
                      message: 'Please confirm your password!',
                    },
                    {
                      validator: this.compareToFirstPassword,
                    },
                  ],
                })(
                  <Input.Password
                    onBlur={ this.handleConfirmBlur }
                    prefix={ <Icon type="lock" /> }
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

              Already have an account? <Link to="/login">Login here.</Link>
            </Form>
          </Col>
        </Row>
      </Spin>
    );
  }

  private handleConfirmBlur = (event: any) => {
    const { value } = event.target;

    this.setState({ confirmDirty: this.state.confirmDirty || !!value });
  };

  private compareToFirstPassword = (rule: any, value: string, callback: Function) => {
    const { form } = this.props;

    if (value && value !== form.getFieldValue('password')) {
      callback('Two passwords that you enter are inconsistent!');
    } else {
      callback();
    }
  };

  private validateToNextPassword = (rule: any, value: string, callback: Function) => {
    const { form } = this.props;

    if (value && this.state.confirmDirty) {
      form.validateFields(['passwordConfirmation'], { force: true });
    }

    callback();
  };

  private onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    this.props.form.validateFields((error: any, values: any) => {
      if (!error) {
        this.props.dispatch(
          registerAsync(
            values.username,
            values.firstName,
            values.lastName,
            values.email,
            values.password,
            values.passwordConfirmation,
            this.props.history,
          ),
        );
      }
    });
  }
}

const mapStateToProps = (state: any) => {
  return state.authContext;
};

export default Form.create()(connect(mapStateToProps)(RegisterForm));
