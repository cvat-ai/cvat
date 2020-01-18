import React from 'react';

import {
    Tabs,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import ObjectsList from './objects-list';
import LabelsList from './labels-list';

interface Props {
    annotations: any[];
    height: number;
    onAnnotationsUpdated(annotations: any[]): void;
}

export default function ObjectsBlockComponent(props: Props): JSX.Element {
    const { height } = props;
    return (
        <Tabs type='card' style={{ height }} defaultActiveKey='objects' className='cvat-objects-sidebar-tabs'>
            <Tabs.TabPane
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
