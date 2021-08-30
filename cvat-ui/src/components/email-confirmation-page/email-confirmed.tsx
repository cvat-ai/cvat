// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Component for displaying email confirmation message and then redirecting to the loginpage
 */
class EmailConfirmationMessage extends React.Component {
    componentDidMount() {
        let counter = 5;
        const id = setInterval(() => {
            counter--;
            document.getElementById('countID').innerHTML = counter;

            if (counter === 0) {
                try {
                    document.getElementById('link').click();
                } catch (error) {
                    // console.log(error);

                }
                clearInterval(id);
            }
        }, 1000);
        document.getElementById('link').onclick = function () { clearInterval(id); };
    }
    render() {
        return (
            <div>
                <h1>Your email is confirmed</h1>
                <p>
                    Redirecting you in &nbsp;
                    <span id='countID'>5</span>
                    s
                </p>
                <Link to='/auth/login' id='link'>Or click this link</Link>
            </div>
        );
    }
}

export default EmailConfirmationMessage;
