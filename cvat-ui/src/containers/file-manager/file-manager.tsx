import React from 'react';
import { connect } from 'react-redux';

import { TreeNodeNormal } from 'antd/lib/tree/Tree'
import FileManagerComponent from '../../components/file-manager/file-manager';

import { loadShareDataAsync } from '../../actions/share-actions';
import { ShareItem } from '../../reducers/interfaces';
import { CombinedState } from '../../reducers/root-reducer';

interface StateToProps {
    treeData: TreeNodeNormal[];
}

interface DispatchToProps {
    getTreeData(key: string, success: () => void, failure: () => void): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    function convert(items: ShareItem[], path?: string): TreeNodeNormal[] {
        return items.map((item): TreeNodeNormal => {
            const key = path === '/' ? `${path}${item.name}` : `${path}/${item.name}`;
            if (item.type === 'DIR' && item.children) {
                return {
                    key,
                    title: item.name,
                    isLeaf: false,
                    children: convert(item.children, key),
                };
            } else {
                return {
                    key,
                    title: item.name,
                    isLeaf: true,
                };
            }
        });
    }

    return {
        treeData: convert(state.share.tree.children, '/'),
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTreeData: (key: string, success: () => void, failure: () => void) => {
            dispatch(loadShareDataAsync(key, success, failure));
        }
    };
}

function FileManagerContainer(props: StateToProps & DispatchToProps) {
    return (
        <FileManagerComponent treeData={props.treeData} onLoadData={props.getTreeData}/>
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(FileManagerContainer);
