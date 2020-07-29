// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import 'antd/dist/antd.css';
import '../styles.scss';
import React from 'react';
import { Switch, Route, Redirect } from 'react-router';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { GlobalHotKeys, ExtendedKeyMapOptions, configure } from 'react-hotkeys';
import Spin from 'antd/lib/spin';
import Layout from 'antd/lib/layout';
import notification from 'antd/lib/notification';

import GlobalErrorBoundary from 'components/global-error-boundary/global-error-boundary';
import ShorcutsDialog from 'components/shortcuts-dialog/shortcuts-dialog';
import TasksPageContainer from 'containers/tasks-page/tasks-page';
import CreateTaskPageContainer from 'containers/create-task-page/create-task-page';
import TaskPageContainer from 'containers/task-page/task-page';
import ModelsPageContainer from 'containers/models-page/models-page';
import AnnotationPageContainer from 'containers/annotation-page/annotation-page';
import LoginPageContainer from 'containers/login-page/login-page';
import RegisterPageContainer from 'containers/register-page/register-page';
import HeaderContainer from 'containers/header/header';
import { customWaViewHit } from 'utils/enviroment';

import getCore from 'cvat-core-wrapper';
import { NotificationsState } from 'reducers/interfaces';

interface CVATAppProps {
    loadFormats: () => void;
    loadUsers: () => void;
    loadAbout: () => void;
    verifyAuthorized: () => void;
    loadUserAgreements: () => void;
    initPlugins: () => void;
    resetErrors: () => void;
    resetMessages: () => void;
    switchShortcutsDialog: () => void;
    switchSettingsDialog: () => void;
    keyMap: Record<string, ExtendedKeyMapOptions>;
    userInitialized: boolean;
    userFetching: boolean;
    pluginsInitialized: boolean;
    pluginsFetching: boolean;
    formatsInitialized: boolean;
    formatsFetching: boolean;
    usersInitialized: boolean;
    usersFetching: boolean;
    aboutInitialized: boolean;
    aboutFetching: boolean;
    userAgreementsFetching: boolean;
    userAgreementsInitialized: boolean;
    notifications: NotificationsState;
    user: any;
}

class CVATApplication extends React.PureComponent<CVATAppProps & RouteComponentProps> {
    public componentDidMount(): void {
        const core = getCore();
        const { verifyAuthorized, history, location } = this.props;
        configure({ ignoreRepeatedEventsWhenKeyHeldDown: false });

        // Logger configuration
        const userActivityCallback: (() => void)[] = [];
        window.addEventListener('click', () => {
            userActivityCallback.forEach((handler) => handler());
        });
        core.logger.configure(() => window.document.hasFocus, userActivityCallback);

        customWaViewHit(location.pathname, location.search, location.hash);
        history.listen((_location) => {
            customWaViewHit(_location.pathname, _location.search, _location.hash);
        });

        verifyAuthorized();
    }

    public componentDidUpdate(): void {
        const {
            verifyAuthorized,
            loadFormats,
            loadUsers,
            loadAbout,
            loadUserAgreements,
            initPlugins,
            userInitialized,
            userFetching,
            formatsInitialized,
            formatsFetching,
            usersInitialized,
            usersFetching,
            aboutInitialized,
            aboutFetching,
            pluginsInitialized,
            pluginsFetching,
            user,
            userAgreementsFetching,
            userAgreementsInitialized,
        } = this.props;

        this.showErrors();
        this.showMessages();

        if (!userInitialized && !userFetching) {
            verifyAuthorized();
            return;
        }

        if (!userAgreementsInitialized && !userAgreementsFetching) {
            loadUserAgreements();
            return;
        }

        if (user == null) {
            return;
        }

        if (!formatsInitialized && !formatsFetching) {
            loadFormats();
        }

        if (!usersInitialized && !usersFetching) {
            loadUsers();
        }

        if (!aboutInitialized && !aboutFetching) {
            loadAbout();
        }

        if (!pluginsInitialized && !pluginsFetching) {
            initPlugins();
        }
    }

