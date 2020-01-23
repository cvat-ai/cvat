import React from 'react';

import {
    Col,
    Icon,
    Select,
} from 'antd';

import {
    InfoIcon,
    FullscreenIcon,
} from '../../../icons';

const RightGroup = React.memo((): JSX.Element => (
    <Col className='cvat-annotation-header-right-group'>
        <div className='cvat-annotation-header-button'>
            <Icon component={FullscreenIcon} />
            <span>Fullscreen</span>
        </div>
        <div className='cvat-annotation-header-button'>
            <Icon component={InfoIcon} />
            <span>Info</span>
        </div>
        <div>
            <Select className='cvat-workspace-selector' defaultValue='standard'>
                <Select.Option key='standard' value='standard'>Standard</Select.Option>
                <Select.Option key='aam' value='aam'>Attribute annotation</Select.Option>
            </Select>
        </div>
    </Col>
));

export default RightGroup;
