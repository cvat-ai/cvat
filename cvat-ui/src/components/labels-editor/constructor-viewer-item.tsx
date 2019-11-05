import React from 'react';

import {
    Icon,
    Tooltip,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import { Label } from './common';

interface ConstructorViewerItemProps {
    label: Label;
    color: string;
    onUpdate: (label: Label) => void;
    onDelete: (label: Label) => void;
}

export default function ConstructorViewerItem(props: ConstructorViewerItemProps) {
    return (
        <div style={{background: props.color}} className='cvat-constructor-viewer-item'>
            <Text>{ props.label.name }</Text>
            <Tooltip title='Update attributes'>
                <span onClick={() => props.onUpdate(props.label)}>
                    <Icon theme='filled' type='edit'/>
                </span>
            </Tooltip>
            { props.label.id >= 0 ? null :
                <Tooltip title='Delete label'>
                    <span onClick={() => props.onDelete(props.label)}>
                        <Icon type='close'></Icon>
                    </span>
                </Tooltip>
            }
        </div>
    );
}
