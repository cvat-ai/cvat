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

export default function DumperItemComponent(props: DumperItemComponentProps): JSX.Element {
    const {
        taskInstance,
        dumpActivity,
    } = props;
    const { mode } = taskInstance;
    const { dumper } = props;
    const pending = !!dumpActivity;

    return (
        <Menu.Item className='cvat-actions-menu-dump-submenu-item' key={dumper.name}>
            <Button
                block
                type='link'
                disabled={pending}
                onClick={(): void => {
                    props.onDumpAnnotation(taskInstance, dumper);
                }}
            >
                <Icon type='download' />
                <Text strong={isDefaultFormat(dumper.name, mode)}>
                    {dumper.name}
                </Text>
                {pending && <Icon type='loading' />}
            </Button>
        </Menu.Item>
    );
}
