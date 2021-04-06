// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { ReactNode } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Popover from 'antd/lib/popover';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/lib/grid';
import Typography from 'antd/lib/typography';
import Tooltip from 'antd/lib/tooltip';

import { setLabel2KeyMap } from 'actions/annotation-actions';
import { CombinedState } from 'reducers/interfaces';

interface LabelKeySelectorPopoverProps {
    labelId: number;
    children: ReactNode;
}
interface LabelKeySelectorPopoverContentProps {
    labelId: number;
}

function PopoverContent(props: LabelKeySelectorPopoverContentProps): JSX.Element {
    const label2KeyMap = useSelector((state: CombinedState) => state.annotation.label2KeyMap);
    const labels = useSelector((state: CombinedState) => state.annotation.job.labels);

    const dispatch = useDispatch();

    const handleLabelNumberButtonClick = (key: string): void => {
        const { labelId } = props;
        const newlabel2KeyMap: any = {};
        for (const [lId, kId] of Object.entries(label2KeyMap)) {
            if (kId !== key) {
                newlabel2KeyMap[lId] = kId;
            }
        }
        newlabel2KeyMap[labelId] = key;
        dispatch(setLabel2KeyMap(newlabel2KeyMap));
    };

    return (
        <div className='cvat-label-select-number-popover'>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['0']].map((arr, i_) => (
                <Row
                    justify='space-around'
                    gutter={[16, 16]}
                    key={i_}
                >
                    {arr.map((i) => {
                        const pairs = Object.entries(label2KeyMap).filter((pair) => pair[1] === i);
                        const labelName = pairs.length ?
                            labels.filter((l) => l.id === +pairs[0][0])[0].name :
                            (<i>None</i>);

                        return (
                            <Col key={i} span={8}>
                                <Tooltip title={labelName}>
                                    <Button onClick={() => handleLabelNumberButtonClick(i)}>
                                        <span>
                                            {`${i}:\u00A0`}
                                            <Typography.Text
                                                type='secondary'

                                            >
                                                {labelName}
                                            </Typography.Text>
                                        </span>
                                    </Button>
                                </Tooltip>
                            </Col>
                        );
                    })}
                </Row>
            ))}
        </div>
    );
}

export default function LabelKeySelectorPopover(props: LabelKeySelectorPopoverProps): JSX.Element {
    const { children, labelId } = props;

    return (
        <Popover
            trigger='click'
            title='Select number for label'
            content={<PopoverContent labelId={labelId} />}
            placement='left'

        >
            {children}
        </Popover>
    );
}
