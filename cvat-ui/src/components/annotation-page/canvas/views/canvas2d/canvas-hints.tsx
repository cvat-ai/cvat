// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Button from 'antd/lib/button';
import CVATMarkdown from 'components/common/cvat-markdown';

const FORCE_MESSAGE_FLAG = 'force';

interface State {
    hints: string | null;
    topic: string;
    hiddenHints: Record<string, boolean>;
}

export default class CanvasTipsComponent extends React.PureComponent<{}, State> {
    public constructor(props: {}) {
        super(props);
        let hiddenHints = {};
        try {
            hiddenHints = JSON.parse(localStorage.getItem('hiddenHints') || '{}');
        } catch (_error: unknown) {
            // do nothing
        }

        this.state = {
            hints: null,
            topic: '',
            hiddenHints,
        };
    }

    public update(hints: string | null, topic = ''): void {
        this.setState({ hints, topic: hints === null ? '' : topic });
    }

    public render(): JSX.Element | null {
        const { hints, hiddenHints, topic } = this.state;

        if (hints && !hiddenHints[topic]) {
            return (
                <div style={{ filter: 'none' }} className='cvat-canvas-hints-container'>
                    <div className='cvat-canvas-hints-markdown'>
                        <CVATMarkdown>{hints}</CVATMarkdown>
                    </div>
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

        return (
            <div className='cvat-canvas-hints-container cvat-canvas-hints-container-disabled' />
        );
    }
}
