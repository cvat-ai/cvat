import 'antd/dist/antd.less';
import '../styles.scss';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import {
    Switch,
    Route,
    Redirect,
} from 'react-router';
import {
    Spin,
    Layout,
    notification,
} from 'antd';

import TasksPageContainer from '../containers/tasks-page/tasks-page';
import CreateTaskPageContainer from '../containers/create-task-page/create-task-page';
import TaskPageContainer from '../containers/task-page/task-page';
import ModelsPageContainer from '../containers/models-page/models-page';
import CreateModelPageContainer from '../containers/create-model-page/create-model-page';
import AnnotationPageContainer from '../containers/annotation-page/annotation-page';
import LoginPageContainer from '../containers/login-page/login-page';
import RegisterPageContainer from '../containers/register-page/register-page';
import HeaderContainer from '../containers/header/header';

import { NotificationsState } from '../reducers/interfaces';

type CVATAppProps = {
    loadFormats: () => void;
    loadUsers: () => void;
    verifyAuthorized: () => void;
    initPlugins: () => void;
    resetErrors: () => void;
    resetMessages: () => void;
    userInitialized: boolean;
    pluginsInitialized: boolean;
    pluginsFetching: boolean;
    formatsInitialized: boolean;
    formatsFetching: boolean;
    usersInitialized: boolean;
    usersFetching: boolean;
    installedAutoAnnotation: boolean;
    installedTFAnnotation: boolean;
    installedTFSegmentation: boolean;
    notifications: NotificationsState;
    user: any;
};

export default class CVATApplication extends React.PureComponent<CVATAppProps> {
    public componentDidMount(): void {
        const { verifyAuthorized } = this.props;
        verifyAuthorized();
    }

    public componentDidUpdate(): void {
        const {
            loadFormats,
            loadUsers,
            initPlugins,
            userInitialized,
            formatsInitialized,
            formatsFetching,
            usersInitialized,
            usersFetching,
            pluginsInitialized,
            pluginsFetching,
            user,
        } = this.props;

        this.showErrors();
        this.showMessages();

        if (!userInitialized || user == null) {
            // not authorized user
            return;
        }

        if (!formatsInitialized && !formatsFetching) {
            loadFormats();
        }

        if (!usersInitialized && !usersFetching) {
            loadUsers();
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

        const { tasks } = notifications.messages;
        const { models } = notifications.messages;
        const shown = !!tasks.loadingDone || !!models.inferenceDone;

        if (tasks.loadingDone) {
            showMessage(tasks.loadingDone);
        }
        if (models.inferenceDone) {
            showMessage(models.inferenceDone);
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

            console.error(error);
        }

        const {
            notifications,
            resetErrors,
        } = this.props;

        const { auth } = notifications.errors;
        const { tasks } = notifications.errors;
        const { formats } = notifications.errors;
        const { users } = notifications.errors;
        const { share } = notifications.errors;
        const { models } = notifications.errors;

        const shown = !!auth.authorized || !!auth.login || !!auth.logout || !!auth.register
            || !!tasks.fetching || !!tasks.updating || !!tasks.dumping || !!tasks.loading
            || !!tasks.exporting || !!tasks.deleting || !!tasks.creating || !!formats.fetching
            || !!users.fetching || !!share.fetching || !!models.creating || !!models.starting
            || !!models.fetching || !!models.deleting || !!models.inferenceStatusFetching
            || !!models.metaFetching;

        if (auth.authorized) {
            showError(auth.authorized.message, auth.authorized.reason);
        }
        if (auth.login) {
            showError(auth.login.message, auth.login.reason);
        }
        if (auth.register) {
            showError(auth.register.message, auth.register.reason);
        }
        if (auth.logout) {
            showError(auth.logout.message, auth.logout.reason);
        }
        if (tasks.fetching) {
            showError(tasks.fetching.message, tasks.fetching.reason);
        }
        if (tasks.updating) {
            showError(tasks.updating.message, tasks.updating.reason);
        }
        if (tasks.dumping) {
            showError(tasks.dumping.message, tasks.dumping.reason);
        }
        if (tasks.loading) {
            showError(tasks.loading.message, tasks.loading.reason);
        }
        if (tasks.exporting) {
            showError(tasks.exporting.message, tasks.exporting.reason);
        }
        if (tasks.deleting) {
            showError(tasks.deleting.message, tasks.deleting.reason);
        }
        if (tasks.creating) {
            showError(tasks.creating.message, tasks.creating.reason);
        }
        if (formats.fetching) {
            showError(formats.fetching.message, formats.fetching.reason);
        }
        if (users.fetching) {
            showError(users.fetching.message, users.fetching.reason);
        }
        if (share.fetching) {
            showError(share.fetching.message, share.fetching.reason);
        }
        if (models.creating) {
            showError(models.creating.message, models.creating.reason);
        }
        if (models.starting) {
            showError(models.starting.message, models.starting.reason);
        }
        if (models.fetching) {
            showError(models.fetching.message, models.fetching.reason);
        }
        if (models.deleting) {
            showError(models.deleting.message, models.deleting.reason);
        }
        if (models.metaFetching) {
            showError(models.metaFetching.message, models.metaFetching.reason);
        }
        if (models.inferenceStatusFetching) {
            showError(
                models.inferenceStatusFetching.message,
                models.inferenceStatusFetching.reason,
            );
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
            pluginsInitialized,
            formatsInitialized,
            installedAutoAnnotation,
            installedTFSegmentation,
            installedTFAnnotation,
            user,
        } = this.props;

        const readyForRender = (userInitialized && user == null)
            || (userInitialized && formatsInitialized
            && pluginsInitialized && usersInitialized);

        const withModels = installedAutoAnnotation
            || installedTFAnnotation || installedTFSegmentation;

        if (readyForRender) {
            if (user) {
                return (
                    <BrowserRouter>
                        <Layout>
                            <HeaderContainer> </HeaderContainer>
                            <Layout.Content>
                                <Switch>
                                    <Route exact path='/tasks' component={TasksPageContainer} />
                                    <Route exact path='/tasks/create' component={CreateTaskPageContainer} />
                                    <Route exact path='/tasks/:id' component={TaskPageContainer} />
                                    <Route exact path='/tasks/:tid/jobs/:jid' component={AnnotationPageContainer} />
                                    { withModels
                                        && <Route exact path='/models' component={ModelsPageContainer} /> }
                                    { installedAutoAnnotation
                                        && <Route exact path='/models/create' component={CreateModelPageContainer} /> }
                                    <Redirect push to='/tasks' />
                                </Switch>
                                {/* eslint-disable-next-line */}
                                <a id='downloadAnchor' style={{ display: 'none' }} download/>
                            </Layout.Content>
                        </Layout>
                    </BrowserRouter>
                );
            }

            return (
                <BrowserRouter>
                    <Switch>
                        <Route exact path='/auth/register' component={RegisterPageContainer} />
                        <Route exact path='/auth/login' component={LoginPageContainer} />
                        <Redirect to='/auth/login' />
                    </Switch>
                </BrowserRouter>
            );
        }

        return (
            <Spin size='large' className='cvat-spinner' />
        );
    }
}
