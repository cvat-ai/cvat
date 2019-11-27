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

export default function DumperItemComponent(props: DumperItemComponentProps) {
    const task = props.taskInstance;
    const { exporter } = props;
    const pending = !!props.exportActivity;

    return (
        <Menu.Item className='cvat-actions-menu-export-submenu-item' key={exporter.name}>
            <Button block={true} type='link' disabled={pending}
                onClick={() => {
                    props.onExportDataset(task, exporter);
                }}>
                <Icon type='export'/>
                <Text strong={props.exporter.is_default}>
                    {exporter.name}
                </Text>
                {pending && <Icon type='loading'/>}
            </Button>
        </Menu.Item>
    );
}

