import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Link, withRouter } from 'react-router-dom';

import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import {
    Col,
    Row,
    Modal,
} from 'antd';


import { registerAsync } from '../actions/auth-actions';
import RegisterForm, { RegisterData } from '../components/register-form';
import { AuthState } from '../reducers/interfaces';

interface StateToProps {
    auth: AuthState;
}

interface DispatchToProps {
    register: (registerData: RegisterData) => void;
}

function mapStateToProps(state: any): StateToProps {
    return {
        auth: state.auth,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        register: (registerData: RegisterData) => dispatch(registerAsync(registerData))
    }
}

type RegisterPageProps = StateToProps & DispatchToProps & RouteComponentProps;
function RegisterPage(props: RegisterPageProps) {
    const { registerError } = props.auth;
    const sizes = {
        xs: { span: 14 },
        sm: { span: 14 },
        md: { span: 10 },
        lg: { span: 4 },
        xl: { span: 4 },
    }

    if (registerError) {
        Modal.error({
            title: 'Could not login',
            content: `${registerError.toString()}`,
        });
    }

    return (
        <Row type='flex' justify='center' align='middle'>
            <Col {...sizes}>
                <Title level={2}> Create an account </Title>
                <RegisterForm onSubmit={props.register}/>
                <Row type='flex' justify='start' align='top'>
                    <Col>
                        <Text strong>
                            Already have an account? <Link to="/auth/login"> Login </Link>
                        </Text>
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}

export default withRouter(connect(
    mapStateToProps,
    mapDispatchToProps,
)(RegisterPage));
