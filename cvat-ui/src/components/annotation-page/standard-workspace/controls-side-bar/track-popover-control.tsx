// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Select,
    InputNumber,
    Tooltip,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import { TrackerInputs } from 'reducers/interfaces';

interface Props {
    trackerType: string | null;
    trackUntil: string | null;
    trackerFrameNumber: number;

    handleChange(name: string, value: string | number): void;
}

const trackTypeOptions = [
    {
        label: "OpenCV Boosting",
        value: "Boosting",
    },
    {
        label: "OpenCV MIL",
        value: "MIL",
    },
    {
        label: "OpenCV KCF",
        value: "KCF",
    },
    {
        label: "OpenCV CSRT",
        value: "CSRT",
    },
    {
        label: "OpenCV MedianFlow",
        value: "MEDIANFLOW",
    },
    {
        label: "OpenCV TLD",
        value: "TLD",
    },
    {
        label: "OpenCV MOSSE",
        value: "MOSSE",
    },
    {
        label: "GOTURN",
        value: "GOTURN",
    },
]

const trackUntilOptions = [
    {
        label: "Next keyframe",
        value: "nextKeyframe"
    },
    {
        label: "Next manual keyframe",
        value: "nextUserKeyframe"
    },
    {
        label: "Next manual keyframe (at most 2)",
        value: "nextUserKeyframeMax2",
    },
    {
        label: "Next manual keyframe (at most 5)",
        value: "nextUserKeyframeMax5"
    },
    {
        label: "Next manual keyframe [at most 10]",
        value: "nextUserKeyframeMax10"
    },
    {
        label: "Next manual keyframe [at most 15]",
        value: "nextUserKeyframeMax15"
    },
    {
        label: "Next manual keyframe [at most 20]",
        value: "nextUserKeyframeMax20"
    },
    {
        label: "Next manual keyframe [at most 30]",
        value: "nextUserKeyframeMax30"
    },
    {
        label: "Next manual keyframe [at most 50]",
        value: "nextUserKeyframeMax50"
    },
    {
        label: "End",
        value: "end"
    },
]

function TrackPopoverComponent(props: Props) : JSX.Element {
    const {
        trackerType,
        trackUntil,
        trackerFrameNumber,
        handleChange
    } = props;


    return (
    <div className='cvat-track-setting-popover-content'>
        <Row type='flex' justify='start'>
            <Col>
                <Text className='cvat-text-color' strong>Tracker Settings</Text>
            </Col>
        </Row>
        <hr />
        <Row type='flex' justify='center' style={{margin: '5px 0px'}}>
            <Col span={6}>Tracker Type:</Col>
            <Col span={18}>
                <Select
                    value={trackerType || ''}
                    style={{width: '100%'}}
                    onChange={(value: string): void => handleChange(TrackerInputs.trackerType, value)}
                >
                    {trackTypeOptions.map(option =>
                        <Select.Option value={option.value} key={option.value}>{option.label}</Select.Option>
                    )}
                </Select>
            </Col>
        </Row>
        <Row type='flex' justify='center' style={{margin: '5px 0px'}}>
            <Col span={6}>Tracker Until:</Col>
            <Col span={18}>
                <Select
                    style={{width: '100%'}}
                    value={trackUntil || ''}
                    onChange={(value:string): void => handleChange(TrackerInputs.trackUntil, value)}
                >
                    {trackUntilOptions.map(option =>
                        <Select.Option value={option.value} key={option.value}>{option.label}</Select.Option>
                    )}
                </Select>
            </Col>
        </Row>
        <Row type='flex' justify='center' style={{margin: '5px 0px'}}>
            <Col>
                <Text className='cvat-text-color'>OR</Text>
            </Col>
        </Row>
        <Row type='flex' justify='center' style={{margin: '5px 0px'}}>
            <Col span={6}></Col>
            <Col span={18}>
                <Tooltip title="Select Frame Number">
                    <InputNumber
                        style={{width: '100%'}}
                        min={0}
                        placeholder='Select Frame Number'
                        value={trackerFrameNumber}
                        onChange={(value: number | undefined): void => handleChange(TrackerInputs.trackerFrameNumber, value || 0)}
                    />
                </Tooltip>
            </Col>
        </Row>
    </div>
    )
}

export default TrackPopoverComponent;