// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import '../styles.scss';

import React, { useEffect, useReducer } from 'react';
import { shallowEqual, useSelector, useDispatch } from 'react-redux';
import {
    Redirect, Route, Switch, useHistory,
} from 'react-router';

import Layout from 'antd/lib/layout';
import Modal from 'antd/lib/modal';
import Spin from 'antd/lib/spin';
import { DisconnectOutlined } from '@ant-design/icons';
import Space from 'antd/lib/space';
import Text from 'antd/lib/typography/Text';

import LogoutComponent from 'components/logout-component';
import LoginPageContainer from 'containers/login-page/login-page';
import LoginWithTokenComponent from 'components/login-with-token/login-with-token';
import RegisterPageContainer from 'containers/register-page/register-page';
import ResetPasswordPageConfirmComponent from 'components/reset-password-confirm-page/reset-password-confirm-page';
import ResetPasswordPageComponent from 'components/reset-password-page/reset-password-page';
import EmailConfirmationPage from 'components/email-confirmation-pages/email-confirmed';
import EmailVerificationSentPage from 'components/email-confirmation-pages/email-verification-sent';
import IncorrectEmailConfirmationPage from 'components/email-confirmation-pages/incorrect-email-confirmation';

import Header from 'components/header/header';

import ShortcutsDialog from 'components/shortcuts-dialog/shortcuts-dialog';

import CreateJobPage from 'components/create-job-page/create-job-page';
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

import AnalyticsPage from 'components/analytics-page/analytics-page';

import OrganizationPage from 'components/organization-page/organization-page';
import CreateOrganizationComponent from 'components/create-organization-page/create-organization-page';

import WebhooksPage from 'components/webhooks-page/webhooks-page';
import CreateWebhookPage from 'components/setup-webhook-pages/create-webhook-page';
import UpdateWebhookPage from 'components/setup-webhook-pages/update-webhook-page';

import GuidePage from 'components/md-guide/guide-page';

import InvitationsPage from 'components/invitations-page/invitations-page';

import ExportDatasetModal from 'components/export-dataset/export-dataset-modal';
import ExportBackupModal from 'components/export-backup/export-backup-modal';
import ImportDatasetModal from 'components/import-dataset/import-dataset-modal';
import ImportBackupModal from 'components/import-backup/import-backup-modal';

import AnnotationPageContainer from 'containers/annotation-page/annotation-page';
import { getCore } from 'cvat-core-wrapper';

import { getAboutAsync } from 'actions/about-actions';
import { authenticatedAsync } from 'actions/auth-actions';
import { getFormatsAsync } from 'actions/formats-actions';
import { getModelsAsync } from 'actions/models-actions';
import { getPluginsAsync } from 'actions/plugins-actions';
import { getUserAgreementsAsync } from 'actions/useragreements-actions';
import { getInvitationsAsync } from 'actions/invitations-actions';
import { getServerAPISchemaAsync } from 'actions/server-actions';
import { activateOrganizationAsync } from 'actions/organization-actions';

import appConfig from 'config';
import { authQuery } from 'utils/auth-query';
import { usePlugins } from 'utils/hooks';

import { CombinedState } from 'reducers';

interface State {
    healthInitialized: boolean;
    backendIsHealthy: boolean;
}

enum Action {
    HEALTH_CHECK_SUCCESS = 'HEALTH_CHECK_SUCCESS',
    HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
}

const core = getCore();

const componentReducer = (state: State, action: { type: Action }): State => {
    switch (action.type) {
        case Action.HEALTH_CHECK_SUCCESS: {
            return {
                ...state,
                healthInitialized: true,
                backendIsHealthy: true,
            };
        }
        case Action.HEALTH_CHECK_FAILED: {
            return {
                ...state,
                healthInitialized: true,
                backendIsHealthy: false,
            };
        }
        default:
            return state;
    }
};

