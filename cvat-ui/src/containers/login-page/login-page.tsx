// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';
import LoginPageComponent from 'components/login-page/login-page';
import { CombinedState } from 'reducers';
import { loginAsync, loadAdvancedAuthAsync } from 'actions/auth-actions';

interface StateToProps {
    fetching: boolean;
    renderResetPassword: boolean;
    hasEmailVerificationBeenSent: boolean;
    googleAuthentication: boolean;
    githubAuthentication: boolean;
}

interface DispatchToProps {
    onLogin: typeof loginAsync;
    loadAdvancedAuthenticationMethods: typeof loadAdvancedAuthAsync;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching,
        renderResetPassword: state.auth.allowResetPassword,
        hasEmailVerificationBeenSent: state.auth.hasEmailVerificationBeenSent,
        googleAuthentication: state.auth.advancedAuthList.GOOGLE_ACCOUNT_AUTHENTICATION,
        githubAuthentication: state.auth.advancedAuthList.GITHUB_ACCOUNT_AUTHENTICATION,
    };
}

const mapDispatchToProps: DispatchToProps = {
    onLogin: loginAsync,
    loadAdvancedAuthenticationMethods: loadAdvancedAuthAsync,
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginPageComponent);
