// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import {Redirect, useParams} from "react-router";
import {useCookies } from "react-cookie";

export default function LoginWithTokenComponent(){
    const { sessionId, token } = useParams()
    const [cookies, setCookie] = useCookies(['sessionid', 'csrftoken'])
    const expires = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    setCookie('sessionid', sessionId, {path: '/', expires })
    setCookie('csrftoken', token, {path: '/', expires})

    if ( cookies['sessionid'] && cookies['csrftoken']) {
        window.location.reload();
        <Redirect to="/tasks" />
    }
    return(<></>);
};
