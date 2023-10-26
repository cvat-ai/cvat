// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { registerAsync } from 'actions/auth-actions';
import RegisterPageComponent from 'components/register-page/register-page';
import { RegisterData } from 'components/register-page/register-form';
import { CombinedState, UserAgreement } from 'reducers';

interface StateToProps {
    fetching: boolean;
    userAgreements: UserAgreement[];
}

interface DispatchToProps {
    onRegister: (
        registerData: RegisterData,
    ) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching || state.userAgreements.fetching,
        userAgreements: state.userAgreements.list,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onRegister: (args: RegisterData): void => dispatch(registerAsync(args)),
    };
}

function RegisterPageContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return <RegisterPageComponent {...props} />;
}

export default connect(mapStateToProps, mapDispatchToProps)(RegisterPageContainer);
