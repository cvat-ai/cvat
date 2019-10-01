import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Layout,
    Radio,
    Icon,
    Button,
    Menu,
} from 'antd';
import Text from 'antd/lib/typography/Text';

import { logoutAsync } from '../actions/auth-actions';
import { AuthState } from '../reducers/auth-reducer';

interface StateToProps {
    auth: AuthState;
}

interface DispatchToProps {
    logout(): void;
}

function mapStateToProps(state: any): StateToProps {
    return {
        auth: state.auth,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        logout: () => dispatch(logoutAsync()),
    }
}

type HeaderProps = StateToProps & DispatchToProps & RouteComponentProps;

class CVATHeader extends React.PureComponent<HeaderProps> {
    constructor(props: any) {
        super(props);
    }

    public render() {
        const cvatLogo = () => (<img src="/assets/cvat-logo.svg"/>);
        const backLogo = () => (<img src="/assets/icon-playcontrol-previous.svg"/>);
        const userLogo = () => (<img src="/assets/icon-account.svg" />);
        const { username } = this.props.auth.user;
        const { pathname } = this.props.location;
        let activeTab = null;

        if (pathname === '/tasks') {
            activeTab = 'tasks';
        } else if (pathname === '/models') {
            activeTab = 'models';
        }

        return (
            <Layout.Header className='cvat-header'>
                <div className='left-header'>
                    <Icon className='cvat-logo-icon' component={cvatLogo}/>
                    <Icon className='cvat-back-icon' component={backLogo}/>

                    <Radio.Group size='default' value={activeTab} className='cvat-header-buttons'>
                        <Radio.Button value='tasks'onChange={
                            () => this.props.history.push('/tasks')
                        }> Tasks </Radio.Button>
                        <Radio.Button value='models' onChange={
                            () => this.props.history.push('/models')
                        }> Models </Radio.Button>
                        <Button className='header-button' type='link' onClick={
                            () => window.open('/analytics/app/kibana', '_blank')
                        }> Analytics </Button>
                    </Radio.Group>
                </div>
                <div className='right-header'>
                    <Button className='header-button' type='link' onClick={
                            () => window.open('/documentation/user_guide.html', '_blank')
                    }> Help </Button>
                    <Menu className='cvat-header-menu' subMenuCloseDelay={0.1} mode='horizontal'>
                        <Menu.SubMenu title={
                            <span>
                                <Icon className='cvat-header-user-icon' component={userLogo} />
                                <span>
                                    <Text strong> {username} </Text>
                                    <Icon className='cvat-header-menu-icon' component={backLogo} />
                                </span>
                            </span>
                        }>
                            <Menu.Item onClick={this.props.logout}>Logout</Menu.Item>
                        </Menu.SubMenu>
                    </Menu>
                </div>
            </Layout.Header>
        );
    }
}

export default withRouter(connect(
    mapStateToProps,
    mapDispatchToProps,
)(CVATHeader));
