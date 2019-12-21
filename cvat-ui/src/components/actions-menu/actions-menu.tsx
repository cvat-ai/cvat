import './styles.scss';
import React from 'react';

import {
    Menu,
    Modal,
} from 'antd';

import { ClickParam } from 'antd/lib/menu/index';

import LoaderItemComponent from './loader-item';
import DumperItemComponent from './dumper-item';
import ExportItemComponent from './export-item';

interface ActionsMenuComponentProps {
    taskInstance: any;
    loaders: any[];
    dumpers: any[];
    exporters: any[];
    loadActivity: string | null;
    dumpActivities: string[] | null;
    exportActivities: string[] | null;
    installedTFAnnotation: boolean;
    installedTFSegmentation: boolean;
    installedAutoAnnotation: boolean;
    inferenceIsActive: boolean;
    onLoadAnnotation: (taskInstance: any, loader: any, file: File) => void;
    onDumpAnnotation: (taskInstance: any, dumper: any) => void;
    onExportDataset: (taskInstance: any, exporter: any) => void;
    onDeleteTask: (taskInstance: any) => void;
    onOpenRunWindow: (taskInstance: any) => void;
}

interface MinActionsMenuProps {
    taskInstance: any;
    onDeleteTask: (task: any) => void;
    onOpenRunWindow: (taskInstance: any) => void;
}

export function handleMenuClick(props: MinActionsMenuProps, params: ClickParam): void {
    const { taskInstance } = props;
    const tracker = taskInstance.bugTracker;

    if (params.keyPath.length !== 2) {
        switch (params.key) {
            case 'tracker': {
                // false positive eslint(security/detect-non-literal-fs-filename)
                // eslint-disable-next-line
                window.open(`${tracker}`, '_blank');
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
                break;
            } default: {
                // do nothing
            }
        }
    }
}

export default function ActionsMenuComponent(props: ActionsMenuComponentProps): JSX.Element {
    const {
        taskInstance,
        installedAutoAnnotation,
        installedTFAnnotation,
        installedTFSegmentation,
        dumpers,
        loaders,
        exporters,
        inferenceIsActive,
    } = props;
    const tracker = taskInstance.bugTracker;
    const renderModelRunner = installedAutoAnnotation
        || installedTFAnnotation || installedTFSegmentation;

    return (
        <Menu
            selectable={false}
            className='cvat-actions-menu'
            onClick={
                (params: ClickParam): void => handleMenuClick(props, params)
            }
        >
            <Menu.SubMenu key='dump' title='Dump annotations'>
                {
                    dumpers.map((dumper): JSX.Element => DumperItemComponent({
                        dumper,
                        taskInstance: props.taskInstance,
                        dumpActivity: (props.dumpActivities || [])
                            .filter((_dumper: string) => _dumper === dumper.name)[0] || null,
                        onDumpAnnotation: props.onDumpAnnotation,
                    }))
                }
            </Menu.SubMenu>
            <Menu.SubMenu key='load' title='Upload annotations'>
                {
                    loaders.map((loader): JSX.Element => LoaderItemComponent({
                        loader,
                        taskInstance: props.taskInstance,
                        loadActivity: props.loadActivity,
                        onLoadAnnotation: props.onLoadAnnotation,
                    }))
                }
            </Menu.SubMenu>
            <Menu.SubMenu key='export' title='Export as a dataset'>
                {
                    exporters.map((exporter): JSX.Element => ExportItemComponent({
                        exporter,
                        taskInstance: props.taskInstance,
                        exportActivity: (props.exportActivities || [])
                            .filter((_exporter: string) => _exporter === exporter.name)[0] || null,
                        onExportDataset: props.onExportDataset,
                    }))
                }
            </Menu.SubMenu>
            {tracker && <Menu.Item key='tracker'>Open bug tracker</Menu.Item>}
            {
                renderModelRunner
                    && (
                        <Menu.Item
                            disabled={inferenceIsActive}
                            key='auto_annotation'
                        >
                            Automatic annotation
                        </Menu.Item>
                    )
            }
            <hr />
            <Menu.Item key='delete'>Delete</Menu.Item>
        </Menu>
    );
}
