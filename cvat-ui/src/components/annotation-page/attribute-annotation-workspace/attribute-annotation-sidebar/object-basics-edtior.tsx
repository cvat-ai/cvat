// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Select, { SelectValue } from 'antd/lib/select';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';

interface Props {
    currentLabel: string;
    labels: any[];
    occluded: boolean;
    setOccluded(event: CheckboxChangeEvent): void;
    changeLabel(value: SelectValue): void;
}

function ObjectBasicsEditor(props: Props): JSX.Element {
    const {
        currentLabel,
        occluded,
        labels,
        setOccluded,
        changeLabel,
    } = props;

    return (
        <div className='attribute-annotation-sidebar-basics-editor'>
            <Select value={currentLabel} onChange={changeLabel} style={{ width: '50%' }}>
                {labels.map((label: any): JSX.Element => (
                    <Select.Option
                        value={label.name}
                        key={label.name}
                    >
                        {label.name}
                    </Select.Option>
                ))}
            </Select>
            <Checkbox checked={occluded} onChange={setOccluded}>Occluded</Checkbox>
        </div>
    );
}

export default React.memo(ObjectBasicsEditor);
