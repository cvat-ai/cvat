// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useHistory, useLocation } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import { MenuProps } from 'antd/lib/menu';
import {
    SettingOutlined,
    LoadingOutlined,
    LogoutOutlined,
    GithubOutlined,
    QuestionCircleOutlined,
    FileTextOutlined,
    CustomerServiceOutlined,
    ExportOutlined,
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
import Popover from 'antd/lib/popover';
import Text from 'antd/lib/typography/Text';

import config from 'config';

import { Organization } from 'cvat-core-wrapper';
import CVATLogo from 'components/common/cvat-logo';
import { switchSettingsModalVisible as switchSettingsModalVisibleAction } from 'actions/settings-actions';
import { logoutAsync } from 'actions/auth-actions';
import { shortcutsActions, registerComponentShortcuts } from 'actions/shortcuts-actions';
import { getOrganizationsAsync, organizationActions } from 'actions/organization-actions';
import { AboutState, CombinedState } from 'reducers';
import { useIsMounted, usePlugins } from 'utils/hooks';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import SettingsModal from './settings-modal/settings-modal';

interface StateToProps {
    user: any;
    about: AboutState;
    keyMap: KeyMap;
    switchSettingsShortcut: string;
    settingsModalVisible: boolean;
    shortcutsModalVisible: boolean;
    changePasswordDialogShown: boolean;
    logoutFetching: boolean;
    isAnalyticsPluginActive: boolean;
    organizationFetching: boolean;
    currentOrganization: any | null;
    organizationsList: Organization[];
    organizationsListFetching: boolean;
    organizationsListSearch: string;
    organizationsListPage: number;
}

interface DispatchToProps {
    onLogout: () => void;
    switchSettingsModalVisible: (visible: boolean) => void;
    switchShortcutsModalVisible: (visible: boolean) => void;
    fetchOrganizations: () => void;
    openSelectOrganizationModal: (onSelectOrgCallback: (org: Organization | null) => void) => void;
}

const componentShortcuts = {
    SWITCH_SHORTCUTS: {
        name: 'Show shortcuts',
        description: 'Open/hide the list of available shortcuts',
        sequences: ['f1'],
        scope: ShortcutScope.GENERAL,
    },
    SWITCH_SETTINGS: {
        name: 'Show settings',
        description: 'Open/hide settings dialog',
        sequences: ['f2'],
        scope: ShortcutScope.GENERAL,
    },
};

registerComponentShortcuts(componentShortcuts);

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        auth: {
            user,
            fetching: logoutFetching,
            showChangePasswordDialog: changePasswordDialogShown,
        },
        plugins: { list },
        about,
        shortcuts: { normalizedKeyMap, keyMap, visibleShortcutsHelp: shortcutsModalVisible },
        settings: { showDialog: settingsModalVisible },
        organizations: {
            fetching: organizationFetching,
            current: currentOrganization,
            currentArray: organizationsList,
            currentArrayFetching: organizationsListFetching,
            gettingQuery: {
                search: organizationsListSearch,
                page: organizationsListPage,
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
        logoutFetching,
        isAnalyticsPluginActive: list.ANALYTICS,
        organizationFetching,
        currentOrganization,
        organizationsList,
        organizationsListFetching,
        organizationsListSearch,
        organizationsListPage,
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
        fetchOrganizations: (): void => dispatch(
            getOrganizationsAsync({}),
        ),
        openSelectOrganizationModal: (
            onSelectOrgCallback: (org: Organization | null) => void,
        ): void => dispatch(
            organizationActions.openSelectOrganizationModal(onSelectOrgCallback),
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
        settingsModalVisible,
        shortcutsModalVisible,
        switchSettingsShortcut,
        isAnalyticsPluginActive,
        organizationFetching,
        currentOrganization,
        organizationsList,
        organizationsListFetching,
        organizationsListSearch,
        organizationsListPage,
        switchSettingsModalVisible,
        switchShortcutsModalVisible,
        fetchOrganizations,
        openSelectOrganizationModal,
    } = props;

    const {
        GITHUB_URL,
        GUIDE_URL,
        DISCORD_URL,
        LICENSE_URL,
    } = config;
    const [helpMenuVisible, setHelpMenuVisible] = useState(false);

    const isMounted = useIsMounted();

    useEffect(() => {
        if (isMounted()) {
            fetchOrganizations();
        }
    }, []);

    const history = useHistory();
    const location = useLocation();

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        SWITCH_SHORTCUTS: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            if (!settingsModalVisible) {
                switchShortcutsModalVisible(!shortcutsModalVisible);
            }
        },
        SWITCH_SETTINGS: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            if (!shortcutsModalVisible) {
                switchSettingsModalVisible(!settingsModalVisible);
            }
        },
    };

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

    const setNewOrganization = (organization: Organization | null): void => {
        if (currentOrganization && !organization) {
            resetOrganization();
        } else if (organization && (!currentOrganization || currentOrganization.slug !== organization.slug)) {
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

    menuItems.push([{
        key: 'profile',
        icon: <UserOutlined />,
        onClick: (): void => {
            history.push('/profile');
        },
        label: 'Profile',
    }, 10]);

    const viewType: 'menu' | 'list' = (organizationsList?.length || 0) > 5 ? 'list' : 'menu';

    menuItems.push([{
        key: 'organization',
        icon: organizationFetching || organizationsListFetching ? <LoadingOutlined /> : <TeamOutlined />,
        label: 'Organization',
        disabled: organizationFetching || organizationsListFetching,
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
                    openSelectOrganizationModal(setNewOrganization);
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
    }, 20]);

    menuItems.push([{
        key: 'settings',
        icon: <SettingOutlined />,
        onClick: () => switchSettingsModalVisible(true),
        title: `Press ${switchSettingsShortcut} to switch`,
        label: 'Settings',
    }, 30]);

    menuItems.push([{
        key: 'logout',
        icon: logoutFetching ? <LoadingOutlined /> : <LogoutOutlined />,
        onClick: () => history.push('/auth/logout'),
        label: 'Logout',
        disabled: logoutFetching,
    }, 50]);

    menuItems.push(...plugins
        .map(({ component, weight }): typeof menuItems[0] => [
            (component as (pluginProps?: any) => NonNullable<MenuProps['items']>[0])({ targetProps: props }),
            weight,
        ]),
    );

    const getButtonClassName = (value: string, highlightable = true): string => {
        // eslint-disable-next-line security/detect-non-literal-regexp
        const regex = new RegExp(`${value}$`);
        const baseClass = `cvat-header-${value}-button cvat-header-button`;
        return highlightable && location.pathname.match(regex) ?
            `${baseClass} cvat-active-header-button` : baseClass;
    };

    const helpMenuContent = (
        <div className='cvat-header-help-menu'>
            <div className='cvat-header-help-menu-brand'>
                <span className='cvat-header-help-menu-logo'>CVAT</span>
                <Text strong>CVAT Online</Text>
            </div>
            <div className='cvat-header-help-menu-links'>
                <a href={GUIDE_URL} target='_blank' rel='noopener noreferrer'>
                    <FileTextOutlined />
                    <span>Documentation</span>
                    <ExportOutlined />
                </a>
                <a href={GITHUB_URL} target='_blank' rel='noopener noreferrer'>
                    <GithubOutlined />
                    <span>GitHub</span>
                    <ExportOutlined />
                </a>
                <a href={DISCORD_URL} target='_blank' rel='noopener noreferrer'>
                    <CustomerServiceOutlined />
                    <span>Support</span>
                    <ExportOutlined />
                </a>
            </div>
            <div className='cvat-header-help-menu-footer'>
                <span>{`Version ${about.packageVersion.ui}`}</span>
                <div>
                    <a href='https://www.cvat.ai/privacy' target='_blank' rel='noopener noreferrer'>Privacy</a>
                    <a href='https://www.cvat.ai/terms-of-use' target='_blank' rel='noopener noreferrer'>Terms</a>
                    <a href={LICENSE_URL} target='_blank' rel='noopener noreferrer'>License</a>
                </div>
            </div>
        </div>
    );

    return (
        <Layout.Header className='cvat-header'>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <div className='cvat-left-header'>
                <CVATLogo />
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
                <Button
                    className={getButtonClassName('requests')}
                    type='link'
                    value='requests'
                    href='/requests?page=1'
                    onClick={(event: React.MouseEvent): void => {
                        event.preventDefault();
                        history.push('/requests');
                    }}
                >
                    Requests
                </Button>
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
                {isAnalyticsPluginActive && user.hasAnalyticsAccess ? (
                    <Button
                        className={getButtonClassName('analytics', false)}
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
                <Popover
                    content={helpMenuContent}
                    trigger='click'
                    placement='bottom'
                    open={helpMenuVisible}
                    onOpenChange={setHelpMenuVisible}
                    overlayClassName='cvat-header-help-popover'
                >
                    <Button
                        icon={<QuestionCircleOutlined />}
                        size='large'
                        className='cvat-open-guide-button cvat-header-button'
                        type='link'
                    />
                </Popover>
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
                    onOpenChange={(open: boolean) => {
                        if (open && (organizationsListSearch || organizationsListPage !== 1)) {
                            fetchOrganizations();
                        }
                    }}
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
        </Layout.Header>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(React.memo(HeaderComponent));
