// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Modal from 'antd/lib/modal';
import { useSelector, useDispatch } from 'react-redux';
import Text from 'antd/lib/typography/Text';

import { CombinedState } from 'reducers/interfaces';
import { exportActions } from 'actions/export-actions';
import getCore from 'cvat-core-wrapper';

const core = getCore();

type ExportDatasetModalProps = {
    instance: any;
};

export default function ExportDatasetModal(props: ExportDatasetModalProps): JSX.Element {
    const { instance } = props;
    const dispatch = useDispatch();
    const modalVisible = useSelector((state: CombinedState) => state.export.modalVisible);

    return (
        <Modal
            title={`Export ${instance instanceof core.classes.Project ? 'project' : 'task'} as a dataset`}
            visible={modalVisible}
            onCancel={() => dispatch(exportActions.toggleExportModalVisible())}
        >
            <Text>Placeholder</Text>
        </Modal>
    );
}
