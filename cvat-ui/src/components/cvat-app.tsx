// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { Col, Row } from 'antd/lib/grid';
import Layout from 'antd/lib/layout';
import Modal from 'antd/lib/modal';
import notification from 'antd/lib/notification';
import Spin from 'antd/lib/spin';
import { DisconnectOutlined } from '@ant-design/icons';
import Space from 'antd/lib/space';
import Text from 'antd/lib/typography/Text';
import ReactMarkdown from 'react-markdown';
import 'antd/dist/antd.css';

import LogoutComponent from 'components/logout-component';
import LoginPageContainer from 'containers/login-page/login-page';
import LoginWithTokenComponent from 'components/login-with-token/login-with-token';
import RegisterPageContainer from 'containers/register-page/register-page';
import ResetPasswordPageConfirmComponent from 'components/reset-password-confirm-page/reset-password-confirm-page';
import ResetPasswordPageComponent from 'components/reset-password-page/reset-password-page';

import Header from 'components/header/header';
import GlobalErrorBoundary from 'components/global-error-boundary/global-error-boundary';

import ShortcutsDialog from 'components/shortcuts-dialog/shortcuts-dialog';
import ExportDatasetModal from 'components/export-dataset/export-dataset-modal';
import ExportBackupModal from 'components/export-backup/export-backup-modal';
import ImportDatasetModal from 'components/import-dataset/import-dataset-modal';
import ImportBackupModal from 'components/import-backup/import-backup-modal';

import JobsPageComponent from 'components/jobs-page/jobs-page';
import ModelsPageComponent from 'components/models-page/models-page';

import TasksPageContainer from 'containers/tasks-page/tasks-page';
import CreateTaskPageContainer from 'containers/create-task-page/create-task-page';
import TaskPageComponent from 'components/task-page/task-page';

import ProjectsPageComponent from 'components/projects-page/projects-page';
import CreateProjectPageComponent from 'components/create-project-page/create-project-page';
import ProjectPageComponent from 'components/project-page/project-page';

import CloudStoragesPageComponent from 'components/cloud-storages-page/cloud-storages-page';
import CreateCloudStoragePageComponent from 'components/create-cloud-storage-page/create-cloud-storage-page';
import UpdateCloudStoragePageComponent from 'components/update-cloud-storage-page/update-cloud-storage-page';

import OrganizationPage from 'components/organization-page/organization-page';
import CreateOrganizationComponent from 'components/create-organization-page/create-organization-page';
import { ShortcutsContextProvider } from 'components/shortcuts.context';

import WebhooksPage from 'components/webhooks-page/webhooks-page';
import CreateWebhookPage from 'components/setup-webhook-pages/create-webhook-page';
import UpdateWebhookPage from 'components/setup-webhook-pages/update-webhook-page';

import AnnotationPageContainer from 'containers/annotation-page/annotation-page';
import { getCore } from 'cvat-core-wrapper';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { NotificationsState, PluginsState } from 'reducers';
import { customWaViewHit } from 'utils/environment';
import showPlatformNotification, {
    platformInfo,
    stopNotifications,
    showUnsupportedNotification,
} from 'utils/platform-checker';
import '../styles.scss';
import appConfig from 'config';
import EventRecorder from 'utils/controls-logger';
import EmailConfirmationPage from './email-confirmation-pages/email-confirmed';
import EmailVerificationSentPage from './email-confirmation-pages/email-verification-sent';
import IncorrectEmailConfirmationPage from './email-confirmation-pages/incorrect-email-confirmation';
import CreateModelPage from './create-model-page/create-model-page';

interface CVATAppProps {
    loadFormats: () => void;
    loadAbout: () => void;
    verifyAuthorized: () => void;
    loadUserAgreements: () => void;
    initPlugins: () => void;
    initModels: () => void;
    resetErrors: () => void;
    resetMessages: () => void;
    switchShortcutsDialog: () => void;
    switchSettingsDialog: () => void;
    loadAuthActions: () => void;
    loadOrganizations: () => void;
    keyMap: KeyMap;
    userInitialized: boolean;
    userFetching: boolean;
    organizationsFetching: boolean;
    organizationsInitialized: boolean;
    pluginsInitialized: boolean;
    pluginsFetching: boolean;
    modelsInitialized: boolean;
    modelsFetching: boolean;
    formatsInitialized: boolean;
    formatsFetching: boolean;
    aboutInitialized: boolean;
    aboutFetching: boolean;
    userAgreementsFetching: boolean;
    userAgreementsInitialized: boolean;
    authActionsFetching: boolean;
    authActionsInitialized: boolean;
    notifications: NotificationsState;
    user: any;
    isModelPluginActive: boolean;
    pluginComponents: PluginsState['components'];
}

