// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Icon from '@ant-design/icons';
import Button from 'antd/lib/button';
import Popover from 'antd/lib/popover';
import Text from 'antd/lib/typography/Text';

import { SnapToolsIcon, SnapToContourIcon, SnapToPointIcon } from 'icons';
import { CombinedState } from 'reducers';
import { switchAutomaticBordering, switchSnapToPoint } from 'actions/settings-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import withVisibilityHandling from './handle-popover-visibility';

const CustomPopover = withVisibilityHandling(Popover, 'snap-tools-control');

function SnapToolsControlComponent(): JSX.Element {
    const dispatch = useDispatch();
    const { automaticBordering, snapToPoint, normalizedKeyMap } = useSelector((state: CombinedState) => ({
        automaticBordering: state.settings.workspace.automaticBordering,
        snapToPoint: state.settings.workspace.snapToPoint,
        normalizedKeyMap: state.shortcuts.normalizedKeyMap,
    }));

    const isAnySnapEnabled = automaticBordering || snapToPoint;

    const popoverContent = (
        <div className='cvat-snap-tools-control-popover-content'>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>
                        Snap Tools
                    </Text>
                </Col>
            </Row>
            <Row justify='start' className='cvat-snap-tools-row'>
                <Col>
                    <CVATTooltip title={`Snap to contour ${normalizedKeyMap.SWITCH_AUTOMATIC_BORDERING}`}>
                        <Button
                            className={
                                automaticBordering ?
                                    'cvat-snap-to-contour-button cvat-snap-tool-active' :
                                    'cvat-snap-to-contour-button'
                            }
                            onClick={() => {
                                dispatch(switchAutomaticBordering(!automaticBordering));
                            }}
                        >
                            <Icon component={SnapToContourIcon} />
                        </Button>
                    </CVATTooltip>
                </Col>
                <Col>
                    <CVATTooltip title={`Snap to point ${normalizedKeyMap.SWITCH_SNAP_TO_POINT}`}>
                        <Button
                            className={
                                snapToPoint ?
                                    'cvat-snap-to-point-button cvat-snap-tool-active' :
                                    'cvat-snap-to-point-button'
                            }
                            onClick={() => {
                                dispatch(switchSnapToPoint(!snapToPoint));
                            }}
                        >
                            <Icon component={SnapToPointIcon} />
                        </Button>
                    </CVATTooltip>
                </Col>
            </Row>
        </div>
    );

    return (
        <CustomPopover
            placement='right'
            overlayClassName='cvat-snap-tools-control-popover'
            content={popoverContent}
        >
            <CVATTooltip title='Snap tools' placement='right'>
                <Icon
                    className={`cvat-snap-tools-control ${isAnySnapEnabled ? 'cvat-snap-tools-active' : ''}`}
                    component={SnapToolsIcon}
                />
            </CVATTooltip>
        </CustomPopover>
    );
}

export default SnapToolsControlComponent;
