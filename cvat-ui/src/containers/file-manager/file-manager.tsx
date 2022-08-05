// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { TreeNodeNormal } from 'antd/lib/tree/Tree';
import FileManagerComponent, { Files } from 'components/file-manager/file-manager';

import { loadShareDataAsync } from 'actions/share-actions';
import { ShareItem, CombinedState } from 'reducers/interfaces';

interface OwnProps {
    ref: any;
    isMultiTask: boolean
    onChangeActiveKey(key: string): void;
    onUploadLocalFiles(files: File[]): void;
    onUploadRemoteFiles(urls: string[]): void;
    onUploadShareFiles(paths: string[]): void;
}

interface StateToProps {
    treeData: (TreeNodeNormal & { contentType: string })[];
}

interface DispatchToProps {
    getTreeData(key: string, success: () => void, failure: () => void): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    function convert(items: ShareItem[], path?: string): (TreeNodeNormal & { contentType: string })[] {
        return items.map(
            (item): (TreeNodeNormal & { contentType: string }) => {
                const isLeaf = item.type !== 'DIR';
                const key = `${path}${item.name}${isLeaf ? '' : '/'}`;
                return {
                    key,
                    isLeaf,
                    title: item.name || 'root',
                    contentType: item.type === 'DIR' ? 'DIR' : 'video',
                    children: convert(item.children, key),
                };
            },
        );
    }

    const { root } = state.share;
    return {
        treeData: convert([root], ''),
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTreeData: (key: string, success: () => void, failure: () => void): void => {
            dispatch(loadShareDataAsync(key, success, failure));
        },
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;

export class FileManagerContainer extends React.PureComponent<Props> {
    private managerComponentRef: any;

    public constructor(props: Props) {
        super(props);

        this.managerComponentRef = React.createRef();
    }

    public getFiles(): Files {
        return this.managerComponentRef.getFiles();
    }

    public getCloudStorageId(): number | null {
        return this.managerComponentRef.getCloudStorageId();
    }

    public reset(): Files {
        return this.managerComponentRef.reset();
    }

    public render(): JSX.Element {
        const {
            treeData,
            getTreeData,
            isMultiTask,
            onChangeActiveKey,
            onUploadLocalFiles,
            onUploadRemoteFiles,
            onUploadShareFiles,
        } = this.props;

        return (
            <FileManagerComponent
                treeData={treeData}
                isMultiTask={isMultiTask}
                onLoadData={getTreeData}
                onUploadLocalFiles={onUploadLocalFiles}
                onUploadRemoteFiles={onUploadRemoteFiles}
                onUploadShareFiles={onUploadShareFiles}
                onChangeActiveKey={onChangeActiveKey}
                ref={(component): void => {
                    this.managerComponentRef = component;
                }}
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps, null, { forwardRef: true })(FileManagerContainer);
