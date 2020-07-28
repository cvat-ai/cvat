// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';
import ChangePasswordModalComponent from 'components/change-password-modal/change-password-modal';
import { CombinedState } from 'reducers/interfaces';
import { changePasswordAsync } from 'actions/auth-actions';

interface StateToProps {
    fetching: boolean;
    visible: boolean;
}

interface DispatchToProps {
    onChangePassword(
        oldPassword: string,
        newPassword1: string,
        newPassword2: string): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching,
        visible: state.auth.showChangePasswordDialog,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return ({
        onChangePassword(oldPassword: string, newPassword1: string, newPassword2: string): void {
            dispatch(changePasswordAsync(oldPassword, newPassword1, newPassword2));
        },
    });
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ChangePasswordModalComponent);
