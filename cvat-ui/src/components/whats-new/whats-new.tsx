// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, {
    useEffect, useMemo, useRef, useState,
} from 'react';
import { useSelector } from 'react-redux';
import { ArrowUpOutlined, NotificationOutlined } from '@ant-design/icons';
import Alert from 'antd/lib/alert';
import Badge from 'antd/lib/badge';
import Button from 'antd/lib/button';
import ConfigProvider from 'antd/lib/config-provider';
import Modal from 'antd/lib/modal';
import Spin from 'antd/lib/spin';
import automaticPopupController from 'utils/automatic-popup-controller';
import { CombinedState } from 'reducers';

import {
    ReleaseNote, SeenState, Updates, UpdatesAcknowledgement, compareVersions, contentURL, isNewVersion,
    announcementKey, latestAnnouncementsDate, unseenAnnouncements,
} from './feed';
import { acknowledge, fetchUpdates } from './server';
import AnnouncementCarousel from './announcement-carousel';
import ReleaseSummary from './release-summary';
import { WHATS_NEW_STYLE, WHATS_NEW_THEME } from './theme';

interface Props {
    userId: number;
    autoOpenBlocked: boolean;
}

function mergeSeenState(current: SeenState | null, next: SeenState): SeenState {
    const previousVersion = current?.lastSeenReleaseNotesVersion;
    const previousDate = current?.lastSeenAnnouncementsDate;
    const keepPreviousVersion = previousVersion && (!next.lastSeenReleaseNotesVersion ||
        compareVersions(previousVersion, next.lastSeenReleaseNotesVersion) > 0);
    const keepPreviousDate = previousDate && (!next.lastSeenAnnouncementsDate ||
        Date.parse(previousDate) > Date.parse(next.lastSeenAnnouncementsDate));
    return {
        ...next,
        lastSeenReleaseNotesVersion: keepPreviousVersion ?
            previousVersion : next.lastSeenReleaseNotesVersion,
        lastSeenAnnouncementsDate: keepPreviousDate ?
            previousDate : next.lastSeenAnnouncementsDate,
    };
}

