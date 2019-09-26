import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Link, withRouter } from 'react-router-dom';

import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row
} from 'antd';

import LoginForm, { LoginData } from '../components/login-form';

import { loginAsync } from '../actions/auth-actions';
import { AuthState } from '../reducers/auth-reducer';

interface StateToProps {
    auth: AuthState;
}

interface DispatchToProps {
    login(loginData: LoginData): void;
}

function mapStateToProps(state: any): StateToProps {
    return {
        auth: state.auth,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        login: (loginData: LoginData) => dispatch(loginAsync(loginData)),
    }
}

type LoginPageProps = StateToProps & DispatchToProps & RouteComponentProps;

class LoginPage extends React.PureComponent<LoginPageProps> {
    constructor(props: LoginPageProps) {
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
