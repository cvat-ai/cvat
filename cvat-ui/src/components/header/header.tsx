// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect } from 'react';
import { connect } from 'react-redux';
import { useHistory, useLocation } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import { MenuProps } from 'antd/lib/menu';
import {
    SettingOutlined,
    InfoCircleOutlined,
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

import config from 'config';

import { Organization } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
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
    isModelsPluginActive: boolean;
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
        name: '显示快捷键',
        description: '打开/隐藏可用快捷键列表',
        sequences: ['f1'],
        scope: ShortcutScope.GENERAL,
    },
    SWITCH_SETTINGS: {
        name: '显示设置',
        description: '打开/隐藏设置对话框',
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
        isModelsPluginActive: list.MODELS,
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
        isModelsPluginActive,
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
        CHANGELOG_URL, LICENSE_URL, GITHUB_URL, GUIDE_URL, DISCORD_URL,
    } = config;

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

    const aboutPlugins = usePlugins((state: CombinedState) => state.plugins.components.about.links.items, props);
    const aboutLinks: [JSX.Element, number][] = [];
    aboutLinks.push([(
        <Col key='changelog'>
            <a href={CHANGELOG_URL} target='_blank' rel='noopener noreferrer'>
                更新日志
            </a>
        </Col>
    ), 0]);
    aboutLinks.push([(
        <Col key='license'>
            <a href={LICENSE_URL} target='_blank' rel='noopener noreferrer'>
                MIT 许可证
            </a>
        </Col>
    ), 10]);
    aboutLinks.push([(
        <Col key='discord'>
            <a href={DISCORD_URL} target='_blank' rel='noopener noreferrer'>
                在 Discord 上找到我们
            </a>
        </Col>
    ), 20]);

    aboutLinks.push(...aboutPlugins.map(({ component: Component, weight }, index: number) => (
        [<Component key={index} targetProps={props} />, weight] as [JSX.Element, number]
    )));

    const showAboutModal = useCallback((): void => {
        const localizedAboutName = about.server.name === 'Computer Vision Annotation Tool' ?
            '计算机视觉标注工具' : about.server.name;
        const localizedAboutDescription = about.server.description.startsWith('CVAT is completely re-designed') ?
            'CVAT 是一个开源的在线交互式图像/视频标注工具，面向计算机视觉任务。我们团队使用它来标注海量对象及其属性；许多 UI 与 UX 设计决策来自专业数据标注团队的反馈。' :
            about.server.description;

        Modal.info({
            title: `${localizedAboutName}`,
            content: (
                <div>
                    <p>{`${localizedAboutDescription}`}</p>
                    <p>
                        <Text strong>服务器版本：</Text>
                        <Text type='secondary'>{` ${about.server.version}`}</Text>
                    </p>
                    <p>
                        <Text strong>UI 版本：</Text>
                        <Text type='secondary'>{` ${about.packageVersion.ui}`}</Text>
                    </p>
                    <Row justify='space-around'>
                        { aboutLinks.sort((item1, item2) => item1[1] - item2[1])
                            .map((item) => item[0]) }
                    </Row>
                </div>
            ),
            width: 800,
            okText: '确定',
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
            label: '管理后台',
        }, 0]);
    }

    menuItems.push([{
        key: 'profile',
        icon: <UserOutlined />,
        onClick: (): void => {
            history.push('/profile');
        },
        label: '个人资料',
    }, 10]);

    const viewType: 'menu' | 'list' = (organizationsList?.length || 0) > 5 ? 'list' : 'menu';

    menuItems.push([{
        key: 'organization',
        icon: organizationFetching || organizationsListFetching ? <LoadingOutlined /> : <TeamOutlined />,
        label: '组织',
        disabled: organizationFetching || organizationsListFetching,
        children: [
            ...(currentOrganization ? [{
                key: 'open_organization',
                icon: <SettingOutlined />,
                label: '设置',
                className: 'cvat-header-menu-open-organization',
                onClick: () => history.push('/organization'),
            }] : []), {
                key: 'invitations',
                icon: <MailOutlined />,
                label: '邀请',
                className: 'cvat-header-menu-organization-invitations-item',
                onClick: () => history.push('/invitations'),
            }, {
                key: 'create_organization',
                icon: <PlusOutlined />,
                label: '创建',
                className: 'cvat-header-menu-create-organization',
                onClick: () => history.push('/organizations/create'),
            },
            ...(!!organizationsList && viewType === 'list' ? [{
                key: 'switch_organization',
                label: '切换组织',
                onClick: () => {
                    openSelectOrganizationModal(setNewOrganization);
                },
            }] : []),
            ...(!!organizationsList && viewType === 'menu' ? [{
                type: 'divider' as const,
            }, {
                key: '$personal',
                label: '个人工作区',
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
        title: `按 ${switchSettingsShortcut} 切换`,
        label: '设置',
    }, 30]);

    menuItems.push([{
        key: 'about',
        icon: <InfoCircleOutlined />,
        onClick: () => showAboutModal(),
        label: '关于',
    }, 40]);

    menuItems.push([{
        key: 'logout',
        icon: logoutFetching ? <LoadingOutlined /> : <LogoutOutlined />,
        onClick: () => history.push('/auth/logout'),
        label: '退出登录',
        disabled: logoutFetching,
    }, 50]);

    menuItems.push(...plugins
        .map(({ component, weight }): typeof menuItems[0] => [component({ targetProps: props }), weight]),
    );

    const getButtonClassName = (value: string, highlightable = true): string => {
        // eslint-disable-next-line security/detect-non-literal-regexp
        const regex = new RegExp(`${value}$`);
        const baseClass = `cvat-header-${value}-button cvat-header-button`;
        return highlightable && location.pathname.match(regex) ?
            `${baseClass} cvat-active-header-button` : baseClass;
    };

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
                    项目
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
                    任务
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
                    作业
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
                    云存储
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
                    请求
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
                        模型
                    </Button>
                ) : null}
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
                        分析
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

