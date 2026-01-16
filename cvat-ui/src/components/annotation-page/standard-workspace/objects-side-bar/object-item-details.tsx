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
    WIDTH = 'width',
    HEIGHT = 'height',
    LENGTH = 'length',
}

export interface SizeParams {
    width: number;
    height: number;
    length: number;
}

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
        sizeParams, changeSize, source, score, votes, textContent,
    } = props;

    const isConsensus = source === Source.CONSENSUS;
    const withScore = isConsensus && textContent.includes('score');
    const withVotes = isConsensus && textContent.includes('votes');

    const hasDetails = attributes.length > 0 || sizeParams !== null;
    const scoreTag = withScore ? (
        <Tag color='#FFB347' className='cvat-object-item-score-tag'>
            {score.toFixed(2)}
        </Tag>
    ) : null;
    const votesTag = withVotes ? (
        <Tag color='#FFB347' className='cvat-object-item-votes-tag'>
            {votes}
        </Tag>
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
                                {Object.keys(sizeParams).map((key) => (
                                    <Col key={key}>
                                        <Text type='secondary'>
                                            {`${key.charAt(0).toUpperCase()}:`}
                                        </Text>
                                        <InputNumber
                                            value={sizeParams[key as keyof SizeParams] || ''}
                                            onChange={(value) => {
                                                if (typeof value === 'number') {
                                                    changeSize(
                                                        SizeType[key.toUpperCase() as keyof typeof SizeType],
                                                        value,
                                                    );
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
