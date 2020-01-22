import './styles.scss';
import React from 'react';

import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
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

import getCore from 'cvat-core';
import {
    CVATLogo,
    AccountIcon,
} from 'icons';

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
    about: any;
}

type Props = HeaderContainerProps & RouteComponentProps;

function HeaderContainer(props: Props): JSX.Element {
    const {
        installedTFSegmentation,
        installedAutoAnnotation,
        installedTFAnnotation,
        installedAnalytics,
        username,
        about,
        onLogout,
        logoutFetching,
    } = props;

    const renderModels = installedAutoAnnotation
        || installedTFAnnotation
        || installedTFSegmentation;

    function aboutModal() {
        Modal.info({
            title: `${about.name}`,
            content: (
                <div>
                    <p>
                        {`${about.description}`}
                    </p>
                    <p>
                        <Text strong>
                            Server version:
                        </Text>
                        <Text type='secondary'>
                            {` ${about.version}`}
                        </Text>
                    </p>
                    <p>
                        <Text strong>
                            Client version:
                        </Text>
                        <Text type='secondary'>
                            {` ${core.client.version}`}
                        </Text>
                    </p>
                    <Row type='flex' justify='space-around'>
                        <Col><a href='https://github.com/opencv/cvat/blob/develop/CHANGELOG.md' target='_blank' rel='noopener noreferrer' >What's new?</a></Col>
                        <Col><a href='https://github.com/opencv/cvat/blob/develop/LICENSE' target='_blank' rel='noopener noreferrer' >License</a></Col>
                        <Col><a href='https://gitter.im/opencv-cvat' target='_blank' rel='noopener noreferrer' >Need help?</a></Col>
                        <Col><a href='https://software.intel.com/en-us/forums/intel-distribution-of-openvino-toolkit' target='_blank' rel='noopener noreferrer' >Forum on Intel Developer Zone</a></Col>
                    </Row>  
                </div>
            ),
            width : 800,
            okButtonProps: {
                style: {
                    width: '100px',
                },
            },
        })
    }

    const menu = (
        <Menu className='cvat-header-menu' mode='vertical'>
            <Menu.Item
                onClick={
                    (): void => props.history.push('/settings')
                }
            >
                <Icon type='setting' />
                Settings
            </Menu.Item>
            <Menu.Item onClick={() => aboutModal()}>
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
