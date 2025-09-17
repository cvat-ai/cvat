// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Typography from 'antd/lib/typography';
import Button from 'antd/lib/button';

import { ChangePasswordData } from 'reducers';
import { changePasswordAsync } from 'actions/auth-actions';
import ChangePasswordForm from './change-password-form';

function SecurityContent(): JSX.Element {
    const dispatch = useDispatch();
    const [showForm, setShowForm] = useState(false);

    const onShowForm = useCallback((): void => {
        setShowForm(true);
    }, []);

    const onCancelForm = useCallback((): void => {
        setShowForm(false);
    }, []);

    const onChangePassword = (data: ChangePasswordData): void => {
        dispatch(changePasswordAsync(data, onCancelForm));
    };

    return (
        <div className='cvat-security-content'>
            <Card
                title='Password'
                className='cvat-security-password-card'
            >
                {showForm ? <ChangePasswordForm onSubmit={onChangePassword} onCancel={onCancelForm} /> :
                    (
                        <Row justify='space-between' align='middle'>
                            <Col>
                                <Typography.Text type='secondary'>
                                    Keep your account secure with a strong, unique password
                                </Typography.Text>
                            </Col>
                            <Col>
                                <Button className='cvat-security-password-change-button' onClick={onShowForm} type='primary'>
                                    Change password
                                </Button>
                            </Col>
                        </Row>
                    )}
            </Card>
        </div>
    );
}

export default React.memo(SecurityContent);
