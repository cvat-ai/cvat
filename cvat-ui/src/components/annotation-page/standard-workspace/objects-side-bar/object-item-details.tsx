// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Collapse from 'antd/lib/collapse';
import InputNumber from 'antd/lib/input-number';
import Tag from 'antd/lib/tag';
import CVATTooltip from 'components/common/cvat-tooltip';

import { Source } from 'cvat-core-wrapper';
import ItemAttribute from './object-item-attribute';

interface Props {
    readonly: boolean;
    collapsed: boolean;
    attributes: any[];
    values: Record<number, string>;
    changeAttribute(attrID: number, value: string): void;
    collapse(): void;
    sizeParams: SizeParams | null;
    changeSize(sizeType: SizeType, value: number): void;
    source: Source;
    score: number;
    votes: number;
    textContent: string;
}

export enum SizeType {
    LENGTH = 'length',
    WIDTH = 'width',
    HEIGHT = 'height',
}

export interface SizeParams {
    length: number;
    width: number;
    height: number;
}

// Use point-cloud cuboid terminology in the UI while preserving points[6..8] as X/Y/Z scale storage.
const sizeFields: {
    key: keyof SizeParams;
    type: SizeType;
    label: string;
    tooltip: string;
}[] = [
    {
        key: 'length',
        type: SizeType.LENGTH,
        label: 'L',
        tooltip: 'Length along X axis',
    },
    {
        key: 'width',
        type: SizeType.WIDTH,
        label: 'W',
        tooltip: 'Width along Y axis',
    },
    {
        key: 'height',
        type: SizeType.HEIGHT,
        label: 'H',
        tooltip: 'Height along Z axis',
    },
];

export function attrValuesAreEqual(next: Record<number, string>, prev: Record<number, string>): boolean {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);

    return (
        nextKeys.length === prevKeys.length &&
        nextKeys.map((key: string): boolean => prev[+key] === next[+key]).every((value: boolean) => value)
    );
}

function attrAreTheSame(prevProps: Props, nextProps: Props): boolean {
    return (
        nextProps.readonly === prevProps.readonly &&
        nextProps.collapsed === prevProps.collapsed &&
        nextProps.attributes === prevProps.attributes &&
        nextProps.source === prevProps.source &&
        nextProps.score === prevProps.score &&
        nextProps.votes === prevProps.votes &&
        nextProps.textContent === prevProps.textContent &&
        attrValuesAreEqual(nextProps.values, prevProps.values)
    );
}

function ItemAttributesComponent(props: Props): JSX.Element | null {
    const {
        collapsed, attributes, values, readonly, changeAttribute, collapse,
        sizeParams, changeSize, source, score, votes,
    } = props;

    const isConsensus = source === Source.CONSENSUS;
    const withScore = isConsensus;
    const withVotes = isConsensus;

    const hasDetails = attributes.length > 0 || sizeParams !== null;

    const baseTooltipAlign = {
        points: ['bl', 'tl'],
        offset: [10, 0],
        overflow: { adjustX: true, adjustY: true },
    };

    const scoreTag = withScore ? (
        <CVATTooltip
            title='Consensus score'
            align={{
                ...baseTooltipAlign,
                targetOffset: ['25%', '40%'],
            }}
        >
            <Tag color='#FFB347' className='cvat-object-item-score-tag'>
                {score.toFixed(2)}
            </Tag>
        </CVATTooltip>
    ) : null;
    const votesTag = withVotes ? (
        <CVATTooltip
            title='Number of votes'
            align={{
                ...baseTooltipAlign,
                targetOffset: ['40%', '40%'],
            }}
        >
            <Tag color='#FFB347' className='cvat-object-item-votes-tag'>
                {votes}
            </Tag>
        </CVATTooltip>
    ) : null;
    const scoreVotesElement = scoreTag || votesTag ? (
        <Row className='cvat-object-item-score-votes-wrapper'>
            {scoreTag}
            {votesTag}
        </Row>
    ) : null;

    if (!hasDetails) {
        if (scoreVotesElement) {
            return scoreVotesElement;
        }
        return null;
    }

    return (
        <Row>
            <Collapse
                className='cvat-objects-sidebar-state-item-collapse'
                activeKey={collapsed ? [] : ['details']}
                onChange={collapse}
                items={[{
                    key: 'details',
                    label: (
                        <Row style={{ width: '100%' }} align='middle' justify='space-between'>
                            <Text style={{ fontSize: 10 }} type='secondary'>DETAILS</Text>
                            {scoreVotesElement}
                        </Row>
                    ),
                    children: [
                        sizeParams && (
                            <Row key='size' justify='space-around' className='cvat-objects-sidebar-size-params'>
                                {sizeFields.map((field) => (
                                    <Col key={field.key}>
                                        <CVATTooltip title={field.tooltip}>
                                            <Text type='secondary'>
                                                {`${field.label}:`}
                                            </Text>
                                        </CVATTooltip>
                                        <InputNumber
                                            value={sizeParams[field.key] || ''}
                                            onChange={(value) => {
                                                if (typeof value === 'number') {
                                                    changeSize(field.type, value);
                                                }
                                            }}
                                            disabled={readonly}
                                        />
                                    </Col>
                                ))}
                            </Row>
                        ),
                        ...attributes.map(
                            (attribute: any): JSX.Element => (
                                <Row
                                    key={attribute.id}
                                    align='middle'
                                    justify='start'
                                    className='cvat-object-item-attribute-wrapper'
                                >
                                    <ItemAttribute
                                        readonly={readonly}
                                        attrValue={values[attribute.id]}
                                        attrInputType={attribute.inputType}
                                        attrName={attribute.name}
                                        attrID={attribute.id}
                                        attrValues={attribute.values}
                                        changeAttribute={changeAttribute}
                                    />
                                </Row>
                            ),
                        )],
                }]}
            />
        </Row>
    );
}

export default React.memo(ItemAttributesComponent, attrAreTheSame);
