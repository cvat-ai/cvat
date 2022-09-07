// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { uniqBy } from 'lodash';

import { TreeNodeNormal } from 'antd/lib/tree/Tree';
import FileManagerComponent, { Files } from 'components/file-manager/file-manager';

import { loadShareDataAsync } from 'actions/share-actions';
import { ShareItem, CombinedState, ShareFileInfo } from 'reducers';

interface OwnProps {
    ref: any;
    many: boolean
    onChangeActiveKey(key: string): void;
    onUploadLocalFiles(files: File[]): void;
    onUploadRemoteFiles(urls: string[]): void;
    onUploadShareFiles(shareFiles: {
        key: string;
        type: string;
        mime_type: string;
    }[]): void;
}

interface StateToProps {
    treeData: (TreeNodeNormal & { mime_type: string })[];
}

interface DispatchToProps {
    getTreeData(key: string): Promise<ShareFileInfo[]>;
}

function mapStateToProps(state: CombinedState): StateToProps {
    function convert(items: ShareItem[], path?: string): (TreeNodeNormal & { mime_type: string })[] {
        return items.map(
            (item): (TreeNodeNormal & { mime_type: string }) => {
                const isLeaf = item.type !== 'DIR';
                const key = `${path}${item.name}${isLeaf ? '' : '/'}`;
                return {
                    key,
                    isLeaf,
                    title: item.name || 'root',
                    mime_type: item.mime_type,
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
        getTreeData: (key: string):
        Promise<ShareFileInfo[]> => dispatch(loadShareDataAsync(key)),
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;

export class FileManagerContainer extends React.PureComponent<Props> {
    private managerComponentRef: any;

    public constructor(props: Props) {
        super(props);

        this.managerComponentRef = React.createRef();
    }

    private handleUploadShareFiles = (keys: string[]): Promise<void> => new Promise(() => {
        const { onUploadShareFiles, getTreeData } = this.props;
        const getItemTreeDataByPath = (data: any, partsPath: string[]): any => {
            if (partsPath.length === 1) return data.children.find((child: any) => child.title === partsPath[0]);
            return getItemTreeDataByPath(
                data.children.find((child: any) => child.title === partsPath[0]),
                [...partsPath].filter((it, index) => index !== 0),
            );
        };

        const getShareFiles = async (localKeys: string[]): Promise<{
            key: string;
            type: string;
            mime_type: string;
        }[]> => {
            const { treeData } = this.props;
            let files: {
                key: string;
                type: string;
                mime_type: string;
            }[] = [];
            for await (const key of localKeys) {
                const partsPath = key.split('/').filter(Boolean);

                const itemTreeData = partsPath.length ? getItemTreeDataByPath(treeData[0], partsPath) : treeData[0];
                if (itemTreeData.isLeaf) {
                    files = [...files, {
                        key,
                        type: itemTreeData.type,
                        mime_type: itemTreeData.mime_type,
                    }];
                } else {
                    const children: {
                        key: string;
                        type: string;
                        mime_type: string;
                    }[] = await getTreeData(key)
                        .then((items) => items.map(
                            (item): string => {
                                const isLeaf = item.type !== 'DIR';
                                return `${key}${item.name}${isLeaf ? '' : '/'}`;
                            },
                        ))
                        .then(getShareFiles);
                    files = [...files, ...children];
                }
            }
            return files;
        };

        getShareFiles(keys).then((data) => {
            onUploadShareFiles(uniqBy(data, 'key'));
        });
    });

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
            many,
            onChangeActiveKey,
            onUploadLocalFiles,
            onUploadRemoteFiles,
        } = this.props;

        return (
            <FileManagerComponent
                treeData={treeData}
                many={many}
                onLoadData={getTreeData}
                onUploadLocalFiles={onUploadLocalFiles}
                onUploadRemoteFiles={onUploadRemoteFiles}
                onUploadShareFiles={this.handleUploadShareFiles}
                onChangeActiveKey={onChangeActiveKey}
                ref={(component): void => {
                    this.managerComponentRef = component;
                }}
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps, null, { forwardRef: true })(FileManagerContainer);
