// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { connect } from 'react-redux';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Icon, {
    SettingOutlined,
    InfoCircleOutlined,
    EditOutlined,
    LoadingOutlined,
    LogoutOutlined,
    GithubOutlined,
    QuestionCircleOutlined,
    CaretDownOutlined,
    ControlOutlined,
    TeamOutlined,
    PlusOutlined,
    UserOutlined,
    ExpandAltOutlined,
} from '@ant-design/icons';
import Layout from 'antd/lib/layout';
import Button from 'antd/lib/button';
import Menu from 'antd/lib/menu';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';

import getCore from 'cvat-core-wrapper';
import consts from 'consts';

import { CVATLogo } from 'icons';
import ChangePasswordDialog from 'components/change-password-modal/change-password-modal';
import CVATTooltip from 'components/common/cvat-tooltip';
import { switchSettingsDialog as switchSettingsDialogAction } from 'actions/settings-actions';
import { logoutAsync, authActions } from 'actions/auth-actions';
import { CombinedState } from 'reducers/interfaces';
import SettingsModal from './settings-modal/settings-modal';

const core = getCore();

interface Tool {
    name: string;
    description: string;
    server: {
        host: string;
        version: string;
    };
    core: {
        version: string;
    };
    canvas: {
        version: string;
    };
    ui: {
        version: string;
    };
}

interface StateToProps {
    user: any;
    tool: Tool;
    switchSettingsShortcut: string;
    settingsDialogShown: boolean;
    changePasswordDialogShown: boolean;
    changePasswordFetching: boolean;
    logoutFetching: boolean;
    renderChangePasswordItem: boolean;
    isAnalyticsPluginActive: boolean;
    isModelsPluginActive: boolean;
    isGitPluginActive: boolean;
    organizationsFetching: boolean;
    organizationsList: any[];
    currentOrganization: any | null;
}

interface DispatchToProps {
    onLogout: () => void;
    switchSettingsDialog: (show: boolean) => void;
    switchChangePasswordDialog: (show: boolean) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        auth: {
            user,
            fetching: logoutFetching,
            fetching: changePasswordFetching,
            showChangePasswordDialog: changePasswordDialogShown,
            allowChangePassword: renderChangePasswordItem,
        },
        plugins: { list },
        about: { server, packageVersion },
        shortcuts: { normalizedKeyMap },
        settings: { showDialog: settingsDialogShown },
        organizations: { fetching: organizationsFetching, list: organizationsList, current: currentOrganization },
    } = state;

    return {
        user,
        tool: {
            name: server.name as string,
            description: server.description as string,
            server: {
                host: core.config.backendAPI.slice(0, -7),
                version: server.version as string,
            },
            canvas: {
                version: packageVersion.canvas,
            },
            core: {
                version: packageVersion.core,
            },
            ui: {
                version: packageVersion.ui,
            },
        },
        switchSettingsShortcut: normalizedKeyMap.SWITCH_SETTINGS,
        settingsDialogShown,
        changePasswordDialogShown,
        changePasswordFetching,
        logoutFetching,
        renderChangePasswordItem,
        isAnalyticsPluginActive: list.ANALYTICS,
        isModelsPluginActive: list.MODELS,
        isGitPluginActive: list.GIT_INTEGRATION,
        organizationsList,
        organizationsFetching,
        currentOrganization,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onLogout: (): void => dispatch(logoutAsync()),
        switchSettingsDialog: (show: boolean): void => dispatch(switchSettingsDialogAction(show)),
        switchChangePasswordDialog: (show: boolean): void => dispatch(authActions.switchChangePasswordDialog(show)),
    };
}

type Props = StateToProps & DispatchToProps;