interface CVATAppState {
    healthIinitialized: boolean;
    backendIsHealthy: boolean;
}

class CVATApplication extends React.PureComponent<CVATAppProps & RouteComponentProps, CVATAppState> {
    constructor(props: CVATAppProps & RouteComponentProps) {
        super(props);

        this.state = {
            healthIinitialized: false,
            backendIsHealthy: false,
        };
    }

    public componentDidMount(): void {
        const core = getCore();
        const { history, location } = this.props;
        const {
            HEALTH_CHECK_RETRIES, HEALTH_CHECK_PERIOD, HEALTH_CHECK_REQUEST_TIMEOUT, SERVER_UNAVAILABLE_COMPONENT,
            RESET_NOTIFICATIONS_PATHS,
        } = appConfig;
        // configure({ ignoreRepeatedEventsWhenKeyHeldDown: false });

        // Logger configuration
        const userActivityCallback: (() => void)[] = [];
        window.addEventListener('click', (event: MouseEvent) => {
            userActivityCallback.forEach((handler) => handler());
            EventRecorder.log(event);
        });

        core.logger.configure(() => window.document.hasFocus, userActivityCallback);
        EventRecorder.initSave();

        customWaViewHit(location.pathname, location.search, location.hash);
        history.listen((newLocation) => {
            customWaViewHit(newLocation.pathname, newLocation.search, newLocation.hash);
            const { location: prevLocation } = this.props;
            const shouldResetNotifications = RESET_NOTIFICATIONS_PATHS.from.some(
                (pathname) => prevLocation.pathname === pathname,
            );
            const pathExcluded = shouldResetNotifications && RESET_NOTIFICATIONS_PATHS.exclude.some(
                (pathname) => newLocation.pathname.includes(pathname),
            );
            if (shouldResetNotifications && !pathExcluded) {
                this.resetNotifications();
            }
        });

        core.server.healthCheck(
            HEALTH_CHECK_RETRIES,
            HEALTH_CHECK_PERIOD,
            HEALTH_CHECK_REQUEST_TIMEOUT,
        ).then(() => {
            this.setState({
                healthIinitialized: true,
                backendIsHealthy: true,
            });
        })
            .catch(() => {
                this.setState({
                    healthIinitialized: true,
                    backendIsHealthy: false,
                });

                Modal.error({
                    title: 'Cannot connect to the server',
                    className: 'cvat-modal-cannot-connect-server',
                    closable: false,
                    content:
    <Text>
        {SERVER_UNAVAILABLE_COMPONENT}
    </Text>,
                });
            });

        const {
            name, version, engine, os,
        } = platformInfo();

        if (showPlatformNotification()) {
            stopNotifications(false);
            Modal.warning({
                title: 'Unsupported platform detected',
                className: 'cvat-modal-unsupported-platform-warning',
                content: (
                    <>
                        <Row>
                            <Col>
                                <Text>
                                    {`The browser you are using is ${name} ${version} based on ${engine}.` +
                                        ' CVAT was tested in the latest versions of Chrome and Firefox.' +
                                        ' We recommend to use Chrome (or another Chromium based browser)'}
                                </Text>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Text type='secondary'>{`The operating system is ${os}`}</Text>
                            </Col>
                        </Row>
                    </>
                ),
                onOk: () => stopNotifications(true),
            });
        } else if (showUnsupportedNotification()) {
            stopNotifications(false);
            Modal.warning({
                title: 'Unsupported features detected',
                className: 'cvat-modal-unsupported-features-warning',
                content: (
                    <Text>
                        {`${name} v${version} does not support API, which is used by CVAT. `}
                        It is strongly recommended to update your browser.
                    </Text>
                ),
                onOk: () => stopNotifications(true),
            });
        }
    }

