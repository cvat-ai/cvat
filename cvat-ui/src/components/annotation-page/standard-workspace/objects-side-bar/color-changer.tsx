// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Button,
} from 'antd';

interface Props {
    colors: string[];
    onChange(color: string): void;
}

function ColorChanger(props: Props): JSX.Element {
    const {
        colors,
        onChange,
    } = props;

    const cols = 6;
    const rows = Math.ceil(colors.length / cols);

    const antdRows = [];
    for (let row = 0; row < rows; row++) {
        const antdCols = [];
        for (let col = 0; col < cols; col++) {
            const idx = row * cols + col;
            if (idx >= colors.length) {
                break;
            }
            const color = colors[idx];
            antdCols.push(
                <Col key={col} span={4}>
                    <Button
                        onClick={(): void => onChange(color)}
                        style={{ background: color }}
                        className='cvat-label-item-color-button'
                    />
                </Col>,
            );
        }

        antdRows.push(
            // eslint-disable-next-line react/no-children-prop
            <Row key={row} children={antdCols} />,
        );
    }

    return (
        <>
            {antdRows}
        </>
    );
}

export default React.memo(ColorChanger);