function CVATApplication(): JSX.Element {
    const appDispatch = useDispatch();
    const history = useHistory();
    const likeProps = useSelector((state: CombinedState) => ({
        userInitialized: state.auth.initialized,
        userFetching: state.auth.fetching,

        aboutInitialized: state.about.initialized,
        aboutFetching: state.about.fetching,

        pluginsInitialized: state.plugins.initialized,
        pluginsFetching: state.plugins.fetching,

        formatsInitialized: state.formats.initialized,
        formatsFetching: state.formats.fetching,

        modelsInitialized: state.models.initialized,
        modelsFetching: state.models.fetching,

        organizationInitialized: state.organizations.initialized,
        organizationFetching: state.organizations.fetching,

        userAgreementsInitialized: state.userAgreements.initialized,
        userAgreementsFetching: state.userAgreements.fetching,

        serverAPISchemaInitialized: state.serverAPI.initialized,
        serverAPISchemaFetching: state.serverAPI.fetching,

        pluginComponents: state.plugins.components,
        user: state.auth.user,
        isModelPluginActive: state.plugins.list.MODELS,
        isPasswordResetEnabled: state.serverAPI.configuration.isPasswordResetEnabled,
        isRegistrationEnabled: state.serverAPI.configuration.isRegistrationEnabled,
    }), shallowEqual);

    const [state, dispatch] = useReducer(componentReducer, {
        healthInitialized: false,
        backendIsHealthy: false,
    });

    const routesToRender = usePlugins((_state) => _state.plugins.components.router, likeProps, state)
        .map(({ component: Component }) => Component());

    const { healthInitialized, backendIsHealthy } = state;
    const {
        userInitialized,
        userFetching,
        aboutInitialized,
        aboutFetching,
        pluginsInitialized,
        pluginsFetching,
        formatsInitialized,
        formatsFetching,
        modelsInitialized,
        modelsFetching,
        organizationInitialized,
        organizationFetching,
        userAgreementsInitialized,
        userAgreementsFetching,
        serverAPISchemaInitialized,
        serverAPISchemaFetching,
        user,
        isModelPluginActive,
        isPasswordResetEnabled,
        isRegistrationEnabled,
    } = likeProps;

    useEffect(() => {
        const healthCheckPromise = core.server.healthCheck(
            appConfig.HEALTH_CHECK_RETRIES,
            appConfig.HEALTH_CHECK_PERIOD,
            appConfig.HEALTH_CHECK_REQUEST_TIMEOUT,
        );

        healthCheckPromise.then(() => {
            dispatch({ type: Action.HEALTH_CHECK_SUCCESS });
        }).catch(() => {
            dispatch({ type: Action.HEALTH_CHECK_FAILED });

            Modal.error({
                title: 'Cannot connect to the server',
                className: 'cvat-modal-cannot-connect-server',
                closable: false,
                content: (
                    <Text>
                        {appConfig.SERVER_UNAVAILABLE_COMPONENT}
                    </Text>
                ),
            });
        });
    }, []);

    useEffect(() => {
        if (state.healthInitialized && state.backendIsHealthy) {
            if (!userInitialized && !userFetching) {
                appDispatch(authenticatedAsync());
            }

            if (!serverAPISchemaInitialized && !serverAPISchemaFetching) {
                appDispatch(getServerAPISchemaAsync());
            }

            if (!userAgreementsInitialized && !userAgreementsFetching) {
                appDispatch(getUserAgreementsAsync());
            }

            if (user?.id && user.isVerified) {
                if (!formatsInitialized && !formatsFetching) {
                    appDispatch(getFormatsAsync());
                }

                if (!aboutInitialized && !aboutFetching) {
                    appDispatch(getAboutAsync());
                }

                if (!pluginsInitialized && !pluginsFetching) {
                    appDispatch(getPluginsAsync());
                }

                if (!organizationInitialized && !organizationFetching) {
                    appDispatch(activateOrganizationAsync());
                }

                if (isModelPluginActive && !modelsInitialized && !modelsFetching) {
                    appDispatch(getModelsAsync());
                }
            }
        }
    });

    useEffect(() => {
        if (user?.id && user.isVerified && history.location.pathname !== '/invitations') {
            setTimeout(() => {
                appDispatch(getInvitationsAsync({ page: 1 }, true));
            }, 1000);
        }
    }, [user]);

    if (healthInitialized && !backendIsHealthy) {
        return (
            <Space align='center' direction='vertical' className='cvat-spinner'>
                <DisconnectOutlined className='cvat-disconnected' />
                Cannot connect to the server.
            </Space>
        );
    }

    if (userAgreementsInitialized && serverAPISchemaInitialized && userInitialized) {
        if (user == null || !user.isVerified) {
            const { pathname } = history.location;
            return (
                <Switch>
                    {isRegistrationEnabled && (
                        <Route exact path='/auth/register' component={RegisterPageContainer} />
                    )}
                    <Route exact path='/auth/email-verification-sent' component={EmailVerificationSentPage} />
                    <Route exact path='/auth/incorrect-email-confirmation' component={IncorrectEmailConfirmationPage} />
                    <Route exact path='/auth/login' component={LoginPageContainer} />
                    <Route
                        exact
                        path='/auth/login-with-token/:token'
                        component={LoginWithTokenComponent}
                    />
                    {isPasswordResetEnabled && (
                        <Route exact path='/auth/password/reset' component={ResetPasswordPageComponent} />
                    )}
                    {isPasswordResetEnabled && (
                        <Route
                            exact
                            path='/auth/password/reset/confirm'
                            component={ResetPasswordPageConfirmComponent}
                        />
                    )}

                    <Route exact path='/auth/email-confirmation' component={EmailConfirmationPage} />
                    { routesToRender }
                    <Redirect
                        to={pathname.length > 1 ? `/auth/login?next=${pathname}` : '/auth/login'}
                    />
                </Switch>
            );
        }

        if (
            formatsInitialized &&
            pluginsInitialized &&
            aboutInitialized &&
            organizationInitialized &&
            (!isModelPluginActive || modelsInitialized) &&
            user && user.isVerified &&
            // as many reducers will reset to defaults when LOGOUT_SUCCESS triggered
            // has to unmount child components before this action triggered
            // otherwise child mapStateToProps may failed as it often uses data, existing only for logged in users
            // we use userFetching flag to prevent it
            !userFetching
        ) {
            const queryParams = new URLSearchParams(history.location.search);
            const authParams = authQuery(queryParams);

            return (
                <Layout>
                    <Header />
                    <Layout.Content style={{ height: '100%' }}>
                        <ShortcutsDialog />
                        <ExportDatasetModal />
                        <ExportBackupModal />
                        <ImportDatasetModal />
                        <ImportBackupModal />
                        <Switch>
                            <Route
                                exact
                                path='/auth/login-with-token/:token'
                                component={LoginWithTokenComponent}
                            />
                            <Route exact path='/auth/logout' component={LogoutComponent} />
                            <Route exact path='/projects' component={ProjectsPageComponent} />
                            <Route exact path='/projects/create' component={CreateProjectPageComponent} />
                            <Route exact path='/projects/:id' component={ProjectPageComponent} />
                            <Route exact path='/projects/:id/webhooks' component={WebhooksPage} />
                            <Route exact path='/projects/:id/guide' component={GuidePage} />
                            <Route exact path='/projects/:pid/analytics' component={AnalyticsPage} />
                            <Route exact path='/tasks' component={TasksPageContainer} />
                            <Route exact path='/tasks/create' component={CreateTaskPageContainer} />
                            <Route exact path='/tasks/:id' component={TaskPageComponent} />
                            <Route exact path='/tasks/:tid/analytics' component={AnalyticsPage} />
                            <Route exact path='/tasks/:id/jobs/create' component={CreateJobPage} />
                            <Route exact path='/tasks/:id/guide' component={GuidePage} />
                            <Route exact path='/tasks/:tid/jobs/:jid' component={AnnotationPageContainer} />
                            <Route exact path='/tasks/:tid/jobs/:jid/analytics' component={AnalyticsPage} />
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
                            <Route exact path='/invitations' component={InvitationsPage} />
                            <Route exact path='/organization' component={OrganizationPage} />
                            { routesToRender }
                            {isModelPluginActive && (
                                <Route
                                    path='/models'
                                >
                                    <Switch>
                                        <Route exact path='/models' component={ModelsPageComponent} />
                                    </Switch>
                                </Route>
                            )}
                            <Redirect
                                push
                                to={{
                                    pathname: queryParams.get('next') || '/tasks',
                                    search: authParams ? new URLSearchParams(authParams).toString() : '',
                                }}
                            />
                        </Switch>
                        {/* eslint-disable-next-line */}
                        <a id='downloadAnchor' target='_blank' style={{ display: 'none' }} download />
                    </Layout.Content>
                </Layout>
            );
        }
    }

    return (
        <Spin size='large' fullscreen className='cvat-spinner' tip='Connecting...' />
    );
}

export default React.memo(CVATApplication);
