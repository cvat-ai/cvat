import React from 'react';

import {
    Tabs,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import ObjectsList from './objects-list';
import LabelsList from './labels-list';

interface Props {

}

export default function AppearanceSettingsComponent(props: Props): JSX.Element {
    return (
        <Tabs type='card' defaultActiveKey='objects' className='cvat-objects-side-bar-tabs'>
            <Tabs.TabPane
                className='t1'
                tab={<Text strong>Objects</Text>}
                key='objects'
            >
                <ObjectsList {...props} />
            </Tabs.TabPane>
            <Tabs.TabPane
                tab={<Text strong>Labels</Text>}
                key='labels'
            >
                <LabelsList {...props} />
            </Tabs.TabPane>
        </Tabs>
    );
}
