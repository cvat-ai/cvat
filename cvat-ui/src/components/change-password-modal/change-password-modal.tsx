// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import Modal from 'antd/lib/modal';
import Title from 'antd/lib/typography/Title';

import { changePasswordAsync } from 'actions/auth-actions';
import { CombinedState } from 'reducers/interfaces';
import ChangePasswordForm, { ChangePasswordData } from './change-password-form';

interface StateToProps {
    fetching: boolean;
    visible: boolean;
}

interface DispatchToProps {
    onChangePassword(oldPassword: string, newPassword1: string, newPassword2: string): void;
}

interface ChangePasswordPageComponentProps {
    fetching: boolean;
    visible: boolean;
    onChangePassword: (oldPassword: string, newPassword1: string, newPassword2: string) => void;
    onClose(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        fetching: state.auth.fetching,
        visible: state.auth.showChangePasswordDialog,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onChangePassword(oldPassword: string, newPassword1: string, newPassword2: string): void {
            dispatch(changePasswordAsync(oldPassword, newPassword1, newPassword2));
        },
    };
}

function ChangePasswordComponent(props: ChangePasswordPageComponentProps): JSX.Element {
    const {
        fetching, onChangePassword, visible, onClose,
    } = props;

    return (
        <Modal
            className='cvat-modal-change-password'
            title={<Title level={3}>Change password</Title>}
            okType='primary'
            okText='Submit'
            footer={null}
            visible={visible}
            destroyOnClose
            onCancel={onClose}
        >
            <ChangePasswordForm
                onSubmit={(changePasswordData: ChangePasswordData): void => {
                    onChangePassword(
                        changePasswordData.oldPassword,
                        changePasswordData.newPassword1,
                        changePasswordData.newPassword2,
                    );
                }}
                fetching={fetching}
            />
        </Modal>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(ChangePasswordComponent);
