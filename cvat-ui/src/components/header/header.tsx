// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useHistory, useLocation } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import { MenuProps } from 'antd/lib/menu';
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
    MailOutlined,
} from '@ant-design/icons';
import Layout from 'antd/lib/layout';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';
import notification from 'antd/lib/notification';

import config from 'config';

import { Organization, getCore } from 'cvat-core-wrapper';
import { CVATLogo } from 'icons';
import ChangePasswordDialog from 'components/change-password-modal/change-password-modal';
import CVATTooltip from 'components/common/cvat-tooltip';
import { switchSettingsModalVisible as switchSettingsModalVisibleAction } from 'actions/settings-actions';
import { logoutAsync, authActions } from 'actions/auth-actions';
import { shortcutsActions } from 'actions/shortcuts-actions';
import { AboutState, CombinedState } from 'reducers';
import { useIsMounted, usePlugins } from 'utils/hooks';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import SettingsModal from './settings-modal/settings-modal';
import OrganizationsSearch from './organizations-search';

interface StateToProps {
    user: any;
    about: AboutState;
    keyMap: KeyMap;
    switchSettingsShortcut: string;
    settingsModalVisible: boolean;
    shortcutsModalVisible: boolean;
    changePasswordDialogShown: boolean;
    changePasswordFetching: boolean;
    logoutFetching: boolean;
    renderChangePasswordItem: boolean;
    isAnalyticsPluginActive: boolean;
    isModelsPluginActive: boolean;
    organizationFetching: boolean;
    currentOrganization: any | null;
}

interface DispatchToProps {
    onLogout: () => void;
    switchSettingsModalVisible: (visible: boolean) => void;
    switchShortcutsModalVisible: (visible: boolean) => void;
    switchChangePasswordModalVisible: (visible: boolean) => void;
}

const core = getCore();

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        auth: {
            user,
            fetching: logoutFetching,
            fetching: changePasswordFetching,
            showChangePasswordDialog: changePasswordDialogShown,
        },
        plugins: { list },
        about,
        shortcuts: { normalizedKeyMap, keyMap, visibleShortcutsHelp: shortcutsModalVisible },
        settings: { showDialog: settingsModalVisible },
        organizations: { fetching: organizationFetching, current: currentOrganization },
        serverAPI: {
            configuration: {
                isPasswordChangeEnabled: renderChangePasswordItem,
            },
        },
    } = state;

    return {
        user,
        about,
        switchSettingsShortcut: normalizedKeyMap.SWITCH_SETTINGS,
        keyMap,
        settingsModalVisible,
        shortcutsModalVisible,
        changePasswordDialogShown,
        changePasswordFetching,
        logoutFetching,
        renderChangePasswordItem,
        isAnalyticsPluginActive: list.ANALYTICS,
        isModelsPluginActive: list.MODELS,
        organizationFetching,
        currentOrganization,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onLogout: (): void => dispatch(logoutAsync()),
        switchShortcutsModalVisible: (visible: boolean): void => dispatch(
            shortcutsActions.switchShortcutsModalVisible(visible),
        ),
        switchSettingsModalVisible: (visible: boolean): void => dispatch(
            switchSettingsModalVisibleAction(visible),
        ),
        switchChangePasswordModalVisible: (visible: boolean): void => dispatch(
            authActions.switchChangePasswordModalVisible(visible),
        ),
    };
}

type Props = StateToProps & DispatchToProps;

