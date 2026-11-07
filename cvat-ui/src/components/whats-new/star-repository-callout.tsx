// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { GithubOutlined, StarFilled } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Typography from 'antd/lib/typography';
import { updateGrowthDataAsync } from 'actions/growth-actions';
import appConfig from 'config';
import { CombinedState } from 'reducers';
import { ThunkDispatch } from 'utils/redux';

interface Props {
    open: boolean;
    active: boolean;
    userId: number;
}

export default function StarRepositoryCallout({ open, active, userId }: Props): JSX.Element | null {
    const growth = useSelector((state: CombinedState) => state.growth);
    const dispatch = useDispatch<ThunkDispatch>();
    const store = useStore<CombinedState>();
    const container = useRef<HTMLElement | null>(null);
    const impression = useRef<Promise<void> | null>(null);
    const clicked = useRef(false);
    const [eligible, setEligible] = useState(false);
    const data = growth.data?.owner.id === userId ? growth.data : null;

    useEffect(() => {
        if (!open) {
            setEligible(false);
            impression.current = null;
            clicked.current = false;
        } else if (active && !eligible && growth.initialized && !growth.fetching && data?.githubPromptEnabled) {
            // Keep the callout in this popup after its impression starts the cooldown.
            setEligible(true);
        }
    }, [open, active, eligible, growth.initialized, growth.fetching, data]);

    const recordImpression = useCallback((): Promise<void> => {
        if (!impression.current && store.getState().auth.user?.id === userId) {
            impression.current = dispatch(updateGrowthDataAsync({ githubPromptShown: true }));
        }
        return impression.current || Promise.resolve();
    }, [dispatch, store, userId]);

    const shown = eligible && !!data && data.promotionNotificationsAllowed && !data.githubPromptSupportClicked;

    useEffect(() => {
        if (!open || !active || !shown || !container.current) return undefined;
        let visible = false;
        const record = (): void => {
            if (visible && !window.document.hidden) recordImpression().catch(() => undefined);
        };
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
            record();
        }, { threshold: 0.5 });
        observer.observe(container.current);
        window.document.addEventListener('visibilitychange', record);
        return () => {
            observer.disconnect();
            window.document.removeEventListener('visibilitychange', record);
        };
    }, [open, active, shown, recordImpression]);

    if (!shown || !open || !active) return null;

    return (
        <aside className='cvat-release-notes-star-callout' aria-label='Support CVAT' ref={container}>
            <div className='cvat-release-notes-star-graphic' aria-hidden='true'><StarFilled /></div>
            <div className='cvat-release-notes-star-copy'>
                <Typography.Text strong className='cvat-release-notes-star-title'>Enjoying CVAT?</Typography.Text>
                <Typography.Paragraph type='secondary' className='cvat-release-notes-star-description'>
                    Your GitHub star helps more people discover CVAT.
                </Typography.Paragraph>
            </div>
            <Button
                className='cvat-release-notes-star-button'
                icon={<GithubOutlined />}
                href={appConfig.GITHUB_URL}
                target='_blank'
                rel='noopener noreferrer'
                onClick={() => {
                    if (clicked.current) return;
                    clicked.current = true;
                    // Sequence the writes so a late impression response cannot
                    // overwrite the click state in the shared Redux store.
                    recordImpression().then(() => {
                        if (store.getState().auth.user?.id === userId) {
                            return dispatch(updateGrowthDataAsync({ githubPromptSupportClicked: true }));
                        }
                        return undefined;
                    }).catch(() => undefined);
                }}
            >
                Star CVAT on GitHub
            </Button>
        </aside>
    );
}
