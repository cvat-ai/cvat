// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { registerAsync } from 'actions/auth-actions';
import RegisterPageComponent from 'components/register-page/register-page';
import { UserAgreement } from 'components/register-page/register-form'
import { CombinedState } from 'reducers/interfaces';

interface StateToProps {
    fetching: boolean;
    userAgreements: any[];
    
}

interface DispatchToProps {
    onRegister: (username: string, firstName: string,
        lastName: string, email: string,
        password1: string, password2: string,
        userAgreement: UserAgreement[]) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching || state.userAgreements.fetching,
        userAgreements: state.userAgreements.userAgreements,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onRegister: (...args): void => dispatch(registerAsync(...args)),
    };
}

function RegisterPageContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <RegisterPageComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(RegisterPageContainer);