    private showMessages(): void {
        function showMessage(title: string): void {
            notification.info({
                message: (
                    <div
                        // eslint-disable-next-line
                        dangerouslySetInnerHTML={{
                            __html: title,
                        }}
                    />
                ),
                duration: null,
            });
        }

        const {
            notifications,
            resetMessages,
        } = this.props;

        let shown = false;
        for (const where of Object.keys(notifications.messages)) {
            for (const what of Object.keys(notifications.messages[where])) {
                const message = notifications.messages[where][what];
                shown = shown || !!message;
                if (message) {
                    showMessage(message);
                }
            }
        }

        if (shown) {
            resetMessages();
        }
    }

    private showErrors(): void {
        function showError(title: string, _error: any): void {
            const error = _error.toString();
            notification.error({
                message: (
                    <div
                        // eslint-disable-next-line
                        dangerouslySetInnerHTML={{
                            __html: title,
                        }}
                    />
                ),
                duration: null,
                description: error.length > 200 ? 'Open the Browser Console to get details' : error,
            });

            // eslint-disable-next-line no-console
            console.error(error);
        }

        const {
            notifications,
            resetErrors,
        } = this.props;

        let shown = false;
        for (const where of Object.keys(notifications.errors)) {
            for (const what of Object.keys(notifications.errors[where])) {
                const error = notifications.errors[where][what];
                shown = shown || !!error;
                if (error) {
                    showError(error.message, error.reason);
                }
            }
        }

        if (shown) {
            resetErrors();
        }
    }

    // Where you go depends on your URL
    public render(): JSX.Element {
        const {
            userInitialized,
            usersInitialized,
            aboutInitialized,
            pluginsInitialized,
            formatsInitialized,
            switchShortcutsDialog,
            switchSettingsDialog,
            user,
            keyMap,
        } = this.props;

        const readyForRender = (userInitialized && user == null)
            || (userInitialized && formatsInitialized
                && pluginsInitialized && usersInitialized && aboutInitialized);

        const subKeyMap = {
            SWITCH_SHORTCUTS: keyMap.SWITCH_SHORTCUTS,
            SWITCH_SETTINGS: keyMap.SWITCH_SETTINGS,
        };

        const handlers = {
            SWITCH_SHORTCUTS: (event: KeyboardEvent | undefined) => {
                if (event) event.preventDefault();

                switchShortcutsDialog();
            },
            SWITCH_SETTINGS: (event: KeyboardEvent | undefined) => {
                if (event) event.preventDefault();

                switchSettingsDialog();
            },
        };

        if (readyForRender) {
            if (user) {
                return (
                    <GlobalErrorBoundary>
                        <Layout>
                            <HeaderContainer> </HeaderContainer>
                            <Layout.Content>
                                <ShorcutsDialog />
                                <GlobalHotKeys keyMap={subKeyMap} handlers={handlers}>
                                    <Switch>
                                        <Route exact path='/tasks' component={TasksPageContainer} />
                                        <Route exact path='/tasks/create' component={CreateTaskPageContainer} />
                                        <Route exact path='/tasks/:id' component={TaskPageContainer} />
                                        <Route exact path='/tasks/:tid/jobs/:jid' component={AnnotationPageContainer} />
                                        <Route exact path='/models' component={ModelsPageContainer} />
                                        <Redirect push to='/tasks' />
                                    </Switch>
                                </GlobalHotKeys>
                                {/* eslint-disable-next-line */}
                                <a id='downloadAnchor' style={{ display: 'none' }} download />
                            </Layout.Content>
                        </Layout>
                    </GlobalErrorBoundary>
                );
            }

            return (
                <GlobalErrorBoundary>
                    <Switch>
                        <Route exact path='/auth/register' component={RegisterPageContainer} />
                        <Route exact path='/auth/login' component={LoginPageContainer} />
                        <Redirect to='/auth/login' />
                    </Switch>
                </GlobalErrorBoundary>
            );
        }

        return (
            <Spin size='large' className='cvat-spinner' />
        );
    }
}

export default withRouter(CVATApplication);
