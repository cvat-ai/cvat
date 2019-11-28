import React from 'react';
import 'antd/dist/antd.css';
import '../stylesheet.css';
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
import ModelRunnerModalContainer from '../containers/model-runner-dialog/model-runner-dialog';

import FeedbackComponent from './feedback';
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
}

export default class CVATApplication extends React.PureComponent<CVATAppProps> {
    constructor(props: any) {
        super(props);
    }

    private showMessages() {
        function showMessage(title: string) {
            notification.info({
                message: title,
                duration: null,
            });
        }

        const { tasks } = this.props.notifications.messages;
        const { models } = this.props.notifications.messages;
        let shown = !!tasks.loadingDone || !!models.inferenceDone;

        if (tasks.loadingDone) {
            showMessage(tasks.loadingDone);
        }
        if (models.inferenceDone) {
            showMessage(models.inferenceDone);
        }

        if (shown) {
            this.props.resetMessages();
        }
    }

    private showErrors() {
        function showError(title: string, _error: any) {
            const error = _error.toString();
            notification.error({
                message: title,
                duration: null,
                description: error.length > 200 ? '' : error,
            });

            console.error(error);
        }

        const { auth } = this.props.notifications.errors;
        const { tasks } = this.props.notifications.errors;
        const { formats } = this.props.notifications.errors;
        const { users } = this.props.notifications.errors;
        const { share } = this.props.notifications.errors;
        const { models } = this.props.notifications.errors;

        let shown = !!auth.authorized || !!auth.login || !!auth.logout || !!auth.register
            || !!tasks.fetching || !!tasks.updating || !!tasks.dumping || !!tasks.loading
            || !!tasks.exporting || !!tasks.deleting || !!tasks.creating || !!formats.fetching
            || !!users.fetching || !!share.fetching || !!models.creating || !!models.starting
            || !!models.fetching || !!models.deleting || !!models.inferenceStatusFetching;

        if (auth.authorized) {
            showError('Could not check authorization on the server', auth.authorized);
        }
        if (auth.login) {
            showError('Could not login on the server', auth.login);
        }
        if (auth.register) {
            showError('Could not register on the server', auth.register);
        }
        if (auth.logout) {
            showError('Could not logout on the server', auth.logout);
        }
        if (tasks.fetching) {
            showError('Could not fetch tasks from the server', tasks.fetching);
        }
        if (tasks.updating) {
            showError('Could not update task on the server', tasks.updating);
        }
        if (tasks.dumping) {
            showError('Could not dump annotations from the server', tasks.dumping);
        }
        if (tasks.loading) {
            showError('Could not upload annotations to the server', tasks.loading);
        }
        if (tasks.exporting) {
            showError('Could not export task from the server', tasks.exporting);
        }
        if (tasks.deleting) {
            showError('Could not delete task on the server', tasks.deleting);
        }
        if (tasks.creating) {
            showError('Could not create task on the server', tasks.creating);
        }
        if (formats.fetching) {
            showError('Could not get annotations and dataset formats from the server', formats.fetching);
        }
        if (users.fetching) {
            showError('Could not get users from the server', users.fetching);
        }
        if (share.fetching) {
            showError('Could not get share info from the server', share.fetching);
        }
        if (models.creating) {
            showError('Could not create model on the server', models.creating);
        }
        if (models.starting) {
            showError('Could not run model on the server', models.starting);
        }
        if (models.fetching) {
            showError('Could not get models from the server', models.fetching);
        }
        if (models.deleting) {
            showError('Could not delete model from the server', models.deleting);
        }
        if (models.inferenceStatusFetching) {
            showError('Could not fetch inference status from the server', models.inferenceStatusFetching);
        }

        if (shown) {
            this.props.resetErrors();
        }
    }

    public componentDidMount() {
        this.props.verifyAuthorized();
    }

    public componentDidUpdate() {
        this.showErrors();
        this.showMessages();

        if (!this.props.userInitialized || this.props.user == null) {
            // not authorized user
            return;
        }

        if (!this.props.formatsInitialized && !this.props.formatsFetching) {
            this.props.loadFormats();
        }

        if (!this.props.usersInitialized && !this.props.usersFetching) {
            this.props.loadUsers();
        }

        if (!this.props.pluginsInitialized && !this.props.pluginsFetching) {
            this.props.initPlugins();
        }
    }

    // Where you go depends on your URL
    public render() {
        const readyForRender =
            (this.props.userInitialized && this.props.user == null) ||
            (this.props.userInitialized && this.props.formatsInitialized &&
             this.props.pluginsInitialized && this.props.usersInitialized);

        const withModels = this.props.installedAutoAnnotation
            || this.props.installedTFAnnotation || this.props.installedTFSegmentation;

        if (readyForRender) {
            if (this.props.user) {
                return (
                    <BrowserRouter>
                        <Layout>
                            <HeaderContainer> </HeaderContainer>
                            <Layout.Content>
                                <Switch>
                                    <Route exact path='/tasks' component={TasksPageContainer}/>
                                    <Route path='/tasks/create' component={CreateTaskPageContainer}/>
                                    <Route exact path='/tasks/:id' component={TaskPageContainer}/>
                                    <Route path='/tasks/:id/jobs/:id' component={AnnotationPageContainer}/>
                                    { withModels &&
                                        <Route exact path='/models' component={ModelsPageContainer}/> }
                                    { this.props.installedAutoAnnotation &&
                                        <Route path='/models/create' component={CreateModelPageContainer}/> }
                                    <Redirect push to='/tasks'/>
                                </Switch>
                                <FeedbackComponent/>
                                <ModelRunnerModalContainer/>
                            </Layout.Content>
                        </Layout>
                    </BrowserRouter>
                );
            } else {
                return (
                    <BrowserRouter>
                        <Switch>
                            <Route exact path='/auth/register' component={RegisterPageContainer}/>
                            <Route exact path='/auth/login' component={LoginPageContainer}/>
                            <Redirect to='/auth/login'/>
                        </Switch>
                    </BrowserRouter>
                );
            }
        } else {
            return (
                <Spin size='large' style={{margin: '25% 50%'}}/>
            );
        }
    }
}
