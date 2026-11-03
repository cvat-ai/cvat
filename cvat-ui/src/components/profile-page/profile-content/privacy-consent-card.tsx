// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Card from 'antd/lib/card';
import Button from 'antd/lib/button';
import Switch from 'antd/lib/switch';

import { updateGrowthDataAsync } from 'actions/growth-actions';
import { CombinedState } from 'reducers';
import { usePlugins } from 'utils/hooks';

function PrivacyConsentCard(): JSX.Element {
    const dispatch = useDispatch();
    const { data, fetching } = useSelector((state: CombinedState) => state.growth);
    const [promotionNotificationsAllowed, setPromotionNotificationsAllowed] = useState(false);
    const plugins = usePlugins((state: CombinedState) => state.plugins.components.profilePage.privacyConsent.items);

    useEffect(() => {
        setPromotionNotificationsAllowed(data?.promotionNotificationsAllowed ?? false);
    }, [data?.promotionNotificationsAllowed]);

    const isChanged = !!data && promotionNotificationsAllowed !== data.promotionNotificationsAllowed;

    return (
        <Card title='Privacy & consent' className='cvat-profile-privacy-consent-card'>
            <div className='cvat-profile-privacy-consent-item'>
                <Switch
                    checked={promotionNotificationsAllowed}
                    loading={fetching}
                    disabled={!data}
                    onChange={setPromotionNotificationsAllowed}
                />
                <div className='cvat-profile-privacy-consent-item-copy'>
                    <div className='cvat-profile-privacy-consent-item-title'>Allow promotional notifications</div>
                    <div className='cvat-profile-privacy-consent-item-description'>
                        Occasional product and community updates from CVAT.
                    </div>
                </div>
            </div>
            {[...plugins].sort((a, b) => a.weight - b.weight).map(({ component: Component }, index) => (
                <Component key={index} />
            ))}
            <div className='cvat-profile-privacy-consent-actions'>
                <Button
                    type='primary'
                    disabled={!isChanged}
                    loading={fetching}
                    onClick={() => dispatch(updateGrowthDataAsync({ promotionNotificationsAllowed }))}
                >
                    Save changes
                </Button>
            </div>
        </Card>
    );
}

export default React.memo(PrivacyConsentCard);
