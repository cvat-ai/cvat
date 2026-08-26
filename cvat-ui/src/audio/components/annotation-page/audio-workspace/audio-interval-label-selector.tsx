// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Popover from 'antd/lib/popover';
import { EditOutlined } from '@ant-design/icons';
import classNames from 'classnames';

import { Label } from 'cvat-core-wrapper';

interface Props {
    labels: Label[];
    activeLabel: Label | null | undefined;
    isReadonly: boolean;
    onChangeLabel(labelId: number): void;
}

export default function AudioIntervalLabelSelector({
    labels, activeLabel, isReadonly, onChangeLabel,
}: Props): JSX.Element {
    const [open, setOpen] = useState(false);
    const content = (
        <div className='cvat-audio-region-label-popover-content'>
            {labels.map((label) => (
                <div
                    key={label.id}
                    role='button'
                    tabIndex={0}
                    className={classNames('cvat-audio-region-label-option', {
                        'cvat-audio-region-label-option--active': label.id === activeLabel?.id,
                    })}
                    onClick={() => {
                        if (label.id !== null && label.id !== undefined) {
                            onChangeLabel(label.id);
                            setOpen(false);
                        }
                    }}
                    onKeyDown={(event) => {
                        if ((event.key === 'Enter' || event.key === ' ') && label.id != null) {
                            onChangeLabel(label.id);
                            setOpen(false);
                        }
                    }}
                >
                    <span className='cvat-audio-region-label-option-color' style={{ backgroundColor: label.color || '#9CA3AF' }} />
                    <span className='cvat-audio-region-label-option-name'>{label.name}</span>
                </div>
            ))}
        </div>
    );

    return (
        <Popover
            content={content}
            trigger='click'
            placement='bottomLeft'
            open={!isReadonly && open}
            onOpenChange={(visible) => !isReadonly && setOpen(visible)}
            overlayClassName='cvat-audio-region-label-popover'
        >
            <div className='cvat-audio-region-label-trigger' role='button' tabIndex={0}>
                <span className='cvat-audio-region-label-color' style={{ backgroundColor: activeLabel?.color || '#9CA3AF' }} />
                <span className='cvat-audio-region-label-trigger-name'>{activeLabel?.name || 'No label'}</span>
                {!isReadonly ? <EditOutlined className='cvat-audio-region-label-edit-icon' /> : null}
            </div>
        </Popover>
    );
}