    public componentDidUpdate(): void {
        const {
            verifyAuthorized,
            loadFormats,
            loadAbout,
            loadUserAgreements,
            initPlugins,
            initModels,
            loadOrganizations,
            loadAuthActions,
            userInitialized,
            userFetching,
            organizationsFetching,
            organizationsInitialized,
            formatsInitialized,
            formatsFetching,
            aboutInitialized,
            aboutFetching,
            pluginsInitialized,
            pluginsFetching,
            modelsInitialized,
            modelsFetching,
            user,
            userAgreementsFetching,
            userAgreementsInitialized,
            authActionsFetching,
            authActionsInitialized,
            isModelPluginActive,
        } = this.props;

        const { backendIsHealthy } = this.state;

        if (!backendIsHealthy) {
            return;
        }

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

        if (!authActionsInitialized && !authActionsFetching) {
            loadAuthActions();
        }

        if (user == null || !user.isVerified) {
            return;
        }

        if (!organizationsInitialized && !organizationsFetching) {
            loadOrganizations();
        }

        if (!formatsInitialized && !formatsFetching) {
            loadFormats();
        }

        if (!aboutInitialized && !aboutFetching) {
            loadAbout();
        }

        if (isModelPluginActive && !modelsInitialized && !modelsFetching) {
            initModels();
        }

        if (!pluginsInitialized && !pluginsFetching) {
            initPlugins();
        }
    }

