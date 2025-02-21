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
    MailOutlined, FolderAddOutlined, FileAddOutlined,
} from '@ant-design/icons';
import Layout from 'antd/lib/layout';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';
import {
    Form, Input, Checkbox, Select,
} from 'antd';
import Text from 'antd/lib/typography/Text';
import notification from 'antd/lib/notification';

import config from 'config';

import { Organization, getCore } from 'cvat-core-wrapper';
import { CVATLogo } from 'icons';
import ChangePasswordDialog from 'components/change-password-modal/change-password-modal';
import CVATTooltip from 'components/common/cvat-tooltip';
import { switchSettingsModalVisible as switchSettingsModalVisibleAction } from 'actions/settings-actions';
import { logoutAsync, authActions } from 'actions/auth-actions';
import { shortcutsActions, registerComponentShortcuts } from 'actions/shortcuts-actions';
import { AboutState, CombinedState } from 'reducers';
import { useIsMounted, usePlugins } from 'utils/hooks';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import CustomIcon from '../../maxar/assets/maxar_icon_yellow.svg';
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
    // --------Begin Maxar custom plugin-------------------------
    const [form] = Form.useForm();

    // eslint-disable-next-line max-len
    const generateFusedURL = (values: Record<string, any>): `https://workbench.mxr-prod.fused.io/server/v1/realtime-shared/fsh_2HSFCw7zvK4PJRvfhFod2X/run/file?${string}` => {
        const baseURL = 'https://workbench.mxr-prod.fused.io/server/v1/realtime-shared/fsh_2HSFCw7zvK4PJRvfhFod2X/run/file';
        // Mapping form values to URL query params
        const params = new URLSearchParams({
            dtype_out_raster: 'png', // Assuming default output type
            dtype_out_vector: 'html',
            bucket_directory: values.bucket_directory || '',
            crs: values.crs.replace('EPSG:', ''), // Remove 'EPSG:' from CRS
            batch_size: values.batch_size.toString(),
            create_tasks: values.create_tasks.toString(),
            upload_annotations: values.upload_annotations.toString(),
            use_default_attributes: values.use_default_attributes.toString(),
            ignore_geo: values.ignore_geo.toString(),
            no_label_attributes: values.no_label_attributes.toString(),
            bucket_name: values.bucket_name || '',
            project_name: encodeURIComponent(values.project_name || ''),
            organization: encodeURIComponent(values.organization || ''),
            user_id: user.id,
            project_id: values.project_id || -1,
        });

        return `${baseURL}?${params.toString()}`;
    };

    const fetchFusedData = async (url: string): Promise<any> => {
        try {
            const response = await fetch(url, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/html');
            const table = doc.querySelector('.dataframe');
            if (table) {
                const headers = Array.from(table.querySelectorAll('thead th'))
                    .map((th) => th?.textContent?.trim() ?? '')
                    .filter((h) => h); // Remove empty headers (first column)
                const values = Array.from(table.querySelectorAll('tbody tr'))
                    .map((row) => Array.from(row.querySelectorAll('td'))
                        .map((td) => td?.textContent?.trim() ?? ''));
                const df = values.map((row) => Object.fromEntries(headers.map((key, i) => [key, row[i]])));

                if (df.length > 0 && df[0].status === '200') {
                    return df[0].msg;
                }
                throw new Error(`HTTP error! Status: ${df[0].msg}`);
            }
            return null;
        } catch (error) {
            console.error('Error fetching data:', error);
            return null;
        }
    };

    const showUploadToProjectModal = useCallback((): void => {
        Modal.info({
            title: 'Upload Chips to New Project',
            style: { padding: '16px' },
            closable: true,
            keyboard: true,
            content: (
                <Form
                    form={form}
                    layout='vertical'
                    initialValues={{
                        username: user.email,
                        bucket_name: 'mxr-as-prod-fused-shared',
                        bucket_directory: '',
                        crs: 'EPSG:4326',
                        project_name: '',
                        organization: '',
                        batch_size: '',
                        create_tasks: true,
                        upload_annotations: true,
                        use_default_attributes: true,
                        label_attributes: '',
                        ignore_geo: false,
                        no_label_attributes: false,
                    }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label='User'
                                name='username'
                            >
                                <Input disabled />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label='Bucket Name'
                                name='bucket_name'
                            >
                                <Input disabled />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label='Bucket Directory'
                        name='bucket_directory'
                        rules={[{ required: true, message: 'Please enter a bucket directory' }]}
                    >
                        <Input placeholder='Enter bucket directory' />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label='Project Name'
                                name='project_name'
                                rules={[{ required: true, message: 'Please enter a project name' }]}
                            >
                                <Input placeholder='Enter project name' />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label='Organization'
                                name='organization'
                                rules={[{ required: true, message: 'Please enter an organization name' }]}
                            >
                                <Input placeholder='Enter organization name' />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label='Coordinate Reference System (CRS)'
                                name='crs'
                                rules={[{ required: true, message: 'Please select a CRS' }]}
                            >
                                <Select
                                    placeholder='Select a CRS'
                                    options={[
                                        { value: 'EPSG:4326', label: 'WGS84 (EPSG:4326) - Global' },
                                        { value: 'EPSG:3857', label: 'Web Mercator (EPSG:3857) - Online Maps' },
                                        { value: 'EPSG:4269', label: 'NAD83 (EPSG:4269) - North America' },
                                        { value: 'EPSG:27700', label: 'OSGB36 (EPSG:27700) - Great Britain' },
                                        { value: 'EPSG:4258', label: 'ETRS89 (EPSG:4258) - Europe' },
                                        { value: 'EPSG:4283', label: 'GDA94 (EPSG:4283) - Australia' },
                                        { value: 'EPSG:7844', label: 'GDA2020 (EPSG:7844) - Australia (Updated)' },
                                        { value: 'EPSG:28992', label: 'Amersfoort (EPSG:28992) - Netherlands' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label='Batch Size'
                                name='batch_size'
                                rules={[{ required: true, message: 'Please enter a batch size' }]}
                            >
                                <Input placeholder='Enter batch size' />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name='create_tasks' valuePropName='checked'>
                                <Checkbox>Create Tasks</Checkbox>
                            </Form.Item>

                            <Form.Item name='upload_annotations' valuePropName='checked'>
                                <Checkbox>Upload Annotations</Checkbox>
                            </Form.Item>

                            <Form.Item name='use_default_attributes' valuePropName='checked'>
                                <Checkbox>Use Default Attributes</Checkbox>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name='ignore_geo' valuePropName='checked'>
                                <Checkbox>Ignore Geo</Checkbox>
                            </Form.Item>

                            <Form.Item name='no_label_attributes' valuePropName='checked'>
                                <Checkbox>No Label Attributes</Checkbox>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label='Label Attributes'
                        name='label_attributes'
                    >
                        <Input placeholder='Enter label attributes' />
                    </Form.Item>
                </Form>
            ),
            width: 800,
            okText: 'Submit',
            onOk: () => {
                form.validateFields()
                    .then(async (values) => {
                        const fusedURL = generateFusedURL(values);
                        const responseData = await fetchFusedData(fusedURL);
                        console.log('API Response:', responseData);
                        if (responseData) {
                            form.resetFields();
                            Modal.success({
                                title: 'Success',
                                content: 'Project created successfully',
                                onOk: () => {
                                    Modal.destroyAll(); // Close all modals (alert + form popup)
                                    window.location.reload();
                                },
                            });
                        } else {
                            Modal.error({
                                title: 'Project creation error',
                                content: 'The project was not created. Please contact ipr.support@maxar.com',
                                onOk: () => {
                                    Modal.destroyAll(); // Close all modals (alert + form popup)
                                },
                            });
                        }
                    })
                    .catch((error) => {
                        console.error('Validation Error:', error);
                    });
            },
        });
    }, [form]);

    const showUploadToExistingProjectModal = useCallback((): void => {
        Modal.info({
            title: 'Upload Chips to Existing Project',
            style: { padding: '16px' },
            closable: true,
            keyboard: true,
            content: (
                <Form
                    form={form}
                    layout='vertical'
                    initialValues={{
                        username: user.email,
                        bucket_name: 'mxr-as-prod-fused-shared',
                        bucket_directory: '',
                        crs: 'EPSG:4326',
                        project_name: '',
                        organization: '',
                        batch_size: '',
                        create_tasks: true,
                        upload_annotations: true,
                        use_default_attributes: true,
                        label_attributes: '',
                        ignore_geo: false,
                        no_label_attributes: false,
                    }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label='User'
                                name='username'
                            >
                                <Input disabled />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label='Bucket Name'
                                name='bucket_name'
                            >
                                <Input disabled />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label='Bucket Directory'
                        name='bucket_directory'
                        rules={[{ required: true, message: 'Please enter a bucket directory' }]}
                    >
                        <Input placeholder='Enter bucket directory' />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label='Project Id'
                                name='project_id'
                                rules={[{ required: true, message: 'Please enter project ID' }]}
                            >
                                <Input placeholder='Enter project id' />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label='Organization'
                                name='organization'
                                rules={[{ required: true, message: 'Please enter an organization name' }]}
                            >
                                <Input placeholder='Enter organization name' />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label='Coordinate Reference System (CRS)'
                                name='crs'
                                rules={[{ required: true, message: 'Please select a CRS' }]}
                            >
                                <Select
                                    placeholder='Select a CRS'
                                    options={[
                                        { value: 'EPSG:4326', label: 'WGS84 (EPSG:4326) - Global' },
                                        { value: 'EPSG:3857', label: 'Web Mercator (EPSG:3857) - Online Maps' },
                                        { value: 'EPSG:4269', label: 'NAD83 (EPSG:4269) - North America' },
                                        { value: 'EPSG:27700', label: 'OSGB36 (EPSG:27700) - Great Britain' },
                                        { value: 'EPSG:4258', label: 'ETRS89 (EPSG:4258) - Europe' },
                                        { value: 'EPSG:4283', label: 'GDA94 (EPSG:4283) - Australia' },
                                        { value: 'EPSG:7844', label: 'GDA2020 (EPSG:7844) - Australia (Updated)' },
                                        { value: 'EPSG:28992', label: 'Amersfoort (EPSG:28992) - Netherlands' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label='Batch Size'
                                name='batch_size'
                                rules={[{ required: true, message: 'Please enter a batch size' }]}
                            >
                                <Input placeholder='Enter batch size' />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name='create_tasks' valuePropName='checked'>
                                <Checkbox>Create Tasks</Checkbox>
                            </Form.Item>

                            <Form.Item name='upload_annotations' valuePropName='checked'>
                                <Checkbox>Upload Annotations</Checkbox>
                            </Form.Item>

                            <Form.Item name='use_default_attributes' valuePropName='checked'>
                                <Checkbox>Use Default Attributes</Checkbox>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name='ignore_geo' valuePropName='checked'>
                                <Checkbox>Ignore Geo</Checkbox>
                            </Form.Item>

                            <Form.Item name='no_label_attributes' valuePropName='checked'>
                                <Checkbox>No Label Attributes</Checkbox>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label='Label Attributes'
                        name='label_attributes'
                    >
                        <Input placeholder='Enter label attributes' />
                    </Form.Item>
                </Form>
            ),
            width: 800,
            okText: 'Submit',
            onOk: () => {
                form.validateFields()
                    .then(async (values) => {
                        const fusedURL = generateFusedURL(values);
                        const responseData = await fetchFusedData(fusedURL);
                        console.log('API Response:', responseData);
                        if (responseData) {
                            form.resetFields();
                            Modal.success({
                                title: 'Success',
                                content: 'Project created successfully',
                                onOk: () => {
                                    Modal.destroyAll(); // Close all modals (alert + form popup)
                                },
                            });
                        } else {
                            Modal.error({
                                title: 'Project creation error',
                                content: 'The project was not created. Please contact ipr.support@maxar.com',
                                onOk: () => {
                                    Modal.destroyAll(); // Close all modals (alert + form popup)
                                },
                            });
                        }
                    })
                    .catch((error) => {
                        console.error('Validation Error:', error);
                    });
            },
        });
    }, [form]);

    // --------End Maxar custom plugin-------------------------
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

    // Define the menu items with sorting priority
    const maxarMenuItems: [NonNullable<MenuProps['items']>[0], number][] = [];

    // Add Upload items (with sorting priority 30)
    maxarMenuItems.push(
        [{
            key: 'uploadChipped',
            icon: <FolderAddOutlined style={{ fontSize: '20px' }} />,
            onClick: () => showUploadToProjectModal(),
            label: 'Upload chips - new project + tasks',
        }, 30],
        [{
            key: 'uploadExisting',
            icon: <FileAddOutlined style={{ fontSize: '20px' }} />,
            onClick: () => showUploadToExistingProjectModal(),
            label: 'Upload chips -   existing project',
        }, 30],
    );

    // Convert to properly structured menu items
    const structMaxarMenuItems: MenuProps['items'] = [{
        key: 'upload-group',
        type: 'group', // Creates the "Upload" header
        label: 'Upload',
        children: [
            {
                type: 'divider',
            },
            ...maxarMenuItems
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .filter(([item, _]) => item && String(item.key).startsWith('upload')) // Ensure item is defined
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .map(([item, _]) => item!), // Access items only if they exist
        ],
    }];

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
                <Dropdown
                    trigger={['click']}
                    destroyPopupOnHide
                    placement='bottom'
                    overlayClassName='cvat-header-menu-maxar-tools-dropdown'// Apply custom width only here
                    menu={{ items: structMaxarMenuItems }}
                    className='cvat-header-menu-maxar-tools-dropdown'
                >
                    <span>
                        <CustomIcon className='cvat-header-dropdown-maxar-icon' style={{ width: '15px', height: '15px', fill: 'gray' }} />
                        <Row>
                            <Col span={24}>
                                <Text strong className='cvat-header-maxar-menu-dropdown'>
                                    Maxar Tools
                                </Text>
                            </Col>
                        </Row>
                        <CaretDownOutlined className='cvat-header-dropdown-icon' />
                    </span>
                </Dropdown>
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
                            {currentOrganization ? (
                                <Col span={24}>
                                    <Text className='cvat-header-menu-user-dropdown-organization'>
                                        {currentOrganization.slug}
                                    </Text>
                                </Col>
                            ) : null}
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
