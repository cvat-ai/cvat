import React from 'react';

import {
    Col,
    Icon,
    Select,
    Button,
} from 'antd';

import {
    InfoIcon,
    FullscreenIcon,
} from '../../../icons';

function RightGroup(): JSX.Element {
    return (
        <Col className='cvat-annotation-header-right-group'>
            <Button type='link' className='cvat-annotation-header-button'>
                <Icon component={FullscreenIcon} />
                Fullscreen
            </Button>
            <Button type='link' className='cvat-annotation-header-button'>
                <Icon component={InfoIcon} />
                Info
            </Button>
            <div>
                <Select className='cvat-workspace-selector' defaultValue='standard'>
                    <Select.Option key='standard' value='standard'>Standard</Select.Option>
                    <Select.Option key='aam' value='aam'>Attribute annotation</Select.Option>
                </Select>
            </div>
        </Col>
    );
}

export default React.memo(RightGroup);
