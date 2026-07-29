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

function NotificationsCard(): JSX.Element {
    const dispatch = useDispatch();
    const { data, fetching } = useSelector((state: CombinedState) => state.growth);
    const [githubPromptAllowed, setGitHubPromptAllowed] = useState(false);

    useEffect(() => {
        setGitHubPromptAllowed(data?.github_prompt_allowed ?? false);
    }, [data?.github_prompt_allowed]);

    const isChanged = !!data && githubPromptAllowed !== data.github_prompt_allowed;

    return (
        <Card title='Notifications' className='cvat-profile-notifications-card'>
            <div className='cvat-profile-notifications-item'>
                <Switch
                    checked={githubPromptAllowed}
                    loading={fetching}
                    disabled={!data}
                    onChange={setGitHubPromptAllowed}
                />
                <div className='cvat-profile-notifications-item-copy'>
                    <div className='cvat-profile-notifications-item-title'>GitHub star reminder</div>
                    <div className='cvat-profile-notifications-item-description'>
                        Occasional reminders to support CVAT on GitHub.
                    </div>
                </div>
            </div>
            <div className='cvat-profile-notifications-actions'>
                <Button
                    type='primary'
                    disabled={!isChanged}
                    loading={fetching}
                    onClick={() => {
                        if (data) {
                            dispatch(updateGrowthDataAsync(data.id, { githubPromptAllowed }));
                        }
                    }}
                >
                    Save changes
                </Button>
            </div>
        </Card>
    );
}

export default React.memo(NotificationsCard);
