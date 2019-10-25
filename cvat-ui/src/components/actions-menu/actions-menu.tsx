import React from 'react';

import {
    Menu,
    Modal,
} from 'antd';

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
    installedAutoAnnotation: boolean;
    onLoadAnnotation: (taskInstance: any, loader: any, file: File) => void;
    onDumpAnnotation: (task: any, dumper: any) => void;
    onDeleteTask: (task: any) => void;
}

interface MinActionsMenuProps {
    taskInstance: any;
    onDeleteTask: (task: any) => void;
}

export function handleMenuClick(props: MinActionsMenuProps, params: ClickParam) {
    const { taskInstance } = props;
    const tracker = taskInstance.bugTracker;

    if (params.keyPath.length !== 2) {
        switch (params.key) {
            case 'tracker': {
                window.open(`${tracker}`, '_blank')
                return;
            } case 'auto': {

                return;
            } case 'tf': {

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

    return (
        <Menu subMenuCloseDelay={0.15} className='cvat-task-item-menu' onClick={
            (params: ClickParam) => handleMenuClick(props, params)
        }>
            <Menu.SubMenu key='dump' title='Dump annotations'>
                {
                    props.dumpers.map((dumper) => DumperItemComponent({
                        dumper,
                        taskInstance: props.taskInstance,
                        dumpActivities: props.dumpActivities,
                        onDumpAnnotation: props.onDumpAnnotation,
                }   ))}
            </Menu.SubMenu>
            <Menu.SubMenu key='load' title='Upload annotations'>
                {
                    props.loaders.map((loader) => LoaderItemComponent({
                        loader,
                        taskInstance: props.taskInstance,
                        loadActivity: props.loadActivity,
                        onLoadAnnotation: props.onLoadAnnotation,
                    }))
                }
            </Menu.SubMenu>
            {tracker ? <Menu.Item key='tracker'>Open bug tracker</Menu.Item> : null}
            { props.installedTFAnnotation ?
                <Menu.Item key='tf'>Run TF annotation</Menu.Item> : null
            }
            { props.installedAutoAnnotation ?
                <Menu.Item key='auto'>Run auto annotation</Menu.Item> : null
            }
            <hr/>
            <Menu.Item key='delete'>Delete</Menu.Item>
        </Menu>
    );
}
