// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { connect } from 'react-redux';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Tooltip from 'antd/lib/tooltip';

import { Canvas } from 'cvat-canvas-wrapper';
import { CombinedState } from 'reducers/interfaces';
import { activate as activatePlugin, deactivate as deactivatePlugin } from 'utils/dextr-utils';


interface StateToProps {
    pluginEnabled: boolean;
    canvasInstance: Canvas;
}

interface DispatchToProps {
    activate(canvasInstance: Canvas): void;
    deactivate(canvasInstance: Canvas): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        plugins: {
            list,
        },
        annotation: {
            canvas: {
                instance: canvasInstance,
            },
        },
    } = state;

    return {
        canvasInstance,
        pluginEnabled: list.DEXTR_SEGMENTATION,
    };
}

function mapDispatchToProps(): DispatchToProps {
    return {
        activate(canvasInstance: Canvas): void {
            activatePlugin(canvasInstance);
        },
        deactivate(canvasInstance: Canvas): void {
            deactivatePlugin(canvasInstance);
        },
    };
}

function DEXTRPlugin(props: StateToProps & DispatchToProps): JSX.Element | null {
    const {
        pluginEnabled,
        canvasInstance,
        activate,
        deactivate,
    } = props;
    const [pluginActivated, setActivated] = useState(false);

    return (
        pluginEnabled ? (
            <Tooltip title='Make AI polygon from at least 4 extreme points using deep extreme cut' mouseLeaveDelay={0}>
                <Checkbox
                    style={{ marginTop: 5 }}
                    checked={pluginActivated}
                    onChange={(event: CheckboxChangeEvent): void => {
                        setActivated(event.target.checked);
                        if (event.target.checked) {
                            activate(canvasInstance);
                        } else {
                            deactivate(canvasInstance);
                        }
                    }}
                >
                    Make AI polygon
                </Checkbox>
            </Tooltip>
        ) : null
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(DEXTRPlugin);

// TODO: Add dialog window with cancel button
