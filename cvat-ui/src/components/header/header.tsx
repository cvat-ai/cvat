import './styles.scss';
import React from 'react';

import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import {
    BrowserRouter as Router,
    Link,
    Switch,
    Route,
  } from "react-router-dom";
  

import {
    Layout,
    Icon,
    Button,
    Menu,
    Dropdown,
    Modal,
    Row,
    Col,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import getCore from '../../core';
import {
    CVATLogo,
    AccountIcon,
} from '../../icons';

const core = getCore();
const serverHost = core.config.backendAPI.slice(0, -7);

interface HeaderContainerProps {
    onLogout: () => void;
    logoutFetching: boolean;
    installedAnalytics: boolean;
    installedAutoAnnotation: boolean;
    installedTFAnnotation: boolean;
    installedTFSegmentation: boolean;
    username: string;
    serverInfo: string;
}

type Props = HeaderContainerProps & RouteComponentProps;

function HeaderContainer(props: Props): JSX.Element {
    const {
        installedTFSegmentation,
        installedAutoAnnotation,
        installedTFAnnotation,
        installedAnalytics,
        username,
        serverInfo,
        onLogout,
        logoutFetching,
    } = props;

    const renderModels = installedAutoAnnotation
        || installedTFAnnotation
        || installedTFSegmentation;
    
    function DataModal() {
        Modal.info({
            title: serverInfo.name,
            content: (
                <div className="modal_data_wrapper">
                    <p>{serverInfo.description}</p>
                    <p>Server Version : {serverInfo.version}</p>
                    <p>Client Version: {core.client.version}</p>
                    <Router>
                    <Row type='flex' justify='center'>
                        <Col span={4}><Link to= ''>What's new?</Link></Col>
                        <Col span={4}><Link to=''>License</Link></Col>
                        <Col span={4}><a href='https://gitter.im/opencv-cvat' target='_blank'>Need help?</a></Col>
                        <Col span={4}><a href='https://software.intel.com/en-us/forums/intel-distribution-of-openvino-toolkit' target='_blank'>Forum on Intel Developer Zone</a></Col>
                    </Row>  
                    <Switch>
                        <Route path=''/>
                        <Route path=''/>
                    </Switch>
                    </Router> 
                </div>
            ),
            width: 800,
        })
    }
    const menu = (
        <Menu className='cvat-header-menu' mode='vertical'>
            <Menu.Item>
                <Icon type='setting' />
                Settings
            </Menu.Item>
            <Menu.Item onClick={() => DataModal()} > 
                <Icon type='info-circle' />
                About
            </Menu.Item>
            <Menu.Item
                onClick={onLogout}
                disabled={logoutFetching}
            >
                {logoutFetching ? <Icon type='loading' /> : <Icon type='logout' />}
                Logout
            </Menu.Item>

        </Menu>
    );

    return (
        <Layout.Header className='cvat-header'>
            <div className='cvat-left-header'>
                <Icon className='cvat-logo-icon' component={CVATLogo} />

                <Button
                    className='cvat-header-button'
                    type='link'
                    value='tasks'
                    onClick={
                        (): void => props.history.push('/tasks?page=1')
                    }
                >
                    Tasks
                </Button>
                { renderModels
                    && (
                        <Button
                            className='cvat-header-button'
                            type='link'
                            value='models'
                            onClick={
                                (): void => props.history.push('/models')
                            }
                        >
                            Models
                        </Button>
                    )
                }
                { installedAnalytics
                    && (
                        <Button
                            className='cvat-header-button'
                            type='link'
                            onClick={
                                (): void => {
                                    // false positive
                                    // eslint-disable-next-line
                                    window.open(`${serverHost}/analytics/app/kibana`, '_blank');
                                }
                            }
                        >
                            Analytics
                        </Button>
                    )
                }
            </div>
            <div className='cvat-right-header'>
                <Button
                    className='cvat-header-button'
                    type='link'
                    onClick={
                        (): void => {
                            window.open('https://github.com/opencv/cvat', '_blank');
                        }
                    }
                >
                    <Icon type='github' />
                    <Text className='cvat-text-color'>GitHub</Text>
                </Button>
                <Button
                    className='cvat-header-button'
                    type='link'
                    onClick={
                        (): void => {
                            // false positive
                            // eslint-disable-next-line
                            window.open(`${serverHost}/documentation/user_guide.html`, '_blank')
                        }
                    }
                >
                    <Icon type='question-circle' />
                    Help
                </Button>
                <Dropdown overlay={menu} className='cvat-header-menu-dropdown'>
                    <span>
                        <Icon className='cvat-header-account-icon' component={AccountIcon} />
                        <Text strong>
                            {username.length > 14 ? `${username.slice(0, 10)} ...` : username}
                        </Text>
                        <Icon className='cvat-header-menu-icon' type='caret-down' />
                    </span>
                </Dropdown>
            </div>
        </Layout.Header>
    );
}

export default withRouter(HeaderContainer);