function HeaderComponent(props: Props): JSX.Element {
    const {
        user,
        about,
        keyMap,
        logoutFetching,
        changePasswordFetching,
        settingsModalVisible,
        shortcutsModalVisible,
        switchSettingsShortcut,
        renderChangePasswordItem,
        isAnalyticsPluginActive,
        isModelsPluginActive,
        organizationFetching,
        currentOrganization,
        switchSettingsModalVisible,
        switchShortcutsModalVisible,
        switchChangePasswordModalVisible,
    } = props;

    const {
        CHANGELOG_URL, LICENSE_URL, GITHUB_URL, GUIDE_URL, DISCORD_URL,
    } = config;

    const isMounted = useIsMounted();
    const [listFetching, setListFetching] = useState(false);
    const [organizationsList, setOrganizationList] = useState<Organization[] | null>(null);

    const searchCallback = useCallback((search?: string): Promise<Organization[]> => new Promise((resolve, reject) => {
        const promise = core.organizations.get(search ? { search } : {});

        setListFetching(true);
        promise.then((organizations: Organization[]) => {
            resolve(organizations);
        }).catch((error: unknown) => {
            reject(error);
        }).finally(() => {
            if (isMounted()) {
                setListFetching(false);
            }
        });
    }), []);

    useEffect(() => {
        searchCallback().then((organizations: Organization[]) => {
            if (isMounted()) {
                setOrganizationList(organizations);
            }
        }).catch((error: unknown) => {
            setOrganizationList([]);
            notification.error({
                message: 'Could not receive a list of organizations',
                description: error instanceof Error ? error.message : '',
            });
        });
    }, []);

    const history = useHistory();
    const location = useLocation();

    const subKeyMap = {
        SWITCH_SHORTCUTS: keyMap.SWITCH_SHORTCUTS,
        SWITCH_SETTINGS: keyMap.SWITCH_SETTINGS,
    };

    const handlers = {
        SWITCH_SHORTCUTS: (event: KeyboardEvent) => {
            if (event) event.preventDefault();
            if (!settingsModalVisible) {
                switchShortcutsModalVisible(!shortcutsModalVisible);
            }
        },
        SWITCH_SETTINGS: (event: KeyboardEvent) => {
            if (event) event.preventDefault();
            if (!shortcutsModalVisible) {
                switchSettingsModalVisible(!settingsModalVisible);
            }
        },
    };

    const aboutPlugins = usePlugins((state: CombinedState) => state.plugins.components.about.links.items, props);
    const aboutLinks: [JSX.Element, number][] = [];
    aboutLinks.push([(
        <Col key='changelog'>
            <a href={CHANGELOG_URL} target='_blank' rel='noopener noreferrer'>
                What&apos;s new?
            </a>
        </Col>
    ), 0]);
    aboutLinks.push([(
        <Col key='license'>
            <a href={LICENSE_URL} target='_blank' rel='noopener noreferrer'>
                MIT License
            </a>
        </Col>
    ), 10]);
    aboutLinks.push([(
        <Col key='discord'>
            <a href={DISCORD_URL} target='_blank' rel='noopener noreferrer'>
                Find us on Discord
            </a>
        </Col>
    ), 20]);

    aboutLinks.push(...aboutPlugins.map(({ component: Component, weight }, index: number) => (
        [<Component key={index} targetProps={props} />, weight] as [JSX.Element, number]
    )));

    const showAboutModal = useCallback((): void => {
        Modal.info({
            title: `${about.server.name}`,
            content: (
                <div>
                    <p>{`${about.server.description}`}</p>
                    <p>
                        <Text strong>Server version:</Text>
                        <Text type='secondary'>{` ${about.server.version}`}</Text>
                    </p>
                    <p>
                        <Text strong>Core version:</Text>
                        <Text type='secondary'>{` ${about.packageVersion.core}`}</Text>
                    </p>
                    <p>
                        <Text strong>Canvas version:</Text>
                        <Text type='secondary'>{` ${about.packageVersion.canvas}`}</Text>
                    </p>
                    <p>
                        <Text strong>UI version:</Text>
                        <Text type='secondary'>{` ${about.packageVersion.ui}`}</Text>
                    </p>
                    <Row justify='space-around'>
                        { aboutLinks.sort((item1, item2) => item1[1] - item2[1])
                            .map((item) => item[0]) }
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
    }, [about]);

    const closeSettings = useCallback(() => {
        switchSettingsModalVisible(false);
    }, []);

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

    const plugins = usePlugins((state: CombinedState) => state.plugins.components.header.userMenu.items, props);

    const menuItems: [NonNullable<MenuProps['items']>[0], number][] = [];
    if (user.isStaff) {
        menuItems.push([{
            key: 'admin_page',
            icon: <ControlOutlined />,
            onClick: (): void => {
                window.open('/admin', '_blank');
            },
            label: 'Admin page',
        }, 0]);
    }

    const viewType: 'menu' | 'list' = (organizationsList?.length || 0) > 5 ? 'list' : 'menu';

    menuItems.push([{
        key: 'organization',
        icon: organizationFetching || listFetching ? <LoadingOutlined /> : <TeamOutlined />,
        label: 'Organization',
        disabled: organizationFetching || listFetching,
        children: [
            ...(currentOrganization ? [{
                key: 'open_organization',
                icon: <SettingOutlined />,
                label: 'Settings',
                className: 'cvat-header-menu-open-organization',
                onClick: () => history.push('/organization'),
            }] : []), {
                key: 'invitations',
                icon: <MailOutlined />,
                label: 'Invitations',
                className: 'cvat-header-menu-organization-invitations-item',
                onClick: () => history.push('/invitations'),
            }, {
                key: 'create_organization',
                icon: <PlusOutlined />,
                label: 'Create',
                className: 'cvat-header-menu-create-organization',
                onClick: () => history.push('/organizations/create'),
            },
            ...(!!organizationsList && viewType === 'list' ? [{
                key: 'switch_organization',
                label: 'Switch organization',
                onClick: () => {
                    Modal.confirm({
                        title: 'Select an organization',
                        okButtonProps: {
                            style: { display: 'none' },
                        },
                        content: (
                            <OrganizationsSearch
                                defaultOrganizationList={organizationsList}
                                resetOrganization={resetOrganization}
                                searchOrganizations={searchCallback}
                                setNewOrganization={setNewOrganization}
                            />
                        ),
                    });
                },
            }] : []),
            ...(!!organizationsList && viewType === 'menu' ? [{
                type: 'divider' as const,
            }, {
                key: '$personal',
                label: 'Personal workspace',
                className: !currentOrganization ? 'cvat-header-menu-active-organization-item' : 'cvat-header-menu-organization-item',
                onClick: resetOrganization,
            }, ...organizationsList.map((organization: Organization) => ({
                key: organization.slug,
                onClick: () => setNewOrganization(organization),
                className: currentOrganization?.slug === organization.slug ? 'cvat-header-menu-active-organization-item' : 'cvat-header-menu-organization-item',
                label: organization.slug,
            }))] : []),
        ],
    }, 10]);

    menuItems.push([{
        key: 'settings',
        icon: <SettingOutlined />,
        onClick: () => switchSettingsModalVisible(true),
        title: `Press ${switchSettingsShortcut} to switch`,
        label: 'Settings',
    }, 20]);

    menuItems.push([{
        key: 'about',
        icon: <InfoCircleOutlined />,
        onClick: () => showAboutModal(),
        label: 'About',
    }, 30]);

    if (renderChangePasswordItem) {
        menuItems.push([{
            key: 'change_password',
            icon: changePasswordFetching ? <LoadingOutlined /> : <EditOutlined />,
            className: 'cvat-header-menu-change-password',
            onClick: () => switchChangePasswordModalVisible(true),
            label: 'Change password',
            disabled: changePasswordFetching,
        }, 40]);
    }

    menuItems.push([{
        key: 'logout',
        icon: logoutFetching ? <LoadingOutlined /> : <LogoutOutlined />,
        onClick: () => history.push('/auth/logout'),
        label: 'Logout',
        disabled: logoutFetching,
    }, 50]);

    menuItems.push(...plugins
        .map(({ component, weight }): typeof menuItems[0] => [component({ targetProps: props }), weight]),
    );

    const getButtonClassName = (value: string): string => {
        // eslint-disable-next-line security/detect-non-literal-regexp
        const regex = new RegExp(`${value}$`);
        const baseClass = `cvat-header-${value}-button cvat-header-button`;
        return location.pathname.match(regex) ?
            `${baseClass} cvat-active-header-button` : baseClass;
    };

    return (
        <Layout.Header className='cvat-header'>
            <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} />
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
                {isAnalyticsPluginActive && user.isSuperuser ? (
                    <Button
                        className={getButtonClassName('analytics')}
                        type='link'
                        href='/analytics'
                        onClick={(event: React.MouseEvent): void => {
                            event.preventDefault();
                            window.open('/analytics', '_blank');
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
                        className='cvat-open-repository-button cvat-header-button'
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
                        className='cvat-open-guide-button cvat-header-button'
                        type='link'
                        href={GUIDE_URL}
                        onClick={(event: React.MouseEvent): void => {
                            event.preventDefault();
                            window.open(GUIDE_URL, '_blank');
                        }}
                    />
                </CVATTooltip>
                <Dropdown
                    trigger={['click']}
                    destroyPopupOnHide
                    placement='bottomRight'
                    menu={{
                        items: menuItems.sort((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1])
                            .map((menuItem) => menuItem[0]),
                        triggerSubMenuAction: 'click',
                        className: 'cvat-header-menu',
                    }}
                    className='cvat-header-menu-user-dropdown'
                >
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
            <SettingsModal visible={settingsModalVisible} onClose={closeSettings} />
            {renderChangePasswordItem && (
                <ChangePasswordDialog onClose={() => switchChangePasswordModalVisible(false)} />
            )}
        </Layout.Header>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(React.memo(HeaderComponent));
