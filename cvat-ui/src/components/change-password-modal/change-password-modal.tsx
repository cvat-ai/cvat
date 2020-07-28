// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import Modal from 'antd/lib/modal';
import Title from 'antd/lib/typography/Title';

import ChangePasswordForm, { ChangePasswordData } from './change-password-form';

interface ChangePasswordPageComponentProps {
    fetching: boolean;
    visible: boolean;
    onChangePassword: (oldPassword: string, newPassword1: string, newPassword2: string) => void;
    onClose(): void;
}

function ChangePasswordComponent(props: ChangePasswordPageComponentProps & RouteComponentProps): JSX.Element {
    const {
        fetching,
        onChangePassword,
        visible,
        onClose,
    } = props;

    return (
            <Modal
                title={<Title level={3}>Change password</Title>}
                okType='primary'
                okText='Submit'
                footer={null}
                visible={visible}
                destroyOnClose={true}
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

export default withRouter(ChangePasswordComponent);
