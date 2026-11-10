// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { CSSProperties } from 'react';
import { ThemeConfig } from 'antd/lib/config-provider';

const colors = {
    ink: '#1a1a1a',
    muted: '#595959',
    white: '#ffffff',
    surface: '#f7f7f7',
    border: '#dedede',
    orange: '#ff7300',
    'orange-hover': '#ff4800',
    'action-orange': '#c45100',
    'action-orange-hover': '#a84400',
    red: '#e10602',
    'deep-red': '#be0300',
    amber: '#ffa800',
    'badge-bg': '#fff1d6',
    'neutral-badge': '#eeeeee',
    'media-bg': '#f3f3f3',
    'muted-icon': '#8c8c8c',
    'support-surface': '#fff5e8',
    'support-border': '#f1cfaa',
};

export const WHATS_NEW_THEME: ThemeConfig = {
    token: {
        colorPrimary: colors.orange,
        colorPrimaryHover: colors['orange-hover'],
        colorPrimaryActive: colors['orange-hover'],
        colorInfo: colors.orange,
        colorWarning: colors.amber,
        colorError: colors['deep-red'],
        colorErrorHover: colors.red,
        colorText: colors.ink,
        colorTextHeading: colors.ink,
        colorTextSecondary: colors.muted,
        colorBorder: colors.border,
        colorBgContainer: colors.white,
        colorBgElevated: colors.white,
        colorLink: colors.ink,
        colorLinkHover: colors['deep-red'],
        colorLinkActive: colors.red,
    },
    components: {
        Button: {
            borderRadius: 8,
            fontWeight: 600,
            primaryColor: colors.white,
            colorPrimary: colors['action-orange'],
            colorPrimaryHover: colors['action-orange-hover'],
            colorPrimaryActive: colors['deep-red'],
            defaultHoverColor: colors['action-orange'],
            defaultHoverBorderColor: colors.orange,
            defaultActiveColor: colors['deep-red'],
            defaultActiveBorderColor: colors.red,
        },
    },
};

export const WHATS_NEW_STYLE = Object.fromEntries(
    Object.entries(colors).map(([name, value]) => [`--cvat-updates-${name}`, value]),
) as CSSProperties;
