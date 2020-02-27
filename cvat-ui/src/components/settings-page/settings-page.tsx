// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import {
    Row,
    Col,
    Tabs,
    Icon,
    Button,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import { RouteComponentProps } from 'react-router';

import WorkspaceSettingsContainer from 'containers/settings-page/workspace-settings';
import PlayerSettingsContainer from 'containers/settings-page/player-settings';

function SettingsPage(props: RouteComponentProps): JSX.Element {
    return (
        <div className='cvat-settings-page'>
            <Row type='flex' justify='center'>
                <Col>
                    <Text className='cvat-title'> Settings </Text>
                </Col>
            </Row>
            <Row type='flex' justify='center'>
                <Col md={14} lg={12} xl={10} xxl={9}>
                    <Tabs
                        type='card'
                        tabBarStyle={{ marginBottom: '0px', marginLeft: '-1px' }}
                    >
                        <Tabs.TabPane
                            tab={
                                (
                                    <span>
                                        <Icon type='play-circle' />
                                        <Text>Player</Text>
                                    </span>
                                )
                            }
                            key='player'
                        >
                            <PlayerSettingsContainer />
                        </Tabs.TabPane>
                        <Tabs.TabPane
                            tab={
                                (
                                    <span>
                                        <Icon type='laptop' />
                                        <Text>Workspace</Text>
                                    </span>
                                )
                            }
                            key='workspace'
                        >
                            <WorkspaceSettingsContainer />
                        </Tabs.TabPane>
                    </Tabs>
                </Col>
            </Row>
            <Row type='flex' justify='center'>
                <Col md={14} lg={12} xl={10} xxl={9} className='cvat-settings-page-back-button-wrapper'>
                    <Button
                        className='cvat-settings-page-back-button'
                        type='primary'
                        onClick={(): void => {
                            props.history.goBack();
                        }}
                    >
                        Go Back
                    </Button>
                </Col>
            </Row>
        </div>
    );
}

export default SettingsPage;
