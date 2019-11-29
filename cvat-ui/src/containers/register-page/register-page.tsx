import React from 'react';
import { connect } from 'react-redux';
import { registerAsync } from '../../actions/auth-actions';
import RegisterPageComponent from '../../components/register-page/register-page';
import { CombinedState } from '../../reducers/interfaces';

interface StateToProps {
    fetching: boolean;
}

interface DispatchToProps {
    register: (username: string, firstName: string,
        lastName: string, email: string,
        password1: string, password2: string) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        register: (...args) => dispatch(registerAsync(...args))
    }
}

function RegisterPageContainer(props: StateToProps & DispatchToProps) {
    return (
        <RegisterPageComponent
            fetching={props.fetching}
            onRegister={props.register}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(RegisterPageContainer);
