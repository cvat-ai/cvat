// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import { EyeTwoTone } from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { DimensionType } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';

interface Props {
    disabled?: boolean;
}

function RawFrameControl(props: Props): JSX.Element {
    const { disabled } = props;

    const { dimension } = useSelector((state: CombinedState) => ({
        dimension: state.annotation.job.instance?.dimension,
    }), shallowEqual);

    const is2D = dimension === DimensionType.DIMENSION_2D;
    const [visible, setVisible] = useState<boolean>(false);

    const toggleCompare = useCallback(() => {
        if (!is2D) return;

        const next = !visible;
        setVisible(next);
        window.dispatchEvent(new CustomEvent('cvat.rawCompareToggle', { detail: { active: next } }));
    }, [is2D, visible]);

    useEffect(() => {
        const handler = (event: Event): void => {
            if (!is2D) return;

            const detail = (event as CustomEvent).detail || {};
            setVisible(Boolean(detail.active));
        };
        window.addEventListener('cvat.rawCompareToggle', handler as EventListener);
        return () => {
            window.removeEventListener('cvat.rawCompareToggle', handler as EventListener);
            window.dispatchEvent(new CustomEvent('cvat.rawCompareToggle', { detail: { active: false } }));
        };
    }, [is2D]);

    useEffect(() => {
        if (!is2D && visible) {
            setVisible(false);
            window.dispatchEvent(new CustomEvent('cvat.rawCompareToggle', { detail: { active: false } }));
        }
    }, [is2D, visible]);

    const iconClassName = (disabled || !is2D) ?
        'cvat-raw-frame-control cvat-disabled-canvas-control cvat-antd-icon-control' :
        `cvat-raw-frame-control cvat-antd-icon-control${visible ? ' cvat-active-canvas-control' : ''}`;

    return (
        <>
            <CVATTooltip title='Toggle raw compare' placement='right'>
                <EyeTwoTone
                    className={iconClassName}
                    onClick={() => {
                        if (!disabled) {
                            toggleCompare();
                        }
                    }}
                />
            </CVATTooltip>
        </>
    );
}

RawFrameControl.defaultProps = {
    disabled: false,
};

export default React.memo(RawFrameControl);
