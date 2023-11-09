// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { InfoCircleTwoTone, LoadingOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import React from 'react';

const FORCE_MESSAGE_FLAG = 'force';

interface Hint {
    type: 'text' | 'list';
    content: string | string[];
    className?: string;
    icon?: 'info' | 'loading';
}

interface State {
    hints: Hint[] | null;
    topic: string;
    hiddenHints: Record<string, boolean>;
}

export default class CanvasTipsComponent extends React.PureComponent<{}, State> {
    public constructor(props: {}) {
        super(props);
        let hiddenHints = {};
        try {
            hiddenHints = JSON.parse(localStorage.getItem('hiddenHints') || '{}');
        } catch (error: unknown) {
            // do nothing
        }

        this.state = {
            hints: null,
            topic: '',
            hiddenHints,
        };
    }

    public update(hints: Hint[] | null, topic: string): void {
        this.setState({ hints, topic });
    }

    public render(): JSX.Element | null {
        const { hints, hiddenHints, topic } = this.state;

        if (hints && !hiddenHints[topic]) {
            const blocks = hints.map(({
                type, content, className, icon,
            }, idx) => {
                let Icon = null;
                if (icon === 'info') {
                    Icon = <InfoCircleTwoTone />;
                } else if (icon === 'loading') {
                    Icon = <LoadingOutlined />;
                }
                if (type === 'text') {
                    return (
                        <div key={idx} className={`cvat-canvas-hints-block ${className || ''}`}>
                            { Icon }
                            <Text>{content as string}</Text>
                        </div>
                    );
                }

                return (
                    <div key={idx} className={`cvat-canvas-hints-block ${className || ''}`}>
                        <ul>
                            {(content as string[]).map((line, secIdx) => (
                                <li key={secIdx}>{line}</li>
                            ))}
                        </ul>
                    </div>
                );
            });

            return (
                <div className='cvat-canvas-hints-container'>
                    { blocks }
                    { topic !== FORCE_MESSAGE_FLAG && (
                        <Button
                            onClick={() => {
                                const updated = { ...hiddenHints, [topic]: true };
                                localStorage.setItem('hiddenHints', JSON.stringify(updated));
                                this.setState({ hiddenHints: updated });
                            }}
                            className='cvat-canvas-hints-hide-button'
                            type='link'
                        >
                            Hide
                        </Button>
                    )}
                </div>
            );
        }

        return null;
    }
}
