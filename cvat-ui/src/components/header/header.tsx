// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback } from 'react';
import { connect } from 'react-redux';
import { useHistory, useLocation } from 'react-router';
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
    UserOutlined,
    TeamOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import Layout from 'antd/lib/layout';
import Button from 'antd/lib/button';
import Menu from 'antd/lib/menu';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';

import { getCore } from 'cvat-core-wrapper';
import consts from 'consts';

import { CVATLogo } from 'icons';
import ChangePasswordDialog from 'components/change-password-modal/change-password-modal';
import CVATTooltip from 'components/common/cvat-tooltip';
import { switchSettingsDialog as switchSettingsDialogAction } from 'actions/settings-actions';
import { logoutAsync, authActions } from 'actions/auth-actions';
import { CombinedState } from 'reducers';
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
        organizations: { fetching: organizationsFetching, current: currentOrganization, list: organizationsList },
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
        organizationsFetching,
        currentOrganization,
        organizationsList,
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
        currentOrganization,
        organizationsList,
    } = props;

    const {
        CHANGELOG_URL, LICENSE_URL, GITTER_URL, GITHUB_URL, GUIDE_URL, DISCORD_URL,
    } = consts;

    const history = useHistory();
    const location = useLocation();

    const showAboutModal = useCallback((): void => {
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
                                MIT License
                            </a>
                        </Col>
                        <Col>
                            <a href={GITTER_URL} target='_blank' rel='noopener noreferrer'>
                                Need help?
                            </a>
                        </Col>
                        <Col>
                            <a href={DISCORD_URL} target='_blank' rel='noopener noreferrer'>
                                Find us on Discord
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
    }, [tool]);

    const resetOrganization = (): void => {
        localStorage.removeItem('currentOrganization');
        if (/(webhooks)|(\d+)/.test(window.location.pathname)) {
            window.location.pathname = '/';
        } else {
            window.location.reload();
        }
    };

    const setNewOrganization = (organization: any): void => {
        if (!currentOrganization || currentOrganization.slug !== organization.slug) {
            localStorage.setItem('currentOrganization', organization.slug);
            if (/\d+/.test(window.location.pathname)) {
                // a resource is opened (task/job/etc.)
                window.location.pathname = '/';
            } else {
                window.location.reload();
            }
        }
    };

    const userMenu = (
        <Menu className='cvat-header-menu'>
            {user.isStaff && (
                <Menu.Item
                    icon={<ControlOutlined />}
                    key='admin_page'
                    onClick={(): void => {
                        // false positive
                        // eslint-disable-next-line
                        window.open(`${tool.server.host}/admin`, '_blank');
                    }}
                >
                    Admin page
                </Menu.Item>
            )}
            <Menu.SubMenu
                disabled={organizationsFetching}
                key='organization'
                title='Organization'
                icon={organizationsFetching ? <LoadingOutlined /> : <TeamOutlined />}
            >
                {currentOrganization ? (
                    <Menu.Item icon={<SettingOutlined />} key='open_organization' onClick={() => history.push('/organization')} className='cvat-header-menu-open-organization'>
                        Settings
                    </Menu.Item>
                ) : null}
                <Menu.Item icon={<PlusOutlined />} key='create_organization' onClick={() => history.push('/organizations/create')} className='cvat-header-menu-create-organization'>Create</Menu.Item>
                { organizationsList.length > 5 ? (
                    <Menu.Item
                        key='switch_organization'
                        onClick={() => {
                            Modal.confirm({
                                title: 'Select an organization',
                                okButtonProps: {
                                    style: { display: 'none' },
                                },
                                content: (
                                    <Select
                                        showSearch
                                        className='cvat-modal-organization-selector'
                                        value={currentOrganization?.slug}
                                        onChange={(value: string) => {
                                            if (value === '$personal') {
                                                resetOrganization();
                                                return;
                                            }

                                            const [organization] = organizationsList
                                                .filter((_organization): boolean => _organization.slug === value);
                                            if (organization) {
                                                setNewOrganization(organization);
                                            }
                                        }}
                                    >
                                        <Select.Option value='$personal'>Personal workspace</Select.Option>
                                        {organizationsList.map((organization: any): JSX.Element => {
                                            const { slug } = organization;
                                            return <Select.Option key={slug} value={slug}>{slug}</Select.Option>;
                                        })}
                                    </Select>
                                ),
                            });
                        }}
                    >
                        Switch organization
                    </Menu.Item>
                ) : (
                    <>
                        <Menu.Divider />
                        <Menu.ItemGroup>
                            <Menu.Item
                                className={!currentOrganization ?
                                    'cvat-header-menu-active-organization-item' : 'cvat-header-menu-organization-item'}
                                key='$personal'
                                onClick={resetOrganization}
                            >
                                Personal workspace
                            </Menu.Item>
                            {organizationsList.map((organization: any): JSX.Element => (
                                <Menu.Item
                                    className={currentOrganization?.slug === organization.slug ?
                                        'cvat-header-menu-active-organization-item' : 'cvat-header-menu-organization-item'}
                                    key={organization.slug}
                                    onClick={() => setNewOrganization(organization)}
                                >
                                    {organization.slug}
                                </Menu.Item>
                            ))}
                        </Menu.ItemGroup>
                    </>
                )}
            </Menu.SubMenu>
            <Menu.Item
                icon={<SettingOutlined />}
                key='settings'
                title={`Press ${switchSettingsShortcut} to switch`}
                onClick={() => switchSettingsDialog(true)}
            >
                Settings
            </Menu.Item>
            <Menu.Item icon={<InfoCircleOutlined />} key='about' onClick={() => showAboutModal()}>
                About
            </Menu.Item>
            {renderChangePasswordItem && (
                <Menu.Item
                    key='change_password'
                    icon={changePasswordFetching ? <LoadingOutlined /> : <EditOutlined />}
                    className='cvat-header-menu-change-password'
                    onClick={(): void => switchChangePasswordDialog(true)}
                    disabled={changePasswordFetching}
                >
                    Change password
                </Menu.Item>
            )}

            <Menu.Item
                key='logout'
                icon={logoutFetching ? <LoadingOutlined /> : <LogoutOutlined />}
                onClick={onLogout}
                disabled={logoutFetching}
            >
                Logout
            </Menu.Item>
        </Menu>
    );

    const getButtonClassName = (value: string): string => {
        // eslint-disable-next-line security/detect-non-literal-regexp
        const regex = new RegExp(`${value}$`);
        return location.pathname.match(regex) ? 'cvat-header-button cvat-active-header-button' : 'cvat-header-button';
    };

    return (
        <Layout.Header className='cvat-header'>
            <div className='cvat-left-header'>
                <Icon className='cvat-logo-icon' component={CVATLogo} />
                <Button
                    className={getButtonClassName('projects')}
                    type='link'
                    value='projects'
                    href='/projects?page=1'
                    onClick={(event: React.MouseEvent): void => {
                        event.preventDefault();
                        history.push('/projects');
                    }}
                >
                    Projects
                </Button>
                <Button
                    className={getButtonClassName('tasks')}
                    type='link'
                    value='tasks'
                    href='/tasks?page=1'
                    onClick={(event: React.MouseEvent): void => {
                        event.preventDefault();
                        history.push('/tasks');
                    }}
                >
                    Tasks
                </Button>
                <Button
                    className={getButtonClassName('jobs')}
                    type='link'
                    value='jobs'
                    href='/jobs?page=1'
                    onClick={(event: React.MouseEvent): void => {
                        event.preventDefault();
                        history.push('/jobs');
                    }}
                >
                    Jobs
                </Button>
                <Button
                    className={getButtonClassName('cloudstorages')}
                    type='link'
                    value='cloudstorages'
                    href='/cloudstorages?page=1'
                    onClick={(event: React.MouseEvent): void => {
                        event.preventDefault();
                        history.push('/cloudstorages');
                    }}
                >
                    Cloud Storages
                </Button>
                {isModelsPluginActive ? (
                    <Button
                        className={getButtonClassName('models')}
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
                ) : null}
                {isAnalyticsPluginActive ? (
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
                ) : null}
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
                            // false alarm
                            // eslint-disable-next-line security/detect-non-literal-fs-filename
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
                            // false alarm
                            // eslint-disable-next-line security/detect-non-literal-fs-filename
                            window.open(GUIDE_URL, '_blank');
                        }}
                    />
                </CVATTooltip>
                <Dropdown placement='bottomRight' overlay={userMenu} className='cvat-header-menu-user-dropdown'>
                    <span>
                        <UserOutlined className='cvat-header-dropdown-icon' />
                        <Row>
                            <Col span={24}>
                                <Text strong className='cvat-header-menu-user-dropdown-user'>
                                    {user.username.length > 14 ? `${user.username.slice(0, 10)} ...` : user.username}
                                </Text>
                            </Col>
                            { currentOrganization ? (
                                <Col span={24}>
                                    <Text className='cvat-header-menu-user-dropdown-organization'>
                                        {currentOrganization.slug}
                                    </Text>
                                </Col>
                            ) : null }
                        </Row>
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
