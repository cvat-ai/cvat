// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactPortal } from 'react';
import ReactDOM from 'react-dom';
import Tag from 'antd/lib/tag';
import Icon from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ConflictIcon } from 'icons';
import { ConflictSeverity, QualityConflict } from 'cvat-core-wrapper';

interface Props {
    top: number;
    left: number;
    angle: number;
    scale: number;
    text: string;
    darken: boolean;
    severity: ConflictSeverity;
    conflict: QualityConflict;
    tooltipVisible: boolean;
    showRequirements: boolean;
    onEnter: (conflict: QualityConflict) => void;
    onLeave: (conflict: QualityConflict) => void;
}

const MAX_TOOLTIP_REQUIREMENTS = 3;

export default function ConflictLabel(props: Props): ReactPortal {
    const {
        top, left, angle, scale, text, severity, darken, conflict, onEnter, onLeave, tooltipVisible, showRequirements,
    } = props;

    const conflictColor = severity === ConflictSeverity.ERROR ? 'cvat-conflict-error' : 'cvat-conflict-warning';
    const darkenColor = darken ? 'cvat-conflict-darken' : '';

    return ReactDOM.createPortal(
        <CVATTooltip
            title={(
                <>
                    <div>{text}</div>
                    {showRequirements && !!conflict.requirements.length && (
                        <div className='cvat-conflict-tooltip-requirements'>
                            <div>Requirements:</div>
                            {conflict.requirements.slice(0, MAX_TOOLTIP_REQUIREMENTS).map((requirement) => (
                                <div
                                    key={requirement.id}
                                    title={requirement.name}
                                    className='cvat-conflict-tooltip-requirement-name'
                                >
                                    {requirement.name}
                                </div>
                            ))}
                            {conflict.requirements.length > MAX_TOOLTIP_REQUIREMENTS && (
                                <div>{`${conflict.requirements.length - MAX_TOOLTIP_REQUIREMENTS} more in Issues`}</div>
                            )}
                        </div>
                    )}
                </>
            )}
            open={tooltipVisible}
        >
            <Tag
                style={{
                    top,
                    left,
                    transform: `scale(${scale}) rotate(${angle}deg) translateY(-100%) translateX(-50%)`,
                }}
                className={`cvat-conflict-label ${conflictColor} ${darkenColor}`}
            >
                <Icon
                    onMouseEnter={() => {
                        onEnter(conflict);
                    }}
                    onMouseLeave={() => {
                        onLeave(conflict);
                    }}
                    component={ConflictIcon}
                />
            </Tag>
        </CVATTooltip>,
        window.document.getElementById('cvat_canvas_attachment_board') as HTMLElement,
    );
}
