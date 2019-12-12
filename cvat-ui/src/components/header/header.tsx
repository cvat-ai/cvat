import React from 'react';

import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Layout,
    Icon,
    Button,
    Popover,
    Menu,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import getCore from '../../core';
import axios from 'axios';
import { render } from 'react-dom';
import ReactDOM from 'react-dom';
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
}

type Props = HeaderContainerProps & RouteComponentProps;

const cvatLogo = (): JSX.Element => <img alt='' src='/assets/cvat-logo.svg' />;
const userLogo = (): JSX.Element => <img alt='' src='/assets/icon-account.svg' />;
const text = React.createElement('div', {id : 'about'});
const content = React.createElement('div', {id : 'version'});

function HeaderContainer(props: Props): JSX.Element {
    const {
        installedTFSegmentation,
        installedAutoAnnotation,
        installedTFAnnotation,
        installedAnalytics,
        username,
        onLogout,
        logoutFetching,
    } = props;

    const renderModels = installedAutoAnnotation
        || installedTFAnnotation
        || installedTFSegmentation;

    return (
        <Layout.Header className='cvat-header'>
            <div className='cvat-left-header'>
                <Icon className='cvat-logo-icon' component={cvatLogo} />

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
                <Popover placement="bottom" title={content} content={text} trigger="click" overlayStyle={{width : "50vw"}}>
                <Button
                    className='cvat-header-button'
                    type='link'
                    value='tasks'
                    onClick={
                        (): void => {
                        const t = localStorage.getItem('token');
                        const token ='Token '+ t.replace(/['"]+/g, '')
                        const data = axios.get(`${serverHost}/api/v1/server/about`,{ headers: {Authorization : token}}).then(
                            function(response) {
                                return response.data;
                                
                            }
                        )
                        data.then(function(val) { 
                            const version = 'cvat-version : ' + val.version;
                            ReactDOM.render(version,document.getElementById('version'))
                            ReactDOM.render(val.description,document.getElementById('about'))
                            
                        });
                        
                    }
                    }
                >
                    About
                </Button>
                </Popover> 
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
                    <Text className='cvat-black-color'>GitHub</Text>
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
                <Menu className='cvat-header-menu' subMenuCloseDelay={0.1} mode='horizontal'>
                    <Menu.SubMenu
                        title={
                            (
                                <span>
                                    <Icon className='cvat-header-user-icon' component={userLogo} />
                                    <span>
                                        <Text strong>
                                            {username.length > 14 ? `${username.slice(0, 10)} ...` : username}
                                        </Text>
                                        <Icon className='cvat-header-menu-icon' type='caret-down' />
                                    </span>
                                </span>
                            )
                        }
                    >
                        <Menu.Item
                            onClick={onLogout}
                            disabled={logoutFetching}
                            className='cvat-header-button'
                        >
                            {logoutFetching && <Icon type='loading' />}
                            Logout
                        </Menu.Item>
                    </Menu.SubMenu>
                </Menu>
            </div>
        </Layout.Header>
    );
}

export default withRouter(HeaderContainer);
