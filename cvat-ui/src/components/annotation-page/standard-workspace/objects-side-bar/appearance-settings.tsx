import React from 'react';

import {
    Collapse,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface Props {

}

export default function AppearanceSettingsComponent(props: Props): JSX.Element {
    return (
        <Collapse defaultActiveKey={['appearance']} className='cvat-objects-appearance-collapse'>
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
