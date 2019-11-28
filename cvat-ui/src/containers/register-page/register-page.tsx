import React from 'react';
import { connect } from 'react-redux';
import { registerAsync } from '../../actions/auth-actions';
import RegisterPageComponent from '../../components/register-page/register-page';

interface StateToProps {}

interface DispatchToProps {
    register: (username: string, firstName: string,
        lastName: string, email: string,
        password1: string, password2: string) => void;
}

function mapStateToProps(): StateToProps {
    return {};
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        register: (...args) => dispatch(registerAsync(...args))
    }
}

function RegisterPageContainer(props: StateToProps & DispatchToProps) {
    return (
        <RegisterPageComponent
            onRegister={props.register}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(RegisterPageContainer);
