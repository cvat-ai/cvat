import React from 'react';

import {
    Row,
    Col,
    Icon,
    Popover,
    Button,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface PopoverContentProps {
    colors: string[];
    onClick(color: string): void;
}

function PopoverContent(props: PopoverContentProps): JSX.Element {
    const {
        colors,
        onClick,
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
                        onClick={(): void => onClick(color)}
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

interface Props {
    label: any;
    statesVisible: boolean;
    statesLocked: boolean;
    colors: string[];

    onChangeLabelColor(label: any, color: string): void;
}

export default function LabelItem(props: Props): JSX.Element {
    const {
        label,
        statesVisible,
        statesLocked,
        colors,
        onChangeLabelColor,
    } = props;

    return (
        <Row
            type='flex'
            align='middle'
            justify='space-around'
            className='cvat-objects-sidebar-label-item'
        >
            <Col span={4}>
                <Popover
                    placement='left'
                    trigger='click'
                    content={(
                        <PopoverContent
                            onClick={(color: string): void => {
                                onChangeLabelColor(label, color);
                            }}
                            colors={colors}
                        />
                    )}
                >
                    <Button style={{ background: label.color }} className='cvat-label-item-color-button' />
                </Popover>
            </Col>
            <Col span={14}>
                <Text strong className='cvat-text'>{label.name}</Text>
            </Col>
            <Col span={3}>
                { statesLocked
                    ? <Icon type='lock' />
                    : <Icon type='unlock' />
                }
            </Col>
            <Col span={3}>
                { statesVisible
                    ? <Icon type='eye' />
                    : <Icon type='eye-invisible' />
                }
            </Col>
        </Row>
    );
}
