import React from 'react';
import { connect } from 'react-redux';
import { BrowserRouter, Switch, Route } from 'react-router-dom';

import { Spin } from 'antd';
import 'antd/dist/antd.css';

import { authorizedAsync } from '../actions/auth-actions';
import { AuthState } from '../reducers/auth-reducer';

import TasksPage from './tasks-page/tasks-page';
import CreateTaskPage from './create-task-page';
import TaskPage from './task-page';
import AnnotationPage from './annotation-page/annotation-page';
import LoginPage from './login-page';
import RegisterPage from './register-page';


export interface CVATProps {
    auth: AuthState;
}

export interface CVATActProps {
    verifyAuthorized: () => void;
}

function mapStateToProps(state: any): CVATProps {
    return {
        auth: state.auth,
    };
}

function mapDispatchToProps(dispatch: any): CVATActProps {
    return {
        verifyAuthorized: (): void => dispatch(authorizedAsync())
    };
}

class CVATApplication extends React.PureComponent<CVATProps & CVATActProps> {
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
                        <Switch>
                            <Route exact path='/auth/register' component={RegisterPage}/>
                            <Route exact path='/auth/login' component={LoginPage}/>
                            <Route exact path='/tasks' component={TasksPage}/>
                            <Route path='/tasks/create' component={CreateTaskPage}/>
                            <Route path='/tasks/:number' component={TaskPage}/>
                            <Route path='/tasks/:number/jobs/:number' component={AnnotationPage}/>
                        </Switch>
                    </BrowserRouter>
                );
            } else {
                return (
                    <LoginPage />
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

