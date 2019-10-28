import React from 'react';

import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Layout,
    Radio,
    Icon,
    Button,
    Menu,
    Modal,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface HeaderContainerProps {
    onLogout: () => void;
    username: string;
    logoutError: string;
}

function HeaderContainer(props: HeaderContainerProps & RouteComponentProps) {
    const cvatLogo = () => (<img src='/assets/cvat-logo.svg'/>);
    const backLogo = () => (<img src='/assets/icon-playcontrol-previous.svg'/>);
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
            <div className='left-header'>
                <Icon className='cvat-logo-icon' component={cvatLogo}/>
                <Icon className='cvat-back-icon' component={backLogo}/>

                <Radio.Group size='default' value={activeTab} className='cvat-header-buttons'>
                    <Radio.Button value='tasks'onChange={
                        () => props.history.push('/tasks')
                    }> Tasks </Radio.Button>
                    <Radio.Button value='models' onChange={
                        () => props.history.push('/models')
                    }> Models </Radio.Button>
                    <Button className='header-button' type='link' onClick={
                        () => window.open('/analytics/app/kibana', '_blank')
                    }> Analytics </Button>
                </Radio.Group>
            </div>
            <div className='right-header'>
                <Button className='header-button' type='link' onClick={
                        () => window.open('https://github.com/opencv/cvat', '_blank')
                }> <Icon type='github' /> GitHub </Button>
                <Button className='header-button' type='link' onClick={
                        () => window.open('/documentation/user_guide.html', '_blank')
                }> Help </Button>
                <Menu className='cvat-header-menu' subMenuCloseDelay={0.1} mode='horizontal'>
                    <Menu.SubMenu title={
                        <span>
                            <Icon className='cvat-header-user-icon' component={userLogo} />
                            <span>
                                <Text strong> {props.username} </Text>
                                <Icon className='cvat-header-menu-icon' component={backLogo} />
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