    private showMessages(): void {
        function showMessage(title: string): void {
            notification.info({
                message: (
                    <ReactMarkdown>{title}</ReactMarkdown>
                ),
                duration: null,
            });
        }

        const { notifications, resetMessages } = this.props;

        let shown = false;
        for (const where of Object.keys(notifications.messages)) {
            for (const what of Object.keys((notifications as any).messages[where])) {
                const message = (notifications as any).messages[where][what];
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
        function showError(title: string, _error: any, className?: string): void {
            const error = _error.toString();
            const dynamicProps = typeof className === 'undefined' ? {} : { className };
            notification.error({
                ...dynamicProps,
                message: (
                    <ReactMarkdown>{title}</ReactMarkdown>
                ),
                duration: null,
                description: error.length > 300 ? 'Open the Browser Console to get details' : <ReactMarkdown>{error}</ReactMarkdown>,
            });

            // eslint-disable-next-line no-console
            console.error(error);
        }

        const { notifications, resetErrors } = this.props;

        let shown = false;
        for (const where of Object.keys(notifications.errors)) {
            for (const what of Object.keys((notifications as any).errors[where])) {
                const error = (notifications as any).errors[where][what];
                shown = shown || !!error;
                if (error) {
                    showError(error.message, error.reason, error.className);
                }
            }
        }

        if (shown) {
            resetErrors();
        }
    }

    private resetNotifications(): void {
        const { resetErrors, resetMessages } = this.props;

        notification.destroy();
        resetErrors();
        resetMessages();
    }

    // Where you go depends on your URL
    public render(): JSX.Element {
        const {
            userInitialized,
            aboutInitialized,
            pluginsInitialized,
            formatsInitialized,
            modelsInitialized,
            organizationsInitialized,
            userAgreementsInitialized,
            authActionsInitialized,
            switchShortcutsDialog,
            switchSettingsDialog,
            pluginComponents,
            user,
            keyMap,
            location,
            isModelPluginActive,
        } = this.props;

        const { healthIinitialized, backendIsHealthy } = this.state;

        const notRegisteredUserInitialized = (userInitialized && (user == null || !user.isVerified));
        let readyForRender = userAgreementsInitialized && authActionsInitialized;
        readyForRender = readyForRender && (notRegisteredUserInitialized ||
            (
                userInitialized &&
                formatsInitialized &&
                pluginsInitialized &&
                aboutInitialized &&
                organizationsInitialized &&
                (!isModelPluginActive || modelsInitialized)
            )
        );

        const subKeyMap = {
            SWITCH_SHORTCUTS: keyMap.SWITCH_SHORTCUTS,
            SWITCH_SETTINGS: keyMap.SWITCH_SETTINGS,
        };

        const handlers = {
            SWITCH_SHORTCUTS: (event: KeyboardEvent) => {
                if (event) event.preventDefault();

                switchShortcutsDialog();
            },
            SWITCH_SETTINGS: (event: KeyboardEvent) => {
                if (event) event.preventDefault();

                switchSettingsDialog();
            },
        };

        const routesToRender = pluginComponents.router
            .filter(({ data: { shouldBeRendered } }) => shouldBeRendered(this.props, this.state))
            .map(({ component: Component }) => Component());

        const loggedInModals = pluginComponents.loggedInModals
            .filter(({ data: { shouldBeRendered } }) => shouldBeRendered(this.props, this.state))
            .map(({ component: Component }) => Component);

        if (readyForRender) {
            if (user && user.isVerified) {
                return (
                    <GlobalErrorBoundary>
                        <ShortcutsContextProvider>
                            <Layout>
                                <Header />
                                <Layout.Content style={{ height: '100%' }}>
                                    <ShortcutsDialog />
                                    <GlobalHotKeys keyMap={subKeyMap} handlers={handlers}>
                                        <Switch>
                                            <Route exact path='/auth/logout' component={LogoutComponent} />
                                            <Route exact path='/projects' component={ProjectsPageComponent} />
                                            <Route exact path='/projects/create' component={CreateProjectPageComponent} />
                                            <Route exact path='/projects/:id' component={ProjectPageComponent} />
                                            <Route exact path='/projects/:id/webhooks' component={WebhooksPage} />
                                            <Route exact path='/tasks' component={TasksPageContainer} />
                                            <Route exact path='/tasks/create' component={CreateTaskPageContainer} />
                                            <Route exact path='/tasks/:id' component={TaskPageComponent} />
                                            <Route exact path='/tasks/:tid/jobs/:jid' component={AnnotationPageContainer} />
                                            <Route exact path='/jobs' component={JobsPageComponent} />
                                            <Route exact path='/cloudstorages' component={CloudStoragesPageComponent} />
                                            <Route
                                                exact
                                                path='/cloudstorages/create'
                                                component={CreateCloudStoragePageComponent}
                                            />
                                            <Route
                                                exact
                                                path='/cloudstorages/update/:id'
                                                component={UpdateCloudStoragePageComponent}
                                            />
                                            <Route
                                                exact
                                                path='/organizations/create'
                                                component={CreateOrganizationComponent}
                                            />
                                            <Route exact path='/organization/webhooks' component={WebhooksPage} />
                                            <Route exact path='/webhooks/create' component={CreateWebhookPage} />
                                            <Route exact path='/webhooks/update/:id' component={UpdateWebhookPage} />
                                            <Route exact path='/organization' component={OrganizationPage} />
                                            { routesToRender }
                                            {isModelPluginActive && (
                                                <Route
                                                    path='/models'
                                                >
                                                    <Switch>
                                                        <Route exact path='/models' component={ModelsPageComponent} />
                                                        <Route exact path='/models/create' component={CreateModelPage} />
                                                    </Switch>
                                                </Route>
                                            )}
                                            <Redirect
                                                push
                                                to={new URLSearchParams(location.search).get('next') || '/tasks'}
                                            />
                                        </Switch>
                                    </GlobalHotKeys>
                                    {/* eslint-disable-next-line */}
                                    <ExportDatasetModal />
                                    <ExportBackupModal />
                                    <ImportDatasetModal />
                                    <ImportBackupModal />
                                    { loggedInModals.map((Component, idx) => (
                                        <Component key={idx} targetProps={this.props} targetState={this.state} />
                                    ))}
                                    {/* eslint-disable-next-line */}
                                    <a id='downloadAnchor' target='_blank' style={{ display: 'none' }} download />
                                </Layout.Content>
                            </Layout>
                        </ShortcutsContextProvider>
                    </GlobalErrorBoundary>
                );
            }

            return (
                <GlobalErrorBoundary>
                    <Switch>
                        <Route exact path='/auth/register' component={RegisterPageContainer} />
                        <Route exact path='/auth/email-verification-sent' component={EmailVerificationSentPage} />
                        <Route exact path='/auth/incorrect-email-confirmation' component={IncorrectEmailConfirmationPage} />
                        <Route exact path='/auth/login' component={LoginPageContainer} />
                        <Route
                            exact
                            path='/auth/login-with-token/:token'
                            component={LoginWithTokenComponent}
                        />
                        <Route exact path='/auth/password/reset' component={ResetPasswordPageComponent} />
                        <Route
                            exact
                            path='/auth/password/reset/confirm'
                            component={ResetPasswordPageConfirmComponent}
                        />

                        <Route exact path='/auth/email-confirmation' component={EmailConfirmationPage} />
                        { routesToRender }
                        <Redirect
                            to={location.pathname.length > 1 ? `/auth/login?next=${location.pathname}` : '/auth/login'}
                        />
                    </Switch>
                </GlobalErrorBoundary>
            );
        }

        if (healthIinitialized && !backendIsHealthy) {
            return (
                <Space align='center' direction='vertical' className='cvat-spinner'>
                    <DisconnectOutlined className='cvat-disconnected' />
                    Cannot connect to the server.
                </Space>
            );
        }

        return <Spin size='large' className='cvat-spinner' tip='Connecting...' />;
    }
}

export default withRouter(CVATApplication);
