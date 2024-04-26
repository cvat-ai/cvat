// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { omit } from 'lodash';
import Menu, { MenuProps } from 'antd/lib/menu';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo as MenuInfoType } from 'rc-menu/lib/interface';

// component is used for menu appearing as dropdown component
// the purpose is to close menu after clicking an item
export default function DropdownMenu(props: MenuProps): JSX.Element {
    const { onClick } = props;

    return (
        <Menu
            onClick={(info: MenuInfoType) => {
                // close menu
                window.document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

                if (onClick) {
                    onClick(info);
                }
            }}
            {...omit(props, 'onClick')}
        />
    );
}

// set these properties to avoid extra import from antd in other modules
DropdownMenu.Item = Menu.Item;
DropdownMenu.SubMenu = Menu.SubMenu;
DropdownMenu.Divider = Menu.Divider;

export type MenuInfo = MenuInfoType;
