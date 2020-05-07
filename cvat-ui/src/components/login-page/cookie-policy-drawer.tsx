
// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, {useState, useEffect} from 'react';
import Drawer from 'antd/lib/drawer';
import Paragraph from 'antd/lib/typography/Paragraph';
import Button from 'antd/lib/button/button';


function CookieDrawer(): JSX.Element {
    const [drawerVisiable, setDrawerVisiable] = useState(false);

    useEffect(() => {
        const policyWasShown = localStorage.getItem('cookiePolicyShown');
        if (policyWasShown === null) {
            setDrawerVisiable(true);
        }
    }, [])

    const onClose = () => {
        localStorage.setItem('cookiePolicyShown', 'true');
        setDrawerVisiable(false);
    }

    return (
        <Drawer
            title='About Cookies on this site:'
            placement='bottom'
            closable={false}
            onClose={onClose}
            visible={drawerVisiable}
            height={200}
            destroyOnClose
        >
            <Paragraph>
                This site uses cookies for functionality, analytics, and advertising purposes as described in our Cookie and Similar Technologies Notice.
                To see what cookies we serve and set your preferences, please visit our <a href='https://www.intel.com/cookies'>Cookie Consent Tool</a>.
                By continuing to use our website, you agree to our use of cookies.
            </Paragraph>
            <Button onClick={onClose} size='large' type='primary'>
                Accept
            </Button>
        </Drawer>
    );
}

export default CookieDrawer;
