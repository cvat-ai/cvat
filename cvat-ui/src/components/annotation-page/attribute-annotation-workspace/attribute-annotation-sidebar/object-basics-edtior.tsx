// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Select, { SelectValue } from 'antd/lib/select';

interface Props {
    currentLabel: string;
    labels: any[];
    changeLabel(value: SelectValue): void;
}

function ObjectBasicsEditor(props: Props): JSX.Element {
    const { currentLabel, labels, changeLabel } = props;

    return (
        <div className='attribute-annotation-sidebar-basics-editor'>
            <Select value={currentLabel} onChange={changeLabel} style={{ width: '50%' }}>
                {labels.map(
                    (label: any): JSX.Element => (
                        <Select.Option value={label.name} key={label.name}>
                            {label.name}
                        </Select.Option>
                    ),
                )}
            </Select>
        </div>
    );
}

export default React.memo(ObjectBasicsEditor);
