// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';
import LoginPageComponent from 'components/login-page/login-page';
import { CombinedState } from 'reducers';
import { loginAsync } from 'actions/auth-actions';

interface StateToProps {
    fetching: boolean;
    renderResetPassword: boolean;
    isHeaderAuthActive: boolean;
}

interface DispatchToProps {
    onLogin: typeof loginAsync;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching,
        renderResetPassword: state.auth.allowResetPassword,
        isHeaderAuthActive: state.plugins.list.HEADER_AUTH_ENABLE,
    };
}

const mapDispatchToProps: DispatchToProps = {
    onLogin: loginAsync,
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginPageComponent);
