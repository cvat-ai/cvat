import React from 'react';

import {
    Menu,
    Button,
    Icon,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface DumperItemComponentProps {
    taskInstance: any;
    exporter: any;
    exportActivity: string | null;
    onExportDataset: (task: any, exporter: any) => void;
}

export default function DumperItemComponent(props: DumperItemComponentProps): JSX.Element {
    const {
        taskInstance,
        exporter,
        exportActivity,
    } = props;

    const pending = !!exportActivity;

    return (
        <Menu.Item className='cvat-actions-menu-export-submenu-item' key={exporter.name}>
            <Button
                block
                type='link'
                disabled={pending}
                onClick={(): void => {
                    props.onExportDataset(taskInstance, exporter);
                }}
            >
                <Icon type='export' />
                <Text strong={exporter.is_default}>
                    {exporter.name}
                </Text>
                {pending && <Icon type='loading' />}
            </Button>
        </Menu.Item>
    );
}
