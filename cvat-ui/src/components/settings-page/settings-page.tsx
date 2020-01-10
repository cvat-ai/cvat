import './styles.scss';
import React from 'react';
import {
    Row,
    Col,
    Tabs,
    Icon,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import WorkspaceSettingsContainer from '../../containers/settings-page/workspace-settings';
import PlayerSettingsContainer from '../../containers/settings-page/player-settings';

export default function SettingsPage(): JSX.Element {
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
                        defaultActiveKey='player'
                    >
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
                    </Tabs>
                </Col>
            </Row>
        </div>

    );
}
