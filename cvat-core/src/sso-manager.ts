// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Axios = require('axios');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const store = require('store');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('./config');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ServerError } = require('./exceptions');

class SSOManager {
    async validate(accessCode: string) {
        let response = null;
        const ssoBase = `${config.backendAPI}`;

        try {
            const data = JSON.stringify({
                code: accessCode,
            });
            const postConfig = {
                baseURL: ssoBase,
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            response = await Axios.post(`/auth/${config.socialSSO}`, data, postConfig);
        } catch (errorData) {
            if (errorData.response) {
                const message = `${errorData.message}. ${JSON.stringify(errorData.response.data) || ''}.`;
                return new ServerError(message, errorData.response.status);
            }

            // Server is unavailable (no any response)
            const unavailableMessage = `${errorData.message}.`; // usually is "Error Network"
            return new ServerError(unavailableMessage, 0);
        }
        console.log('Got authentication response');
        const accessToken = response.data.key;
        if (response.headers['set-cookie']) {
            // Browser itself setup cookie and header is none
            // In NodeJS we need do it manually
            const cookies = response.headers['set-cookie'].join(';');
            Axios.defaults.headers.common.Cookie = cookies;
        }
        store.set('token', accessToken);
        const oneDay = 86400;
        const expireTime = (`${Date.now() + oneDay}`);

        return {
            token: accessToken,
            expireAt: expireTime,
        };
    }
}

module.exports = new SSOManager();
