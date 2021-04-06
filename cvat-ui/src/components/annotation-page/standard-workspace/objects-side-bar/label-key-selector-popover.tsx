// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import Popover from 'antd/lib/popover';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';

import { CombinedState } from 'reducers/interfaces';
import CVATTooltip from 'components/common/cvat-tooltip';

interface LabelKeySelectorPopoverProps {
    updateLabelShortcutKey(updatedKey: string): void;
    keyToLabelMapping: Record<string, number>;
    children: JSX.Element;
}

interface LabelKeySelectorPopoverContentProps {
    updateLabelShortcutKey(updatedKey: string): void;
    keyToLabelMapping: Record<string, number>;
}

function PopoverContent(props: LabelKeySelectorPopoverContentProps): JSX.Element {
    const { keyToLabelMapping, updateLabelShortcutKey } = props;
    const labels = useSelector((state: CombinedState) => state.annotation.job.labels);

    return (
        <div className='cvat-label-item-setup-shortcut-popover'>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['0']].map((arr, i_) => (
                <Row justify='space-around' gutter={[16, 16]} key={i_}>
                    {arr.map((i) => {
                        const labelID = keyToLabelMapping[i];
                        const labelName = Number.isInteger(labelID) ?
                            labels.filter((label: any): boolean => label.id === labelID)[0]?.name || 'undefined' :
                            'None';

                        return (
                            <Col key={i} span={8}>
                                <CVATTooltip title={labelName}>
                                    <Button onClick={() => updateLabelShortcutKey(i)}>
                                        <div>
                                            <Text>{`${i}:`}</Text>
                                            <Text type='secondary'>{labelName}</Text>
                                        </div>
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

export default function LabelKeySelectorPopover(props: LabelKeySelectorPopoverProps): JSX.Element {
    const { children, updateLabelShortcutKey, keyToLabelMapping } = props;

    return (
        <Popover
            trigger='click'
            content={
                <PopoverContent keyToLabelMapping={keyToLabelMapping} updateLabelShortcutKey={updateLabelShortcutKey} />
            }
            placement='left'
        >
            {children}
        </Popover>
    );
}
