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
    colors: string[];
    listHeight: number;
    onAnnotationsUpdated(annotations: any[]): void;
    onChangeLabelColor(label: any, color: string): void;
}

export default function ObjectsBlockComponent(props: Props): JSX.Element {
    const {
        listHeight,
        annotations,
        labels,
        colors,
        onAnnotationsUpdated,
        onChangeLabelColor,
    } = props;

    const childProps = {
        annotations,
        labels,
        onAnnotationsUpdated,
    };

    return (
        <Tabs type='card' defaultActiveKey='labels' className='cvat-objects-sidebar-tabs'>
            <Tabs.TabPane
                tab={<Text strong>Objects</Text>}
                key='objects'
            >
                <ObjectsList listHeight={listHeight} {...childProps} />
            </Tabs.TabPane>
            <Tabs.TabPane
                tab={<Text strong>Labels</Text>}
                key='labels'
            >
                <LabelsList
                    listHeight={listHeight}
                    {...childProps}
                    colors={colors}
                    onChangeLabelColor={onChangeLabelColor}
                />
            </Tabs.TabPane>
        </Tabs>
    );
}
