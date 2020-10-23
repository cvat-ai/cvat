// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row } from 'antd/lib/grid';
import Collapse from 'antd/lib/collapse';

import ItemAttribute from './object-item-attribute';

interface Props {
    collapsed: boolean;
    attributes: any[];
    values: Record<number, string>;
    changeAttribute(attrID: number, value: string): void;
    collapse(): void;
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
        nextProps.collapsed === prevProps.collapsed &&
        nextProps.attributes === prevProps.attributes &&
        attrValuesAreEqual(nextProps.values, prevProps.values)
    );
}

function ItemAttributesComponent(props: Props): JSX.Element {
    const { collapsed, attributes, values, changeAttribute, collapse } = props;

    const sorted = [...attributes].sort((a: any, b: any): number => a.inputType.localeCompare(b.inputType));

    return (
        <Row>
            <Collapse
                className='cvat-objects-sidebar-state-item-collapse'
                activeKey={collapsed ? [] : ['details']}
                onChange={collapse}
            >
                <Collapse.Panel header={<span style={{ fontSize: '11px' }}>Details</span>} key='details'>
                    {sorted.map(
                        (attribute: any): JSX.Element => (
                            <Row
                                key={attribute.id}
                                type='flex'
                                align='middle'
                                justify='start'
                                className='cvat-object-item-attribute-wrapper'
                            >
                                <ItemAttribute
                                    attrValue={values[attribute.id]}
                                    attrInputType={attribute.inputType}
                                    attrName={attribute.name}
                                    attrID={attribute.id}
                                    attrValues={attribute.values}
                                    changeAttribute={changeAttribute}
                                />
                            </Row>
                        ),
                    )}
                </Collapse.Panel>
            </Collapse>
        </Row>
    );
}

export default React.memo(ItemAttributesComponent, attrAreTheSame);
