// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import Popover from 'antd/lib/popover';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';

import { CombinedState } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';

interface LabelKeySelectorPopoverProps {
    updateLabelShortcutKey(updatedKey: string, labelID: number): void;
    keyToLabelMapping: Record<string, number>;
    labelID: number;
    children: JSX.Element;
}

interface LabelKeySelectorPopoverContentProps {
    updateLabelShortcutKey(updatedKey: string, labelID: number): void;
    labelID: number;
    keyToLabelMapping: Record<string, number>;
}

function PopoverContent(props: LabelKeySelectorPopoverContentProps): JSX.Element {
    const { keyToLabelMapping, labelID, updateLabelShortcutKey } = props;
    const labels = useSelector((state: CombinedState) => state.annotation.job.labels);

    return (
        <div className='cvat-label-item-setup-shortcut-popover'>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['0']].map((arr, i_) => (
                <Row justify='space-around' gutter={[16, 16]} key={i_}>
                    {arr.map((i) => {
                        const previousLabelID = keyToLabelMapping[i];
                        const labelName = Number.isInteger(previousLabelID) ?
                            labels.filter((label: any): boolean => label.id === previousLabelID)[0]?.name ||
                              'undefined' :
                            'None';

                        return (
                            <Col key={i} span={8}>
                                <CVATTooltip title={labelName}>
                                    <Button
                                        className='cvat-label-item-shortcut-button'
                                        onClick={() => updateLabelShortcutKey(i, labelID)}
                                    >
                                        <Text>{`${i}:`}</Text>
                                        <Text type='secondary'>{labelName}</Text>
                                    </Button>
                                </CVATTooltip>
                            </Col>
                        );
                    })}
                </Row>
            ))}
        </div>
    );
}

const MemoizedContent = React.memo(PopoverContent);

function LabelKeySelectorPopover(props: LabelKeySelectorPopoverProps): JSX.Element {
    const {
        children, labelID, updateLabelShortcutKey, keyToLabelMapping,
    } = props;

    return (
        <Popover
            destroyTooltipOnHide
            trigger='click'
            content={(
                <MemoizedContent
                    keyToLabelMapping={keyToLabelMapping}
                    labelID={labelID}
                    updateLabelShortcutKey={updateLabelShortcutKey}
                />
            )}
            placement='left'
        >
            {children}
        </Popover>
    );
}

export default React.memo(LabelKeySelectorPopover);
