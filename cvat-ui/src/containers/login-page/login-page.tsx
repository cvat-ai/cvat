// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';
import LoginPageComponent from 'components/login-page/login-page';
import { CombinedState } from 'reducers/interfaces';
import { loginAsync } from 'actions/auth-actions';

interface StateToProps {
    fetching: boolean;
}

interface DispatchToProps {
    onLogin: typeof loginAsync;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching,
    };
}

const mapDispatchToProps: DispatchToProps = {
    onLogin: loginAsync,
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(LoginPageComponent);
