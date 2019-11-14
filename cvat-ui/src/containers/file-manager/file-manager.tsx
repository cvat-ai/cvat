import React from 'react';
import { connect } from 'react-redux';

import { TreeNodeNormal } from 'antd/lib/tree/Tree'
import FileManagerComponent, { Files } from '../../components/file-manager/file-manager';

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
            const key = `${path}/${item.name}`.replace(/\/+/g, '/'); // // => /
            return {
                key,
                title: item.name,
                isLeaf: item.type !== 'DIR',
                children: convert(item.children, key),
            };
        });
    }

    const { root } = state.share;
    return {
        treeData: convert(root.children, root.name),
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getTreeData: (key: string, success: () => void, failure: () => void) => {
            dispatch(loadShareDataAsync(key, success, failure));
        }
    };
}

class FileManagerContainer extends React.PureComponent<StateToProps & DispatchToProps> {
    private managerComponentRef: any;

    public getFiles(): Files {
        return this.managerComponentRef.getFiles();
    }

    public reset(): Files {
        return this.managerComponentRef.reset();
    }

    public render() {
        return (
            <FileManagerComponent
                treeData={this.props.treeData}
                onLoadData={this.props.getTreeData}
                ref={(component) => this.managerComponentRef = component}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
    null,
    { forwardRef: true },
)(FileManagerContainer);
