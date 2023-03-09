// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import Typography from 'antd/es/typography';
import Modal from 'antd/lib/modal';
import { Col, Row } from 'antd/lib/grid';
import Switch from 'antd/lib/switch';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import { getCore } from 'cvat-core-wrapper';
import PaidFeaturesPreviewImage from 'assets/paid-features-preview.png';
import moment from 'moment';
import config from 'config';
import './styles.scss';

const core = getCore();
const { CVAT_BILLING_URL } = config;

export default function PremiumFeaturesModal(): JSX.Element {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dontShowAgainToday, setDontShowAgainToday] = useState(localStorage.getItem('paidNotificationShown') === moment().format('YYYY-MM-DD'));
    const organization = useSelector((state: CombinedState) => state.organizations.current);
    const user = useSelector((state: CombinedState) => state.auth.user);

    const closeModal = useCallback((): void => {
        if (dontShowAgainToday) {
            const now = moment().format('YYYY-MM-DD');
            localStorage.setItem('paidNotificationShown', now);
        }
        setIsModalOpen(false);
    }, [dontShowAgainToday]);

    const openBillingPage = useCallback((): void => {
        const params = organization?.id ? `/?type=organization&orgId=${organization.id}` : '/?type=personal';
        const billingURL = `${CVAT_BILLING_URL}${params}`;
        window.open(billingURL, '_self');
    }, []);

    useEffect(() => {
        if (!dontShowAgainToday) {
            core.server.hasLimits(user.id, organization?.id).then((hasLimits: boolean) => {
                if (!hasLimits && !user.isSuperuser && !user.isStaff) {
                    setIsModalOpen(true);
                }
            });
        }
    }, [user, organization]);

    return (
        <>
            <Modal
                className='cvat-paid-features-notification'
                visible={isModalOpen}
                onCancel={closeModal}
                closable={false}
                width={725}
                footer={(
                    <Row justify='space-between'>
                        <Col className='cvat-paid-features-notification-dont-show'>
                            <Switch onChange={(checked: boolean) => setDontShowAgainToday(checked)} />
                            <Typography.Text>Don&apos;t show again today</Typography.Text>
                        </Col>
                        <Col>
                            <Button onClick={closeModal}>
                                Close
                            </Button>
                            <Button
                                type='primary'
                                onClick={openBillingPage}
                            >
                                Check premium features
                            </Button>
                        </Col>
                    </Row>
                )}
            >
                <img src={PaidFeaturesPreviewImage} alt='paid-features-preview' />
                <Row className='cvat-paid-features-notification-description' justify='space-between'>
                    <Col className='cvat-paid-features-notification-description-title' span={8}>
                        <Typography.Title level={3}>Enhance your experience with premium features</Typography.Title>
                    </Col>
                    <Col className='cvat-paid-features-notification-description-details' span={14}>
                        <Space direction='vertical' size='small'>
                            <Typography.Text>
                                We&apos;ve added premium features designed to enhance your experience and productivity.
                                These features include advanced analytics and reporting, automated annotation,
                                better user management, and increased storage capacity.
                            </Typography.Text>
                            <Typography.Text>
                                In order to access these features, you need to subscribe to our paid plan.
                            </Typography.Text>
                        </Space>
                    </Col>
                </Row>
                <Row />
            </Modal>
        </>
    );
}
