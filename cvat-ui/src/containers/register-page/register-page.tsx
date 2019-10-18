import React from 'react';
import { connect } from 'react-redux';
import { registerAsync } from '../../actions/auth-actions';
import { CombinedState } from '../../reducers/root-reducer';
import RegisterPageComponent from '../../components/register-page/register-page';

interface StateToProps {
    registerError: any;
}

interface DispatchToProps {
    register: (username: string, firstName: string,
        lastName: string, email: string,
        password1: string, password2: string) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        registerError: state.auth.registerError,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        register: (...args) => dispatch(registerAsync(...args))
    }
}

type RegisterPageContainerProps = StateToProps & DispatchToProps;
function RegisterPageContainer(props: RegisterPageContainerProps) {
    return (
        <RegisterPageComponent
            registerError={props.registerError ? props.registerError.toString() : ''}
            onRegister={props.register}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(RegisterPageContainer);
