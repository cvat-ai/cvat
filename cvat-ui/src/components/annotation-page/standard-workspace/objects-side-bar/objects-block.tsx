import React from 'react';

import {
    Tabs,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import ObjectsList from './objects-list';
import LabelsList from './labels-list';

interface Props {
    annotations: any[];
    labels: any[];
    height: number;
    onAnnotationsUpdated(annotations: any[]): void;
}

export default function ObjectsBlockComponent(props: Props): JSX.Element {
    const {
        height,
        annotations,
        labels,
        onAnnotationsUpdated,
    } = props;

    const childProps = {
        annotations,
        labels,
        onAnnotationsUpdated,
    };

    return (
        <Tabs type='card' style={{ height }} defaultActiveKey='objects' className='cvat-objects-sidebar-tabs'>
            <Tabs.TabPane
                tab={<Text strong>Objects</Text>}
                key='objects'
            >
                <ObjectsList {...childProps} />
            </Tabs.TabPane>
            <Tabs.TabPane
                tab={<Text strong>Labels</Text>}
                key='labels'
            >
                <LabelsList {...childProps} />
            </Tabs.TabPane>
        </Tabs>
    );
}
