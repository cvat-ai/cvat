import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Redirect, Link, withRouter } from 'react-router-dom';

import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row
} from 'antd';

import LoginForm from '../components/login-form';

import { loginAsync } from '../actions/auth-actions';
import { AuthState } from '../reducers/auth-reducer';

interface LoginPageProps {
    auth: AuthState;
}

interface LoginPageActions {
    login(login: string, password: string): void;
}

function mapStateToProps(state: any): LoginPageProps {
    return {
        auth: state.auth,
    };
}

function mapDispatchToProps(dispatch: any): LoginPageActions {
    return {
        login: (login: string, password: string) => dispatch(loginAsync(login, password)),
    }
}

class LoginPage extends React.PureComponent<
    LoginPageProps &
    LoginPageActions &
    RouteComponentProps> {
    constructor(props: any) {
        super(props);
    }

    public render() {
        const { loginError } = this.props.auth;
        const sizes = {
            xs: { span: 14 },
            sm: { span: 14 },
            md: { span: 10 },
            lg: { span: 4 },
            xl: { span: 4 },
        }
        return (
            <Row type='flex' justify='center' align='middle'>
                <Col {...sizes}>
                    <Redirect to='/auth/login'/>
                    <Title level={2}> Login </Title>
                    <LoginForm onSubmit={this.props.login}/>
                    { loginError &&
                        <Row>
                            <Col>
                                <Text type="danger"> { loginError.message } </Text>
                            </Col>
                        </Row>
                    }
                    <Row type='flex' justify='start' align='top'>
                        <Col>
                            <Text strong>
                                New to CVAT? Create <Link to="/auth/register">an account</Link>
                            </Text>
                        </Col>
                    </Row>
                </Col>
            </Row>
        );
    }
}

export default withRouter(connect(
    mapStateToProps,
    mapDispatchToProps,
)(LoginPage));
