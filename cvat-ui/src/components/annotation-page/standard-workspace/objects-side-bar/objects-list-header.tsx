// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import {
    CaretDownOutlined,
    CaretUpFilled,
    EyeInvisibleFilled,
    EyeOutlined,
    LockFilled,
    UnlockOutlined,
} from '@ant-design/icons';
import { Col, Row } from 'antd/lib/grid';
import Tooltip from 'antd/lib/tooltip';
import StatesOrderingSelector from 'components/annotation-page/standard-workspace/objects-side-bar/states-ordering-selector';
import React from 'react';
import { StatesOrdering } from 'reducers/interfaces';
import AnnotationFilterPane from '../../annotation-filter/annotation-filter-pane/annotation-filter-pane';

interface Props {
    readonly: boolean;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsed: boolean;
    statesOrdering: StatesOrdering;
    switchLockAllShortcut: string;
    switchHiddenAllShortcut: string;
    changeStatesOrdering(value: StatesOrdering): void;
    lockAllStates(): void;
    unlockAllStates(): void;
    collapseAllStates(): void;
    expandAllStates(): void;
    hideAllStates(): void;
    showAllStates(): void;
}

function LockAllSwitcher(props: Props): JSX.Element {
    const {
        statesLocked, switchLockAllShortcut, unlockAllStates, lockAllStates,
    } = props;
    return (
        <Col span={2}>
            <Tooltip title={`Switch lock property for all ${switchLockAllShortcut}`} mouseLeaveDelay={0}>
                {statesLocked ? <LockFilled onClick={unlockAllStates} /> : <UnlockOutlined onClick={lockAllStates} />}
            </Tooltip>
        </Col>
    );
}

function HideAllSwitcher(props: Props): JSX.Element {
    const {
        statesHidden, switchHiddenAllShortcut, showAllStates, hideAllStates,
    } = props;
    return (
        <Col span={2}>
            <Tooltip title={`Switch hidden property for all ${switchHiddenAllShortcut}`} mouseLeaveDelay={0}>
                {statesHidden ? (
                    <EyeInvisibleFilled onClick={showAllStates} />
                ) : (
                    <EyeOutlined onClick={hideAllStates} />
                )}
            </Tooltip>
        </Col>
    );
}

function CollapseAllSwitcher(props: Props): JSX.Element {
    const { statesCollapsed, expandAllStates, collapseAllStates } = props;
    return (
        <Col span={2}>
            <Tooltip title='Expand/collapse all' mouseLeaveDelay={0}>
                {statesCollapsed ? (
                    <CaretDownOutlined onClick={expandAllStates} />
                ) : (
                    <CaretUpFilled onClick={collapseAllStates} />
                )}
            </Tooltip>
        </Col>
    );
}

function ObjectListHeader(props: Props): JSX.Element {
    const { readonly, statesOrdering, changeStatesOrdering } = props;

    return (
        <div className='cvat-objects-sidebar-states-header'>
            <Row>
                <Col span={24}>
                    <AnnotationFilterPane />
                </Col>
            </Row>
            <Row justify='space-between' align='middle'>
                {!readonly && (
                    <>
                        <LockAllSwitcher {...props} />
                        <HideAllSwitcher {...props} />
                    </>
                )}
                <CollapseAllSwitcher {...props} />
                <StatesOrderingSelector statesOrdering={statesOrdering} changeStatesOrdering={changeStatesOrdering} />
            </Row>
        </div>
    );
}

export default React.memo(ObjectListHeader);
