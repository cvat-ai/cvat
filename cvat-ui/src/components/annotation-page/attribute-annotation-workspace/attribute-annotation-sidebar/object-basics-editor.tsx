// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Label } from 'cvat-core-wrapper';
import LabelSelector from 'components/label-selector/label-selector';

interface Props {
    currentLabel: number;
    labels: Label[];
    changeLabel(value: Label): void;
}

function ObjectBasicsEditor(props: Props): JSX.Element {
    const { currentLabel, labels, changeLabel } = props;

    return (
        <div className='cvat-attribute-annotation-sidebar-basics-editor'>
            <LabelSelector
                style={{ width: '50%' }}
                labels={labels}
                value={currentLabel}
                onChange={changeLabel}
            />
        </div>
    );
}

export default React.memo(ObjectBasicsEditor);
