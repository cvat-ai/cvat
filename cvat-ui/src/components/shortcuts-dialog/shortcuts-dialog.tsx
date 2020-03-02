import React from 'react';
import { getApplicationKeyMap } from 'react-hotkeys';
import { Modal, Table } from 'antd';
import { connect } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';

interface StateToProps {
    visible: boolean;
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

function ShorcutsDialog(props: StateToProps): JSX.Element | null {
    const { visible } = props;
    const keyMap = getApplicationKeyMap();

    const columns = [{
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
    }, {
        title: 'Shorcut',
        dataIndex: 'shortcut',
        key: 'shortcut',
    }, {
        title: 'Action',
        dataIndex: 'action',
        key: 'action',
    }, {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
    }];

    const dataSource = Object.keys(keyMap).map((key: string, id: number) => ({
        key: id,
        name: keyMap[key].name || key,
        description: keyMap[key].description || '',
        shortcut: keyMap[key].sequences.map((value) => value.sequence)
            .join('\n'),
        action: keyMap[key].sequences.map((value) => value.action || 'keydown')
            .join('\n'),
    }));

    return (
        <Modal
            title='Active list of shortcuts'
            visible={visible}
            closable={false}
            width={800}
            okButtonProps={{ style: { display: 'none' } }}
            cancelButtonProps={{ style: { display: 'none' } }}
        >
            <Table dataSource={dataSource} columns={columns} size='small' />
        </Modal>
    );
}

export default connect(
    mapStateToProps,
)(ShorcutsDialog);
