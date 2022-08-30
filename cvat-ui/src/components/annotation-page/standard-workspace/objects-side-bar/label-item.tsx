// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, MouseEvent } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import {
    LockFilled, UnlockOutlined, EyeInvisibleFilled, EyeOutlined,
} from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState, ObjectType } from 'reducers';
import { updateAnnotationsAsync, updateLabelShortcuts } from 'actions/annotation-actions';
import { useDispatch, useSelector } from 'react-redux';
import LabelKeySelectorPopover from './label-key-selector-popover';

interface Props extends React.HTMLAttributes<any>{
    labelID: number;
}

function LabelItemComponent(props: Props): JSX.Element {
    const dispatch = useDispatch();
    const labels = useSelector((state: CombinedState) => state.annotation.job.labels);
    const states = useSelector((state: CombinedState) => state.annotation.annotations.states);
    const labelShortcuts = useSelector((state: CombinedState) => state.annotation.job.labelShortcuts);
    const label = labels.find((l) => l.id === props.labelID);

    const updateLabelShortcutKey = useCallback(
        (key: string, labelID: number) => {
            // unassign any keys assigned to the current labels
            const keyToLabelMappingCopy = { ...labelShortcuts };
            for (const shortKey of Object.keys(keyToLabelMappingCopy)) {
                if (keyToLabelMappingCopy[shortKey] === labelID) {
                    delete keyToLabelMappingCopy[shortKey];
                }
            }

            if (key === '—') {
                dispatch(updateLabelShortcuts(keyToLabelMappingCopy));
                return;
            }

            // check if this key is assigned to another label
            if (key in keyToLabelMappingCopy) {
                // try to find a new key for the other label
                for (let i = 0; i < 10; i++) {
                    const adjustedI = (i + 1) % 10;
                    if (!(adjustedI in keyToLabelMappingCopy)) {
                        keyToLabelMappingCopy[adjustedI] = keyToLabelMappingCopy[key];
                        break;
                    }
                }
                // delete assigning to the other label
                delete keyToLabelMappingCopy[key];
            }

            // assigning to the current label
            keyToLabelMappingCopy[key] = labelID;
            dispatch(updateLabelShortcuts(keyToLabelMappingCopy));
        },
        [labelShortcuts.labelShortcuts],
    );

    const ownObjectStates = states.filter(
        (ownObjectState: any): boolean => ownObjectState.label.id === props.labelID,
    );
    const visible = !!ownObjectStates.length;
    let statesHidden = true;
    let statesLocked = true;

    ownObjectStates.forEach((objectState: any) => {
        const { lock, objectType } = objectState;
        if (!lock && objectType !== ObjectType.TAG) {
            statesHidden = statesHidden && objectState.hidden;
            statesLocked = statesLocked && objectState.lock;
        }
    });

    // create reversed mapping just to receive key easily
    const labelToKeyMapping: Record<string, string> = Object.fromEntries(
        Object.entries(labelShortcuts).map(([key, _labelID]) => [_labelID, key]),
    );
    const labelShortcutKey = labelToKeyMapping[props.labelID.toString()] || '?';
    const classes = {
        lock: {
            enabled: { className: 'cvat-label-item-button-lock cvat-label-item-button-lock-enabled' },
            disabled: { className: 'cvat-label-item-button-lock' },
        },
        hidden: {
            enabled: { className: 'cvat-label-item-button-hidden cvat-label-item-button-hidden-enabled' },
            disabled: { className: 'cvat-label-item-button-hidden' },
        },
    };

    const setHidden = (e: MouseEvent<any>, value: boolean): void => {
        e.stopPropagation();
        if (ownObjectStates.length) {
            dispatch(updateAnnotationsAsync(ownObjectStates.map((state: any) => ((state.hidden = value), state))));
        }
    };

    const setLock = (e: MouseEvent<any>, value: boolean): void => {
        e.stopPropagation();
        if (ownObjectStates.length) {
            dispatch(updateAnnotationsAsync(ownObjectStates.map((state: any) => ((state.lock = value), state))));
        }
    };

    return (
        <Row
            className={[
                'cvat-objects-sidebar-label-item',
                visible ? '' : 'cvat-objects-sidebar-label-item-disabled',
            ].join(' ')}
        >
            <Col span={2}>
                <div style={{ background: label.color }} className='cvat-label-item-color'>
                    {' '}
                </div>
            </Col>
            <Col span={12}>
                <CVATTooltip title={`${label.name} - ${ownObjectStates.length} object(s)`}>
                    <Text strong className='cvat-text'>
                        {`(${ownObjectStates.length}) ${label.name}`}
                    </Text>
                </CVATTooltip>
            </Col>
            <Col span={3}>
                <LabelKeySelectorPopover
                    keyToLabelMapping={labelShortcuts}
                    labelID={props.labelID}
                    updateLabelShortcutKey={updateLabelShortcutKey}
                >
                    <Button className='cvat-label-item-setup-shortcut-button' size='small' ghost type='dashed'>
                        {labelShortcutKey}
                    </Button>
                </LabelKeySelectorPopover>
            </Col>
            <Col span={2} offset={1}>
                {statesLocked ? (
                    <LockFilled {...classes.lock.enabled} onClick={(e) => setLock(e, false)} />
                ) : (
                    <UnlockOutlined {...classes.lock.disabled} onClick={(e) => setLock(e, true)} />
                )}
            </Col>
            <Col span={3}>
                {statesHidden ? (
                    <EyeInvisibleFilled {...classes.hidden.enabled} onClick={(e) => setHidden(e, false)} />
                ) : (
                    <EyeOutlined {...classes.hidden.disabled} onClick={(e) => setHidden(e, true)} />
                )}
            </Col>
        </Row>
    );
}

export default React.memo(LabelItemComponent);
