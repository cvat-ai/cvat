// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { TreeNodeNormal } from 'antd/lib/tree/Tree';
import FileManagerComponent, { Files } from 'components/file-manager/file-manager';

import { loadShareDataAsync } from 'actions/share-actions';
import { ShareItem, CombinedState, TasksQuery, Task } from 'reducers/interfaces';
import { getTasksAsync } from 'actions/tasks-actions';

interface OwnProps {
    ref: any;
    withRemote: boolean;
}

interface StateToProps {
    treeData: TreeNodeNormal[];
    // for "getTasks"
    tasks: Task[];
    fetching: boolean;
    updating: boolean;
    currentTasksIndexes: number[];
}

interface DispatchToProps {
    getTreeData(key: string, success: () => void, failure: () => void): void;
    getTasks: (query: TasksQuery) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    function convert(items: ShareItem[], path?: string): TreeNodeNormal[] {
        return items.map(
            (item): TreeNodeNormal => {
                const isLeaf = item.type !== 'DIR';
                const key = `${path}${item.name}${isLeaf ? '' : '/'}`;
                return {
                    key,
                    isLeaf,
                    title: item.name || 'root',
                    children: convert(item.children, key),
                };
            },
        );
    }

    const { root } = state.share;

    const { fetching, updating, current } = state.tasks;

    return {
        treeData: convert([root], ''),

        tasks: current,
        fetching,
        updating,
        currentTasksIndexes: current.map((task): number => task.instance.id),
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTreeData: (key: string, success: () => void, failure: () => void): void => {
            dispatch(loadShareDataAsync(key, success, failure));
        },
        getTasks: (query: TasksQuery): void => {
            dispatch(getTasksAsync(query));
        },
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;

export class FileManagerContainer extends React.PureComponent<Props> {
    private managerComponentRef: any;

    public getFiles(): Files {
        return this.managerComponentRef.getFiles();
    }

    public reset(): Files {
        return this.managerComponentRef.reset();
    }

    public render(): JSX.Element {
        const { treeData, getTreeData, withRemote, tasks, fetching, updating, getTasks, currentTasksIndexes } = this.props;

        return (
            <FileManagerComponent
                treeData={treeData}
                onLoadData={getTreeData}
                withRemote={withRemote}
                ref={(component): void => {
                    this.managerComponentRef = component;
                }}

                tasks={tasks}
                fetching={fetching}
                updating={updating}
                getTasks={getTasks}
                currentTasksIndexes={currentTasksIndexes}
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps, null, { forwardRef: true })(FileManagerContainer);
