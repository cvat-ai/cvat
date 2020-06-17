// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

interface Props {
    shortcut: string;
    colors: string[];
    onChange(color: string): void;
}

function ColorChanger(props: Props): JSX.Element {
    const { shortcut, colors, onChange } = props;

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
        <div>
            <Text>
                {`Press ${shortcut} to set a random color`}
            </Text>
            {antdRows}
        </div>
    );
}

export default React.memo(ColorChanger);
