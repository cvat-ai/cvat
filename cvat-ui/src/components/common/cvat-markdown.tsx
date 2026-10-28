// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, Router, RouteComponentProps } from 'react-router-dom';

export type UseHistoryType = RouteComponentProps['history'];

const RouterLinkHOC = (history?: UseHistoryType) => (
    function (props: { children: React.ReactNode, href?: string }): JSX.Element {
        const { href, children } = props;

        // Use client-side navigation for slash-prefixed URLs when router history is available.
        if (href?.startsWith('/') && !href.startsWith('//') && history) {
            return (
                <Link to={href} className='cvat-notification-link'>
                    {children}
                </Link>
            );
        }

        return (<a href={href}>{children}</a>);
    });

export default function CVATMarkdown(props: { history?: UseHistoryType, children: string }): JSX.Element {
    const { children, history } = props;

    const content = (
        <ReactMarkdown
            components={{
                a: RouterLinkHOC(history),
            }}
        >
            {children}
        </ReactMarkdown>
    );

    return history ? <Router history={history}>{content}</Router> : content;
}
