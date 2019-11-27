import React from 'react';

import {
    Menu,
    Button,
    Icon,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface DumperItemComponentProps {
    taskInstance: any;
    dumper: any;
    dumpActivity: string | null;
    onDumpAnnotation: (task: any, dumper: any) => void;
}

function isDefaultFormat(dumperName: string, taskMode: string): boolean {
    return (dumperName === 'CVAT XML 1.1 for videos' && taskMode === 'interpolation')
    || (dumperName === 'CVAT XML 1.1 for images' && taskMode === 'annotation');
}

export default function DumperItemComponent(props: DumperItemComponentProps) {
    const task = props.taskInstance;
    const { mode } = task;
    const { dumper } = props;
    const pending = !!props.dumpActivity;

    return (
        <Menu.Item className='cvat-actions-menu-dump-submenu-item' key={dumper.name}>
            <Button block={true} type='link' disabled={pending}
                onClick={() => {
                    props.onDumpAnnotation(task, dumper);
                }}>
                <Icon type='download'/>
                <Text strong={isDefaultFormat(dumper.name, mode)}>
                    {dumper.name}
                </Text>
                {pending && <Icon type='loading'/>}
            </Button>
        </Menu.Item>
    );
}