export default function WhatsNew(props: Props): JSX.Element {
    const [updates, setUpdates] = useState<Updates | null>(null);
    const [seen, setSeen] = useState<SeenState | null>(null);
    const [selectedRelease, setSelectedRelease] = useState<ReleaseNote | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [ackError, setAckError] = useState(false);
    const [openingSeen, setOpeningSeen] = useState<SeenState | null>(null);
    const [open, setOpen] = useState(false);
    const [retry, setRetry] = useState(0);
    const [ackRetry, setAckRetry] = useState(0);
    const offered = useRef(false);
    const manuallyOpened = useRef(false);
    const ackRequests = useRef(new Set<string>());
    const profilePromotionsAllowed = useSelector((state: CombinedState) => (
        state.growth.data?.owner.id === props.userId ? state.growth.data.promotionNotificationsAllowed : undefined
    ));
    const promotionsAllowed = profilePromotionsAllowed ?? seen?.promotionNotificationsAllowed ?? false;
    const promotionsAllowedRef = useRef(promotionsAllowed);
    promotionsAllowedRef.current = promotionsAllowed;
    const blocked = props.autoOpenBlocked;
    const blockedRef = useRef(blocked);
    blockedRef.current = blocked;
    const seenRef = useRef(seen);
    seenRef.current = seen;

    // The backend merges both sources, deduplicates articles, and returns the
    // latest five previews, including seen ones, in publication order.
    // The displayed batch is acknowledged together; it is not a per-slide read log.
    const announcements = useMemo(() => updates?.announcements || [], [updates]);
    const announcementsDate = latestAnnouncementsDate(announcements);
    const unreadAnnouncements = unseenAnnouncements(
        announcements, seen?.lastSeenAnnouncementsDate || null,
    ).length > 0;
    const latestAnnouncedRelease = updates?.releases.find((release) => release.announce);
    const unreadRelease = !!latestAnnouncedRelease && isNewVersion(
        latestAnnouncedRelease.version, seen?.lastSeenReleaseNotesVersion || '',
    );
    const ready = !!updates && !loading && !loadError;
    const hasContent = !!selectedRelease || announcements.length > 0;
    const canAcknowledgeAnnouncements = updates?.canAcknowledgeAnnouncements || false;
    const newAnnouncementKeys = useMemo(() => new Set(unseenAnnouncements(
        announcements, openingSeen?.lastSeenAnnouncementsDate || null,
    ).map(announcementKey)), [announcements, openingSeen]);
    const newRelease = !!openingSeen && !!selectedRelease && isNewVersion(
        selectedRelease.version, openingSeen.lastSeenReleaseNotesVersion,
    );
    const historyURL = updates?.updatesHistoryURL ||
        (updates?.releaseHistoryURL ? contentURL('../updates/', updates.releaseHistoryURL) : undefined);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setLoadError(false);
        fetchUpdates(controller.signal).then((result) => {
            if (!controller.signal.aborted) {
                setUpdates(result);
                setSeen((current) => mergeSeenState(current, result.state));
                setSelectedRelease(result.releases[0] || null);
                setAckError(false);
            }
        }).catch(() => {
            if (!controller.signal.aborted) setLoadError(true);
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [retry]);

    useEffect(() => {
        if (!promotionsAllowed && offered.current) automaticPopupController.offer('whats-new', null);
        automaticPopupController.refresh();
    }, [blocked, promotionsAllowed]);
    useEffect(() => () => { automaticPopupController.offer('whats-new', null); }, []);

    // Capture before acknowledging; highlights remain stable until this popup closes.
    // Manual opening while metadata is loading captures when it becomes available.
    useEffect(() => {
        if (open && ready && !openingSeen) setOpeningSeen(seen || updates?.state || null);
    }, [open, ready, openingSeen, seen, updates]);

    useEffect(() => {
        if (loading || offered.current) return;
        offered.current = true;
        if (!updates || loadError || manuallyOpened.current || !promotionsAllowed) {
            automaticPopupController.offer('whats-new', null);
            return;
        }
        const release = updates.releases.find((item) => item.announce &&
            isNewVersion(item.version, updates.state.lastSeenReleaseNotesVersion));
        const promoteAnnouncements = unseenAnnouncements(
            announcements, updates.state.lastSeenAnnouncementsDate,
        ).some((item) => item.announce);
        if (!release && !promoteAnnouncements) {
            automaticPopupController.offer('whats-new', null);
            return;
        }
        automaticPopupController.offer('whats-new', () => {
            if (!promotionsAllowedRef.current) {
                automaticPopupController.offer('whats-new', null);
                return false;
            }
            if (blockedRef.current) return false;
            setOpeningSeen(seenRef.current || updates.state);
            setSelectedRelease(release || updates.releases.find((item) => item.announce) || null);
            setOpen(true);
            return true;
        });
    }, [updates, loading, loadError, announcements, promotionsAllowed]);

    useEffect(() => {
        if (!open || !ready || !openingSeen) return undefined;
        const values: UpdatesAcknowledgement = {};
        if (selectedRelease && isNewVersion(selectedRelease.version, seen?.lastSeenReleaseNotesVersion || '')) {
            values.releaseVersion = selectedRelease.version;
        }
        if (announcementsDate && unreadAnnouncements && canAcknowledgeAnnouncements) {
            values.announcementsSeenAt = announcementsDate;
        }
        if (!Object.keys(values).length) return undefined;
        const key = JSON.stringify(values);
        if (ackRequests.current.has(key)) return undefined;
        ackRequests.current.add(key);
        const controller = new AbortController();
        let settled = false;
        acknowledge(values, controller.signal).then((result) => {
            if (!controller.signal.aborted) {
                settled = true;
                setSeen((current) => mergeSeenState(current, result));
                setAckError(false);
            }
        }).catch(() => {
            if (!controller.signal.aborted) {
                settled = true;
                ackRequests.current.delete(key);
                setAckError(true);
            }
        });
        return () => {
            controller.abort();
            if (!settled) ackRequests.current.delete(key);
        };
    }, [
        open, ready, openingSeen, selectedRelease, announcementsDate,
        unreadAnnouncements, canAcknowledgeAnnouncements, seen, ackRetry,
    ]);

    const close = (): void => {
        setOpen(false);
        setOpeningSeen(null);
    };
    return (
        <>
            <Badge dot={unreadRelease || unreadAnnouncements} color='blue' offset={[-6, 6]}>
                <Button
                    className='cvat-header-button cvat-release-notes-button'
                    type='link'
                    size='large'
                    icon={<NotificationOutlined />}
                    aria-label="What's new"
                    title="What's new"
                    onClick={() => {
                        manuallyOpened.current = true;
                        automaticPopupController.consume();
                        setOpeningSeen(seen || updates?.state || null);
                        setSelectedRelease(updates?.releases[0] || null);
                        setOpen(true);
                    }}
                />
            </Badge>
            <ConfigProvider theme={WHATS_NEW_THEME}>
                <Modal
                    className='cvat-release-notes-modal cvat-updates-overview-modal'
                    style={WHATS_NEW_STYLE}
                    title={<span className='cvat-updates-title'><NotificationOutlined /> What’s New in CVAT</span>}
                    open={open}
                    centered
                    width={1040}
                    onCancel={close}
                    destroyOnClose
                    footer={(
                        <div className='cvat-release-notes-footer-actions'>
                            <Button
                                className='cvat-updates-action cvat-updates-action-outline'
                                href={historyURL}
                                target='_blank'
                                rel='noopener noreferrer'
                                disabled={!historyURL}
                            >
                                View all updates <ArrowUpOutlined rotate={45} />
                            </Button>
                            <Button className='cvat-updates-action' onClick={close}>Close</Button>
                        </div>
                    )}
                >
                    {loading && <div className='cvat-release-notes-loading'><Spin /></div>}
                    {!loading && loadError && (
                        <Alert
                            type='warning'
                            showIcon
                            message='Updates are temporarily unavailable'
                            action={<Button onClick={() => setRetry((value) => value + 1)}>Retry loading</Button>}
                        />
                    )}
                    {!loading && !loadError && (
                        <div className='cvat-updates-overview'>
                            {ackError && (
                                <Alert
                                    type='warning'
                                    showIcon
                                    message='Could not save your seen status. These updates may appear again.'
                                    action={(
                                        <Button onClick={() => setAckRetry((value) => value + 1)}>Retry saving</Button>
                                    )}
                                />
                            )}
                            <AnnouncementCarousel items={announcements} newKeys={newAnnouncementKeys} />
                            {selectedRelease && (
                                <ReleaseSummary
                                    key={selectedRelease.version}
                                    release={selectedRelease}
                                    isNew={newRelease}
                                />
                            )}
                            {!hasContent && !updates?.errors.length && (
                                <div className='cvat-release-notes-empty'>
                                    <h2>You’re up to date</h2>
                                    <p>New announcements and release notes will appear here.</p>
                                </div>
                            )}
                            {!!updates?.errors.length && (
                                <Alert
                                    type='warning'
                                    showIcon
                                    message='Some updates are temporarily unavailable'
                                    description={!canAcknowledgeAnnouncements ?
                                        'Updates may appear again. Retry loading to save seen status.' : undefined}
                                    action={(
                                        <Button onClick={() => setRetry((value) => value + 1)}>Retry loading</Button>
                                    )}
                                />
                            )}
                        </div>
                    )}
                </Modal>
            </ConfigProvider>
        </>
    );
}
