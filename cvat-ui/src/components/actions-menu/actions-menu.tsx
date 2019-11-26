import React from 'react';

import {
    Menu,
    Modal,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import { ClickParam } from 'antd/lib/menu/index';

import LoaderItemComponent from './loader-item';
import DumperItemComponent from './dumper-item';


interface ActionsMenuComponentProps {
    taskInstance: any;
    loaders: any[];
    dumpers: any[];
    loadActivity: string | null;
    dumpActivities: string[] | null;
    installedTFAnnotation: boolean;
    installedTFSegmentation: boolean;
    installedAutoAnnotation: boolean;
    onLoadAnnotation: (taskInstance: any, loader: any, file: File) => void;
    onDumpAnnotation: (taskInstance: any, dumper: any) => void;
    onDeleteTask: (taskInstance: any) => void;
    onOpenRunWindow: (taskInstance: any) => void;
}

interface MinActionsMenuProps {
    taskInstance: any;
    onDeleteTask: (task: any) => void;
    onOpenRunWindow: (taskInstance: any) => void;
}

export function handleMenuClick(props: MinActionsMenuProps, params: ClickParam) {
    const { taskInstance } = props;
    const tracker = taskInstance.bugTracker;

    if (params.keyPath.length !== 2) {
        switch (params.key) {
            case 'tracker': {
                window.open(`${tracker}`, '_blank')
                return;
            } case 'auto_annotation': {
                props.onOpenRunWindow(taskInstance);
                return;
            } case 'delete': {
                const taskID = taskInstance.id;
                Modal.confirm({
                    title: `The task ${taskID} will be deleted`,
                    content: 'All related data (images, annotations) will be lost. Continue?',
                    onOk: () => {
                        props.onDeleteTask(taskInstance);
                    },
                });
                return;
            } default: {
                return;
            }
        }
    }
}

export default function ActionsMenuComponent(props: ActionsMenuComponentProps) {
    const tracker = props.taskInstance.bugTracker;
    const renderModelRunner = props.installedAutoAnnotation ||
        props.installedTFAnnotation || props.installedTFSegmentation;
    return (
        <Menu selectable={false} className='cvat-actions-menu' onClick={
            (params: ClickParam) => handleMenuClick(props, params)
        }>
            <Menu.SubMenu key='dump' title={<
                Text>{'Dump annotations'}</Text>
            }>
                {
                    props.dumpers.map((dumper) => DumperItemComponent({
                        dumper,
                        taskInstance: props.taskInstance,
                        dumpActivities: props.dumpActivities,
                        onDumpAnnotation: props.onDumpAnnotation,
                }   ))}
            </Menu.SubMenu>
            <Menu.SubMenu key='load' title={
                <Text>{'Upload annotations'}</Text>
            }>
                {
                    props.loaders.map((loader) => LoaderItemComponent({
                        loader,
                        taskInstance: props.taskInstance,
                        loadActivity: props.loadActivity,
                        onLoadAnnotation: props.onLoadAnnotation,
                    }))
                }
            </Menu.SubMenu>
            {tracker && <Menu.Item key='tracker'>Open bug tracker</Menu.Item>}
            {renderModelRunner && <Menu.Item key='auto_annotation'>Automatic annotation</Menu.Item>}
            <hr/>
            <Menu.Item key='delete'>Delete</Menu.Item>
        </Menu>
    );
}
