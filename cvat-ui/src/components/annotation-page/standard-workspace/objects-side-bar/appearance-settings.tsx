import React from 'react';

import {
    Collapse,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface Props {
    collapsed: boolean;
    onCollapse(key: string | string[]): void;
}

export default function AppearanceSettingsComponent(props: Props): JSX.Element {
    const {
        collapsed,
        onCollapse,
    } = props;

    return (
        <Collapse
            onChange={onCollapse}
            activeKey={collapsed ? [] : ['appearance']}
            className='cvat-objects-appearance-collapse'
        >
            <Collapse.Panel
                header={
                    <Text strong>Appearance</Text>
                }
                key='appearance'
            >

            </Collapse.Panel>
        </Collapse>
    );
}
