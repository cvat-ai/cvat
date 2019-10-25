import React from 'react';

import {
    Icon,
    Tooltip,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface ConstructorViewerItemProps {
    label: any;
    color: string;
    onUpdate: (label: any) => void;
    onDelete: (label: any) => void;
}

export default function ConstructorViewerItem(props: ConstructorViewerItemProps) {
    return (
        <div style={{background: props.color}} className='cvat-constructor-viewer-item'>
            <Text> { props.label.name } </Text>
            <Tooltip title='Update attributes'>
                <span onClick={() => props.onUpdate(props.label)}>
                    <Icon theme='filled' type='edit'/>
                </span>
            </Tooltip>
            { Number.isInteger(props.label.id) ? null :
                <Tooltip title='Delete label'>
                    <span onClick={() => props.onDelete(props.label)}>
                        <Icon type='close'></Icon>
                    </span>
                </Tooltip>
            }
        </div>
    );
}
