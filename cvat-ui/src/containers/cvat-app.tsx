import React from 'react';
import { connect } from 'react-redux';
import { Switch, Route, Redirect } from 'react-router';
import { BrowserRouter } from 'react-router-dom';

import { Spin, Layout, Modal } from 'antd';

import 'antd/dist/antd.css';
import '../stylesheet.css';

import { authorizedAsync } from '../actions/auth-actions';
import { gettingFormatsAsync } from '../actions/formats-actions';

import { CombinedState } from '../reducers/root-reducer';
import { AuthState } from '../reducers/interfaces';
import { FormatsState } from '../reducers/interfaces';

import TasksPageContainer from './tasks-page/tasks-page';
import CreateTaskPage from './create-task-page';
import TaskPage from './task-page';
import ModelsPage from './models-page/models-page';
import AnnotationPage from './annotation-page/annotation-page';
import LoginPage from './login-page';
import RegisterPage from './register-page';
import Header from './cvat-header';


interface StateToProps {
    auth: AuthState;
    formats: FormatsState;
}

interface DispatchToProps {
    loadFormats: () => void;
    verifyAuthorized: () => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        auth: state.auth,
        formats: state.formats,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        loadFormats: (): void => dispatch(gettingFormatsAsync()),
        verifyAuthorized: (): void => dispatch(authorizedAsync())
    };
}

type CVATAppProps = StateToProps & DispatchToProps;

class CVATApplication extends React.PureComponent<CVATAppProps> {
    constructor(props: any) {
        super(props);
    }

    public componentDidMount() {
        this.props.loadFormats();
        this.props.verifyAuthorized();
    }

    public componentDidUpdate() {
        if (this.props.auth.authError) {
            Modal.error({
                title: 'Could not authorize',
                content: `${this.props.auth.authError.toString()}`,
            });
        }
    }

    // Where you go depends on your URL
    public render() {
        if (this.props.auth.initialized && this.props.formats.initialized) {
            if (this.props.auth.user) {
                return (
                    <BrowserRouter>
                        <Layout>
                            <Header> </Header>
                            <Layout.Content>
                                <Switch>
                                    <Route exact path='/tasks' component={TasksPageContainer}/>
                                    <Route exact path='/models' component={ModelsPage}/>
                                    <Route path='/tasks/create' component={CreateTaskPage}/>
                                    <Route path='/tasks/:number' component={TaskPage}/>
                                    <Route path='/tasks/:number/jobs/:number' component={AnnotationPage}/>
                                    <Redirect to='/tasks'/>
                                </Switch>
                            </Layout.Content>
                        </Layout>
                    </BrowserRouter>
                );
            } else {
                return (
                    <BrowserRouter>
                        <Switch>
                            <Route exact path='/auth/register' component={RegisterPage}/>
                            <Route exact path='/auth/login' component={LoginPage}/>
                            <Redirect to='/auth/login'/>
                        </Switch>
                    </BrowserRouter>
                );
            }
        } else {
            return (
                <Spin size="large" style={{margin: '25% 50%'}}/>
            );
        }
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(CVATApplication);

