// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
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
    onUploadCloudStorageFiles(urls: string[]): void;
}

interface StateToProps {
    treeData: ShareItem;
    sharedStorageInitialized: boolean;
    sharedStorageFetching: boolean;
}

interface DispatchToProps {
    getTreeData(key: string): Promise<ShareFileInfo[]>;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        treeData: state.share.root,
        sharedStorageInitialized: state.share.initialized,
        sharedStorageFetching: state.share.fetching,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTreeData: (key: string):
        Promise<ShareFileInfo[]> => dispatch(loadShareDataAsync(key)),
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;

interface State {
    treeData: (TreeNodeNormal & {
        mime_type: string;
    })[];
    prevRoot: ShareItem | null;
}

export class FileManagerContainer extends React.PureComponent<Props, State> {
    private managerComponentRef: any;

    public constructor(props: Props) {
        super(props);

        this.state = {
            treeData: [],
            prevRoot: null,
        };

        this.managerComponentRef = React.createRef();
    }

    static getDerivedStateFromProps(props: Props, state: State): State | null {
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

        if (state.prevRoot !== props.treeData) {
            return {
                prevRoot: props.treeData,
                treeData: convert([props.treeData], ''),
            };
        }

        return null;
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
            const { treeData } = this.state;
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
                        ...itemTreeData,
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
            sharedStorageInitialized,
            sharedStorageFetching,
            getTreeData,
            many,
            onChangeActiveKey,
            onUploadLocalFiles,
            onUploadRemoteFiles,
            onUploadCloudStorageFiles,
        } = this.props;
        const { treeData } = this.state;

        return (
            <FileManagerComponent
                treeData={treeData}
                sharedStorageInitialized={sharedStorageInitialized}
                sharedStorageFetching={sharedStorageFetching}
                many={many}
                onLoadData={getTreeData}
                onUploadLocalFiles={onUploadLocalFiles}
                onUploadRemoteFiles={onUploadRemoteFiles}
                onUploadShareFiles={this.handleUploadShareFiles}
                onUploadCloudStorageFiles={onUploadCloudStorageFiles}
                onChangeActiveKey={onChangeActiveKey}
                ref={(component): void => {
                    this.managerComponentRef = component;
                }}
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps, null, { forwardRef: true })(FileManagerContainer);