function HeaderContainer(props: Props): JSX.Element {
    const {
        user,
        tool,
        logoutFetching,
        changePasswordFetching,
        settingsDialogShown,
        switchSettingsShortcut,
        onLogout,
        switchSettingsDialog,
        switchChangePasswordDialog,
        renderChangePasswordItem,
        isAnalyticsPluginActive,
        isModelsPluginActive,
        organizationsFetching,
        organizationsList,
        currentOrganization,
    } = props;

    const {
        CHANGELOG_URL, LICENSE_URL, GITTER_URL, FORUM_URL, GITHUB_URL, GUIDE_URL,
    } = consts;

    const history = useHistory();

    function showAboutModal(): void {
        Modal.info({
            title: `${tool.name}`,
            content: (
                <div>
                    <p>{`${tool.description}`}</p>
                    <p>
                        <Text strong>Server version:</Text>
                        <Text type='secondary'>{` ${tool.server.version}`}</Text>
                    </p>
                    <p>
                        <Text strong>Core version:</Text>
                        <Text type='secondary'>{` ${tool.core.version}`}</Text>
                    </p>
                    <p>
                        <Text strong>Canvas version:</Text>
                        <Text type='secondary'>{` ${tool.canvas.version}`}</Text>
                    </p>
                    <p>
                        <Text strong>UI version:</Text>
                        <Text type='secondary'>{` ${tool.ui.version}`}</Text>
                    </p>
                    <Row justify='space-around'>
                        <Col>
                            <a href={CHANGELOG_URL} target='_blank' rel='noopener noreferrer'>
                                What&apos;s new?
                            </a>
                        </Col>
                        <Col>
                            <a href={LICENSE_URL} target='_blank' rel='noopener noreferrer'>
                                License
                            </a>
                        </Col>
                        <Col>
                            <a href={GITTER_URL} target='_blank' rel='noopener noreferrer'>
                                Need help?
                            </a>
                        </Col>
                        <Col>
                            <a href={FORUM_URL} target='_blank' rel='noopener noreferrer'>
                                Forum on Intel Developer Zone
                            </a>
                        </Col>
                    </Row>
                </div>
            ),
            width: 800,
            okButtonProps: {
                style: {
                    width: '100px',
                },
            },
        });
    }

    const userMenu = (
        <Menu className='cvat-header-menu' mode='vertical'>
            {user.isStaff && (
                <Menu.Item
                    key='admin_page'
                    onClick={(): void => {
                        // false positive
                        // eslint-disable-next-line
                        window.open(`${tool.server.host}/admin`, '_blank');
                    }}
                >
                    <ControlOutlined />
                    Admin page
                </Menu.Item>
            )}

            <Menu.Item
                key='settings'
                title={`Press ${switchSettingsShortcut} to switch`}
                onClick={() => switchSettingsDialog(true)}
            >
                <SettingOutlined />
                Settings
            </Menu.Item>
            <Menu.Item key='about' onClick={() => showAboutModal()}>
                <InfoCircleOutlined />
                About
            </Menu.Item>
            {renderChangePasswordItem && (
                <Menu.Item
                    key='change_password'
                    className='cvat-header-menu-change-password'
                    onClick={(): void => switchChangePasswordDialog(true)}
                    disabled={changePasswordFetching}
                >
                    {changePasswordFetching ? <LoadingOutlined /> : <EditOutlined />}
                    Change password
                </Menu.Item>
            )}

            <Menu.Item key='logout' onClick={onLogout} disabled={logoutFetching}>
                {logoutFetching ? <LoadingOutlined /> : <LogoutOutlined />}
                Logout
            </Menu.Item>
        </Menu>
    );

    enum OrganizationMenuKeys {
        CREATE = 'create',
        OPEN = 'open',
        LIST = 'list',
    }

    const organizationMenu = (
        <Menu className='cvat-header-menu'>
            <Menu.Item
                key={OrganizationMenuKeys.CREATE}
                onClick={() => {
                    history.push('/organizations/create');
                }}
            >
                <PlusOutlined />
                <Text strong>Create</Text>
            </Menu.Item>
            {currentOrganization ? (
                <Menu.Item
                    key={OrganizationMenuKeys.OPEN}
                    onClick={(): void => {
                        history.push('/organization');
                    }}
                >
                    <ExpandAltOutlined />
                    Open
                </Menu.Item>
            ) : null}
            {organizationsList.length ? (
                <Menu.ItemGroup title='Your organizations' key={OrganizationMenuKeys.LIST}>
                    <Menu.Item
                        key='$personalWorkspace'
                        onClick={() => {
                            localStorage.removeItem('currentOrganization');
                            if (/\d+$/.test(window.location.pathname)) {
                                // some data are opened
                                window.location.pathname = '/';
                            } else {
                                window.location.reload();
                            }
                        }}
                    >
                        <Text strong={!currentOrganization}>Personal workspace</Text>
                    </Menu.Item>
                    {organizationsList.map(
                        (organization: any): JSX.Element => (
                            <Menu.Item
                                key={organization.slug}
                                onClick={() => {
                                    if (!currentOrganization || currentOrganization.slug !== organization.slug) {
                                        localStorage.setItem('currentOrganization', organization.slug);
                                        if (/\d+$/.test(window.location.pathname)) {
                                            // some data are opened
                                            window.location.pathname = '/';
                                        } else {
                                            window.location.reload();
                                        }
                                    }
                                }}
                            >
                                <CVATTooltip overlay={organization.name}>
                                    <Text
                                        strong={currentOrganization && organization.slug === currentOrganization.slug}
                                    >
                                        {organization.slug}
                                    </Text>
                                </CVATTooltip>
                            </Menu.Item>
                        ),
                    )}
                </Menu.ItemGroup>
            ) : null}
        </Menu>
    );

    return (
        <Layout.Header className='cvat-header'>
            <div className='cvat-left-header'>
                <Icon className='cvat-logo-icon' component={CVATLogo} />
                <Button
                    className='cvat-header-button'
                    type='link'
                    value='projects'
                    href='/projects'
                    onClick={(event: React.MouseEvent): void => {
                        event.preventDefault();
                        history.push('/projects');
                    }}
                >
                    Projects
                </Button>
                <Button
                    className='cvat-header-button'
                    type='link'
                    value='tasks'
                    href='/tasks?page=1'
                    onClick={(event: React.MouseEvent): void => {
                        event.preventDefault();
                        history.push('/tasks?page=1');
                    }}
                >
                    Tasks
                </Button>
                <Button
                    className='cvat-header-button'
                    type='link'
                    value='cloudstorages'
                    href='/cloudstorages?page=1'
                    onClick={(event: React.MouseEvent): void => {
                        event.preventDefault();
                        history.push('/cloudstorages?page=1');
                    }}
                >
                    Cloud Storages
                </Button>
                {isModelsPluginActive && (
                    <Button
                        className='cvat-header-button'
                        type='link'
                        value='models'
                        href='/models'
                        onClick={(event: React.MouseEvent): void => {
                            event.preventDefault();
                            history.push('/models');
                        }}
                    >
                        Models
                    </Button>
                )}
                {isAnalyticsPluginActive && (
                    <Button
                        className='cvat-header-button'
                        type='link'
                        href={`${tool.server.host}/analytics/app/kibana`}
                        onClick={(event: React.MouseEvent): void => {
                            event.preventDefault();
                            // false positive
                            // eslint-disable-next-line
                            window.open(`${tool.server.host}/analytics/app/kibana`, '_blank');
                        }}
                    >
                        Analytics
                    </Button>
                )}
            </div>
            <div className='cvat-right-header'>
                <CVATTooltip overlay='Click to open repository'>
                    <Button
                        icon={<GithubOutlined />}
                        size='large'
                        className='cvat-header-button'
                        type='link'
                        href={GITHUB_URL}
                        onClick={(event: React.MouseEvent): void => {
                            event.preventDefault();
                            window.open(GITHUB_URL, '_blank');
                        }}
                    />
                </CVATTooltip>
                <CVATTooltip overlay='Click to open guide'>
                    <Button
                        icon={<QuestionCircleOutlined />}
                        size='large'
                        className='cvat-header-button'
                        type='link'
                        href={GUIDE_URL}
                        onClick={(event: React.MouseEvent): void => {
                            event.preventDefault();
                            window.open(GUIDE_URL, '_blank');
                        }}
                    />
                </CVATTooltip>
                <Dropdown
                    disabled={organizationsFetching}
                    overlay={organizationMenu}
                    className='cvat-header-menu-organization-dropdown'
                >
                    <span>
                        <TeamOutlined className='cvat-header-dropdown-icon' />
                        {currentOrganization ? (
                            <Text strong>{currentOrganization.slug}</Text>
                        ) : (
                            <Text type='secondary'>Not selected</Text>
                        )}
                        {organizationsFetching ? (
                            <LoadingOutlined className='cvat-header-dropdown-icon' />
                        ) : (
                            <CaretDownOutlined className='cvat-header-dropdown-icon' />
                        )}
                    </span>
                </Dropdown>
                <Dropdown overlay={userMenu} className='cvat-header-menu-user-dropdown'>
                    <span>
                        <UserOutlined className='cvat-header-dropdown-icon' />
                        <Text strong>
                            {user.username.length > 14 ? `${user.username.slice(0, 10)} ...` : user.username}
                        </Text>
                        <CaretDownOutlined className='cvat-header-dropdown-icon' />
                    </span>
                </Dropdown>
            </div>
            <SettingsModal visible={settingsDialogShown} onClose={() => switchSettingsDialog(false)} />
            {renderChangePasswordItem && <ChangePasswordDialog onClose={() => switchChangePasswordDialog(false)} />}
        </Layout.Header>
    );
}

function propsAreTheSame(prevProps: Props, nextProps: Props): boolean {
    let equal = true;
    for (const prop in nextProps) {
        if (prop in prevProps && (prevProps as any)[prop] !== (nextProps as any)[prop]) {
            if (prop !== 'tool') {
                equal = false;
            }
        }
    }

    return equal;
}

export default connect(mapStateToProps, mapDispatchToProps)(React.memo(HeaderContainer, propsAreTheSame));
