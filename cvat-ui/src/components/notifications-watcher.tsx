// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import notification from 'antd/lib/notification';

import { CombinedState, ErrorState } from 'reducers';
import { resetErrors, resetMessages } from 'actions/notification-actions';
import { useHistory } from 'react-router';
import config from 'config';

function NotificationsWatcher(): null {
    const dispatch = useDispatch();
    const history = useHistory();

    const errors = useSelector((state: CombinedState) => state.notifications.errors);
    const messages = useSelector((state: CombinedState) => state.notifications.messages);

    useEffect(() => {
        let previousLocation: ReturnType<typeof useHistory>['location'] | null = null;
        const unregister = history.listen((location) => {
            const shouldResetNotifications = config.RESET_NOTIFICATIONS_PATHS.from.some(
                (pathname) => previousLocation?.pathname === pathname,
            );

            const pathExcluded = shouldResetNotifications && config.RESET_NOTIFICATIONS_PATHS.exclude.some(
                (pathname) => location.pathname.includes(pathname),
            );
            if (shouldResetNotifications && !pathExcluded) {
                notification.destroy();
                dispatch(resetErrors());
                dispatch(resetMessages());
            }

            previousLocation = location;
        });
        return unregister;
    }, []);

    useEffect(() => {
        function showMessage(title: string): void {
            notification.info({
                message: (
                    <ReactMarkdown>{title}</ReactMarkdown>
                ),
                duration: null,
            });
        }

        let shown = false;
        for (const where of Object.keys(messages)) {
            const domain = messages[where as keyof typeof messages];
            for (const what of Object.keys(domain)) {
                const message = domain[what as keyof typeof domain];
                shown = shown || !!message;
                if (message) {
                    showMessage(message);
                }
            }
        }

        if (shown) {
            dispatch(resetMessages());
        }
    }, [messages]);

    useEffect(() => {
        function showError(title: string, _error: Error, shouldLog?: boolean, className?: string): void {
            const error = _error?.message || _error.toString();
            const dynamicProps = typeof className === 'undefined' ? {} : { className };
            let errorLength = error.length;
            // Do not count the length of the link in the Markdown error message
            if (/]\(.+\)/.test(error)) {
                errorLength = error.replace(/]\(.+\)/, ']').length;
            }
            notification.error({
                ...dynamicProps,
                message: (
                    <ReactMarkdown>{title}</ReactMarkdown>
                ),
                duration: null,
                description: errorLength > 300 ? 'Open the Browser Console to get details' : <ReactMarkdown>{error}</ReactMarkdown>,
            });

            if (shouldLog) {
                setTimeout(() => {
                    // throw the error to be caught by global listener
                    throw _error;
                });
            } else {
                console.error(error);
            }
        }

        let shown = false;
        for (const where of Object.keys(errors)) {
            const domain = errors[where as keyof typeof errors];
            for (const what of Object.keys(domain)) {
                const error = domain[what as keyof typeof domain] as ErrorState;
                shown = shown || !!error;
                if (error) {
                    showError(error.message, error.reason, error.shouldLog, error.className);
                }
            }
        }

        if (shown) {
            dispatch(resetErrors());
        }
    }, [errors]);

    return null;
}

export default React.memo(NotificationsWatcher);
