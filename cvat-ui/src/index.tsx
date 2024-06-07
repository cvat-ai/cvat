// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import Modal from 'antd/lib/modal';
import Paragraph from 'antd/es/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import EventRecorder from 'utils/event-recorder';

import CVATApplication from 'components/cvat-app';
import InvitationWatcher from 'components/invitation-watcher/invitation-watcher';

import { ShortcutsContextProvider } from 'components/shortcuts.context';
import GlobalErrorBoundary from 'components/global-error-boundary/global-error-boundary';
import NotificationsWatcher from 'components/notifications-watcher';
import PluginsEntrypoint from 'components/plugins-entrypoint';
import LayoutGrid from 'components/layout-grid/layout-grid';
import logger, { EventScope } from 'cvat-logger';
import { Organization, User, getCore } from 'cvat-core-wrapper';
import createCVATStore, { getCVATStore } from 'cvat-store';
import createRootReducer from 'reducers/root-reducer';
import showPlatformNotification, {
    platformInfo,
    stopNotifications,
    showUnsupportedNotification,
} from 'utils/platform-checker';

import { CombinedState } from './reducers';

createCVATStore(createRootReducer);

const cvatStore = getCVATStore();
const core = getCore();
const root = createRoot(document.getElementById('root') as HTMLDivElement);

root.render((
    <Provider store={cvatStore}>
        <BrowserRouter>
            <PluginsEntrypoint />
            <GlobalErrorBoundary>
                <ShortcutsContextProvider>
                    <NotificationsWatcher />
                    <InvitationWatcher />
                    <CVATApplication />
                </ShortcutsContextProvider>
            </GlobalErrorBoundary>
        </BrowserRouter>
        <LayoutGrid />
    </Provider>
));

function validatePlatform(): void {
    const { name, version } = platformInfo();

    if (showUnsupportedNotification()) {
        Modal.error({
            title: 'Unsupported features detected',
            className: 'cvat-modal-unsupported-features-warning',
            content: (
                <>
                    <Paragraph>
                        <Text type='danger'>{`${name} v${version} does not support the necessary API features for CVAT. `}</Text>
                        <Text>
                            CVAT is compatible with the latest versions of
                            <Text strong> Google Chrome </Text>
                            and
                            <Text strong> Mozilla Firefox </Text>
                        </Text>
                    </Paragraph>
                    <Text type='secondary'>We recommend using Google Chrome (or another Chromium-based browser) for the best experience</Text>
                </>
            ),
            onOk: () => stopNotifications(),
        });
    } else if (showPlatformNotification()) {
        Modal.warning({
            title: 'Unsupported platform detected',
            className: 'cvat-modal-unsupported-platform-warning',
            content: (
                <>
                    <Paragraph>
                        <Text>
                            {`The browser you are using is ${name} ${version} may be not fully supported by CVAT. `}
                            CVAT is compatible with the latest versions of
                            <Text strong> Google Chrome </Text>
                            and
                            <Text strong> Mozilla Firefox </Text>
                        </Text>
                    </Paragraph>
                    <Text type='secondary'>We recommend using Google Chrome (or another Chromium-based browser) for the best experience</Text>
                </>
            ),
            onOk: () => stopNotifications(),
        });
    }
}

function configureGlobalErrorHandler(): void {
    window.addEventListener('error', (errorEvent: ErrorEvent): boolean => {
        const {
            filename, lineno, colno, error,
        } = errorEvent;

        if (
            filename && typeof lineno === 'number' &&
            typeof colno === 'number' && error
        ) {
            // weird react behaviour
            // it also gets event only in development environment, caught and handled in componentDidCatch
            // discussion is here https://github.com/facebook/react/issues/10474
            // and workaround is:
            if (error.stack && error.stack.indexOf('invokeGuardedCallbackDev') >= 0) {
                return true;
            }

            const logPayload = {
                filename: errorEvent.filename,
                line: errorEvent.lineno,
                message: errorEvent.error.message,
                column: errorEvent.colno,
                stack: errorEvent.error.stack,
            };

            const store = getCVATStore();
            const state: CombinedState = store.getState();
            const { pathname } = window.location;
            const re = /\/tasks\/[0-9]+\/jobs\/[0-9]+$/;
            const { instance: job } = state.annotation.job;
            if (re.test(pathname) && job) {
                job.logger.log(EventScope.exception, logPayload, false);
            } else {
                logger.log(EventScope.exception, logPayload);
            }
        }

        return false;
    });
}

function configureEventRecorder(): void {
    // Logger configuration
    window.addEventListener('click', (event: MouseEvent) => {
        EventRecorder.recordMouseEvent(event);
    });

    let previousUser: User | null = null;
    cvatStore.subscribe(() => {
        const state = cvatStore.getState();
        if (state.auth.user && !previousUser) {
            EventRecorder.initSave();
        } else if (!state.auth.user && previousUser) {
            EventRecorder.cancelSave();
        }

        previousUser = state.auth.user;
    });
}

function configureCore(): void {
    core.logger.configure(() => window.document.hasFocus());
    core.config.onOrganizationChange = (newOrgId: number | null) => {
        if (newOrgId === null) {
            localStorage.removeItem('currentOrganization');
            window.location.reload();
        } else {
            core.organizations.get({
                filter: `{"and":[{"==":[{"var":"id"},${newOrgId}]}]}`,
            }).then(([organization]: Organization[]) => {
                if (organization) {
                    localStorage.setItem('currentOrganization', organization.slug);
                    window.location.reload();
                }
            });
        }
    };
}

configureGlobalErrorHandler();
configureEventRecorder();
configureCore();
validatePlatform();
