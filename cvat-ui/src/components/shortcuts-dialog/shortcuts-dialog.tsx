// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import Modal from 'antd/lib/modal';
import Table from 'antd/lib/table';
import React from 'react';
import { connect } from 'react-redux';
import { getApplicationKeyMap } from 'utils/mousetrap-react';
import { shortcutsActions } from 'actions/shortcuts-actions';
import { CombinedState } from 'reducers';

interface StateToProps {
    visible: boolean;
    jobInstance: any;
}

interface DispatchToProps {
    switchShortcutsModalVisible(visible: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        shortcuts: { visibleShortcutsHelp: visible },
        annotation: {
            job: { instance: jobInstance },
        },
    } = state;

    return { visible, jobInstance };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        switchShortcutsModalVisible(visible: boolean): void {
            dispatch(shortcutsActions.switchShortcutsModalVisible(visible));
        },
    };
}

function ShortcutsDialog(props: StateToProps & DispatchToProps): JSX.Element | null {
    const { visible, switchShortcutsModalVisible } = props;
    const keyMap = getApplicationKeyMap();

    const splitToRows = (data: string[]): JSX.Element[] => data.map(
        (item: string, id: number): JSX.Element => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={id}>
                {item}
                <br />
            </span>
        ),
    );

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Shortcut',
            dataIndex: 'shortcut',
            key: 'shortcut',
            render: splitToRows,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
        },
    ];

    const dataSource = Object.keys(keyMap)
        .filter((key: string) => (!keyMap[key].nonActive))
        .map((key: string, id: number) => ({
            key: id,
            name: keyMap[key].name || key,
            description: keyMap[key].description || '',
            shortcut: keyMap[key].sequences,
        }));

    return (
        <Modal
            title='Active list of shortcuts'
            open={visible}
            closable={false}
            width={800}
            onOk={() => switchShortcutsModalVisible(false)}
            cancelButtonProps={{ style: { display: 'none' } }}
            zIndex={1001} /* default antd is 1000 */
            className='cvat-shortcuts-modal-window'
        >
            <Table
                dataSource={dataSource}
                columns={columns}
                size='small'
                className='cvat-shortcuts-modal-window-table'
            />
        </Modal>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(ShortcutsDialog);
