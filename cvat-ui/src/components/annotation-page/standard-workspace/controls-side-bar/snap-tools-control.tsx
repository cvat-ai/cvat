// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Icon from '@ant-design/icons';
import Button from 'antd/lib/button';
import Popover from 'antd/lib/popover';
import Text from 'antd/lib/typography/Text';

import { SnapToolsIcon, SnapToContourIcon, SnapToPointIcon } from 'icons';
import { CombinedState } from 'reducers';
import {
    switchAutomaticBordering,
    switchPointSnap,
} from 'actions/settings-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import withVisibilityHandling from './handle-popover-visibility';

interface StateToProps {
    automaticBordering: boolean;
    pointSnap: boolean;
}

interface DispatchToProps {
    onSwitchAutomaticBordering: (enabled: boolean) => void;
    onSwitchPointSnap: (enabled: boolean) => void;
}

const CustomPopover = withVisibilityHandling(Popover, 'snap-tools-control');

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        settings: {
            workspace: { automaticBordering, pointSnap },
        },
    } = state;

    return {
        automaticBordering,
        pointSnap,
    };
}

const mapDispatchToProps = {
    onSwitchAutomaticBordering: switchAutomaticBordering,
    onSwitchPointSnap: switchPointSnap,
};

type Props = StateToProps & DispatchToProps;

function SnapToolsControlComponent(props: Props): JSX.Element {
    const {
        automaticBordering,
        pointSnap,
        onSwitchAutomaticBordering,
        onSwitchPointSnap,
    } = props;

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
                    <CVATTooltip title='Snap to contour (Ctrl+A)'>
                        <Button
                            className={
                                automaticBordering ?
                                    'cvat-snap-to-contour-button cvat-snap-tool-active' :
                                    'cvat-snap-to-contour-button'
                            }
                            onClick={() => {
                                onSwitchAutomaticBordering(!automaticBordering);
                            }}
                        >
                            <Icon component={SnapToContourIcon} />
                        </Button>
                    </CVATTooltip>
                </Col>
                <Col>
                    <CVATTooltip title='Snap to point (Ctrl+P)'>
                        <Button
                            className={
                                pointSnap ?
                                    'cvat-snap-to-point-button cvat-snap-tool-active' :
                                    'cvat-snap-to-point-button'
                            }
                            onClick={() => {
                                onSwitchPointSnap(!pointSnap);
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
                <Icon className='cvat-snap-tools-control' component={SnapToolsIcon} />
            </CVATTooltip>
        </CustomPopover>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(SnapToolsControlComponent);
