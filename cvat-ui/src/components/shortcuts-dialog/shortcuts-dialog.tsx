import React from 'react';
import { getApplicationKeyMap } from 'react-hotkeys';
import { Modal, Table } from 'antd';
import { connect } from 'react-redux';

import { shortcutsActions } from 'actions/shortcuts-actions';
import { CombinedState } from 'reducers/interfaces';

interface StateToProps {
    visible: boolean;
}

interface DispatchToProps {
    switchShortcutsDialog(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        shortcuts: {
            visibleShortcutsHelp: visible,
        },
    } = state;

    return {
        visible,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        switchShortcutsDialog(): void {
            dispatch(shortcutsActions.switchShortcutsDialog());
        },
    };
}

function ShorcutsDialog(props: StateToProps & DispatchToProps): JSX.Element | null {
    const { visible, switchShortcutsDialog } = props;
    const keyMap = getApplicationKeyMap();

    const splitToRows = (data: string[]): JSX.Element[] => (
        data.map((item: string, id: number): JSX.Element => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={id}>
                {item}
                <br />
            </span>
        ))
    );

    const columns = [{
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
    }, {
        title: 'Shortcut',
        dataIndex: 'shortcut',
        key: 'shortcut',
        render: splitToRows,
    }, {
        title: 'Action',
        dataIndex: 'action',
        key: 'action',
        render: splitToRows,
    }, {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
    }];

    const dataSource = Object.keys(keyMap).map((key: string, id: number) => ({
        key: id,
        name: keyMap[key].name || key,
        description: keyMap[key].description || '',
        shortcut: keyMap[key].sequences.map((value) => value.sequence),
        action: keyMap[key].sequences.map((value) => value.action || 'keydown'),
    }));

    return (
        <Modal
            title='Active list of shortcuts'
            visible={visible}
            closable={false}
            width={800}
            onOk={switchShortcutsDialog}
            cancelButtonProps={{ style: { display: 'none' } }}
            zIndex={1001} /* default antd is 1000 */
        >
            <Table dataSource={dataSource} columns={columns} size='small' />
        </Modal>
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ShorcutsDialog);
