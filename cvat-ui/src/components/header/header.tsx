import React from 'react';

import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Layout,
    Icon,
    Button,
    Menu,
    Modal,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import getCore from '../../core';

const core = getCore();

interface HeaderContainerProps {
    onLogout: () => void;
    installedAnalytics: boolean;
    installedAutoAnnotation: boolean;
    username: string;
    logoutError: string;
}

function HeaderContainer(props: HeaderContainerProps & RouteComponentProps) {
    const cvatLogo = () => (<img src='/assets/cvat-logo.svg'/>);
    const userLogo = () => (<img src='/assets/icon-account.svg' />);

    if (props.logoutError) {
        Modal.error({
            title: 'Could not logout',
            content: `${props.logoutError}`,
        });
    }

    let activeTab = null;

    if (props.history.location.pathname === '/tasks') {
        activeTab = 'tasks';
    } else if (props.history.location.pathname === '/models') {
        activeTab = 'models';
    }

    return (
        <Layout.Header className='cvat-header'>
            <div className='cvat-left-header'>
                <Icon className='cvat-logo-icon' component={cvatLogo}/>

                <Button className='cvat-header-button' type='link' value='tasks' onClick={
                    () => props.history.push('/tasks')
                }> Tasks </Button>
                { props.installedAutoAnnotation ?
                    <Button className='cvat-header-button' type='link' value='models' onClick={
                        () => props.history.push('/models')
                    }> Models </Button> : null
                }
                { props.installedAnalytics ?
                    <Button className='cvat-header-button' type='link' onClick={
                        () => {
                            const serverHost = core.config.backendAPI.slice(0, -7);
                            window.open(`${serverHost}/analytics/app/kibana`, '_blank');
                        }
                    }> Analytics </Button> : null
                }
            </div>
            <div className='cvat-right-header'>
                <Button className='cvat-header-button' type='link' onClick={
                        () => window.open('https://github.com/opencv/cvat', '_blank')
                }>
                    <Icon type='github'/>
                    <Text className='cvat-black-color'>GitHub</Text>
                </Button>
                <Button className='cvat-header-button' type='link' onClick={
                        () => {
                            const serverHost = core.config.backendAPI.slice(0, -7);
                            window.open(`${serverHost}/documentation/user_guide.html`, '_blank')
                        }
                }> <Icon type='question-circle'/> Help </Button>
                <Menu className='cvat-header-menu' subMenuCloseDelay={0.1} mode='horizontal'>
                    <Menu.SubMenu title={
                        <span>
                            <Icon className='cvat-header-user-icon' component={userLogo} />
                            <span>
                                <Text strong>
                                    {props.username.length > 14 ? `${props.username.slice(0, 10)} ...` : props.username}
                                </Text>
                                <Icon className='cvat-header-menu-icon' type='caret-down'/>
                            </span>
                        </span>
                    }>
                        <Menu.Item onClick={props.onLogout}>Logout</Menu.Item>
                    </Menu.SubMenu>
                </Menu>
            </div>
        </Layout.Header>
    );
}

export default withRouter(HeaderContainer);
