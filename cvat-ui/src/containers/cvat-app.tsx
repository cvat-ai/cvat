import React from 'react';
import { connect } from 'react-redux';
import { Switch, Route, Redirect } from 'react-router';
import { BrowserRouter } from 'react-router-dom';

import { Spin, Layout, Modal } from 'antd';

import 'antd/dist/antd.css';
import '../stylesheet.css';

import { authorizedAsync } from '../actions/auth-actions';
import { AuthState } from '../reducers/interfaces';

import TasksPage from './tasks-page';
import CreateTaskPage from './create-task-page';
import TaskPage from './task-page';
import ModelsPage from './models-page/models-page';
import AnnotationPage from './annotation-page/annotation-page';
import LoginPage from './login-page';
import RegisterPage from './register-page';
import Header from './cvat-header';


export interface CVATAppProps {
    auth: AuthState;
}

export interface CVATAppActions {
    verifyAuthorized: () => void;
}

function mapStateToProps(state: any): CVATAppProps {
    return {
        auth: state.auth,
    };
}

function mapDispatchToProps(dispatch: any): CVATAppActions {
    return {
        verifyAuthorized: (): void => dispatch(authorizedAsync())
    };
}

class CVATApplication extends React.PureComponent<CVATAppProps & CVATAppActions> {
    constructor(props: any) {
        super(props);
    }

    public componentDidMount() {
        this.props.verifyAuthorized();
    }

    // Where you go depends on your URL
    public render() {
        if (this.props.auth.initialized) {
            if (this.props.auth.user) {
                return (
                    <BrowserRouter>
                        <Layout>
                            <Header> </Header>
                            <Layout.Content>
                                <Switch>
                                    <Route exact path='/tasks' component={TasksPage}/>
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
            } else if (this.props.auth.authError) {
                Modal.error({
                    title: 'Could not authorize',
                    content: `${this.props.auth.authError.toString()}`,
                });
                return <div/>;
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

