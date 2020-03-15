// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import LabelItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/label-item';

interface Props {
    labelIDs: number[];
    listHeight: number;
}

export default function LabelsListComponent(props: Props): JSX.Element {
    const {
        listHeight,
        labelIDs,
    } = props;

    return (
        <div style={{ height: listHeight }} className='cvat-objects-sidebar-labels-list'>
            {
                labelIDs.map((labelID: number): JSX.Element => (
                    <LabelItemContainer key={labelID} labelID={labelID} />
                ))
            }
        </div>
    );
}
