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
    changeColor(color: string): void;
}

function PopoverContent(props: PopoverContentProps): JSX.Element {
    const {
        colors,
        changeColor,
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
                        onClick={(): void => changeColor(color)}
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
    labelName: string;
    labelColor: string;
    labelColors: string[];
    visible: boolean;
    statesHidden: boolean;
    statesLocked: boolean;
    hideStates(): void;
    showStates(): void;
    lockStates(): void;
    unlockStates(): void;
    changeColor(color: string): void;
}

const LabelItemComponent = React.memo((props: Props): JSX.Element => {
    const {
        labelName,
        labelColor,
        labelColors,
        visible,
        statesHidden,
        statesLocked,
        hideStates,
        showStates,
        lockStates,
        unlockStates,
        changeColor,
    } = props;

    return (
        <Row
            type='flex'
            align='middle'
            justify='space-around'
            className='cvat-objects-sidebar-label-item'
            style={{ display: visible ? 'flex' : 'none' }}
        >
            <Col span={4}>
                <Popover
                    placement='left'
                    trigger='click'
                    content={(
                        <PopoverContent
                            changeColor={changeColor}
                            colors={labelColors}
                        />
                    )}
                >
                    <Button style={{ background: labelColor }} className='cvat-label-item-color-button' />
                </Popover>
            </Col>
            <Col span={14}>
                <Text strong className='cvat-text'>{labelName}</Text>
            </Col>
            <Col span={3}>
                { statesLocked
                    ? <Icon type='lock' onClick={unlockStates} />
                    : <Icon type='unlock' onClick={lockStates} />
                }
            </Col>
            <Col span={3}>
                { statesHidden
                    ? <Icon type='eye-invisible' onClick={showStates} />
                    : <Icon type='eye' onClick={hideStates} />
                }
            </Col>
        </Row>
    );
});

export default LabelItemComponent;
