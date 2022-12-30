// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';
import LoginPageComponent from 'components/login-page/login-page';
import { CombinedState } from 'reducers';
import { loginAsync, loadSocialAuthAsync } from 'actions/auth-actions';
import { SocialAuthMethods } from 'cvat-core-wrapper';

interface StateToProps {
    fetching: boolean;
    renderResetPassword: boolean;
    hasEmailVerificationBeenSent: boolean;
    socialAuthMethods: SocialAuthMethods;
}

interface DispatchToProps {
    onLogin: typeof loginAsync;
    loadSocialAuthenticationMethods: typeof loadSocialAuthAsync;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching,
        renderResetPassword: state.auth.allowResetPassword,
        hasEmailVerificationBeenSent: state.auth.hasEmailVerificationBeenSent,
        socialAuthMethods: state.auth.socialAuthMethods,
    };
}

const mapDispatchToProps: DispatchToProps = {
    onLogin: loginAsync,
    loadSocialAuthenticationMethods: loadSocialAuthAsync,
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginPageComponent);
