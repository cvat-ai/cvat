// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import Button from 'antd/lib/button';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { RouteComponentProps } from 'react-router-dom';

export type UseHistoryType = RouteComponentProps['history'];

const RouterLinkHOC = (history?: UseHistoryType) => (
    function (props: { children: React.ReactNode, href?: string }): JSX.Element {
        const { href, children } = props;

        if (href?.match(/^\//) && history) {
            return (
                <Button
                    type='link'
                    className='cvat-notification-link'
                    onClick={() => {
                        history.push(href);
                    }}
                >
                    {children}
                </Button>
            );
        }

        return (<a href={href}>{children}</a>);
    });

export default function CVATMarkdown(props: { history?: UseHistoryType, children: string }): JSX.Element {
    const { children, history } = props;

    return (
        <ReactMarkdown
            components={{
                a: RouterLinkHOC(history),
            }}
        >
            {children}
        </ReactMarkdown>
    );
}
