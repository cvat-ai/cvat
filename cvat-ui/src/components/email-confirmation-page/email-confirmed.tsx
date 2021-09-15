// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import './styles.scss';
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

            <section className='ant-layout'>
                <main className='ant-layout-content'>
                    <div className='ant-row ant-row-center ant-row-middle' id='email-cnf-container'>
                        <div className='ant-col ant-col-xs-14 ant-col-sm-14 ant-col-md-10 ant-col-lg-4 ant-col-xl-4'>
                            <h1>Your email is confirmed</h1>
                            <p>
                                Redirecting you in &nbsp;
                                <span id='countID'>5</span>
                                s
                            </p>
                            <Link to='/auth/login' id='link'>Or click this link</Link>
                        </div>
                    </div>
                </main>
            </section>

        );
    }
}

export default EmailConfirmationMessage;
