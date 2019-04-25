/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
    global:false
    encodeURIComponent:false
*/

(() => {
    const {
        Exception,
        ServerInteractionException,
    } = require('./exceptions');

    class ServerProxy {
        constructor() {
            const Cookie = require('js-cookie');
            const Axios = require('axios');

            function setCSRFHeader(header) {
                Axios.defaults.headers.delete['X-CSRFToken'] = header;
                Axios.defaults.headers.patch['X-CSRFToken'] = header;
                Axios.defaults.headers.post['X-CSRFToken'] = header;
                Axios.defaults.headers.put['X-CSRFToken'] = header;
            }

            async function about() {
                const { host } = global.cvat.config;
                const { api } = global.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${host}/api/${api}/server/about`, {
                        proxy: global.cvat.config.proxy,
                    });
                } catch (errorData) {
                    throw new ServerInteractionException();
                }

                return response;
            }

            async function share(directory) {
                const { host } = global.cvat.config;
                const { api } = global.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${host}/api/${api}/server/share?directory=${directory}`, {
                        proxy: global.cvat.config.proxy,
                    });
                } catch (errorData) {
                    throw new ServerInteractionException();
                }

                return response;
            }

            async function exception(exceptionObject) {
                const { host } = global.cvat.config;
                const { api } = global.cvat.config;

                try {
                    await Axios.post(`${host}/api/${api}/server/exception`, JSON.stringify(exceptionObject), {
                        proxy: global.cvat.config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    throw new ServerInteractionException();
                }
            }

            async function authentificate(username, password) {
                function setCookie(response) {
                    if (response.headers['set-cookie']) {
                        // Browser itself setup cookie and header is none
                        // In NodeJS we need do it manually
                        let cookies = '';
                        for (let cookie of response.headers['set-cookie']) {
                            [cookie] = cookie.split(';'); // truncate extra information
                            const name = cookie.split('=')[0];
                            const value = cookie.split('=')[1];
                            if (name === 'csrftoken') {
                                setCSRFHeader(value);
                            }
                            Cookie.set(name, value);
                            cookies += `${cookie};`;
                        }

                        Axios.defaults.headers.common.Cookie = cookies;
                    } else {
                        // Browser code. We need set additinal header for authentification
                        const csrftoken = Cookie.get('csrftoken');
                        if (csrftoken) {
                            setCSRFHeader(csrftoken);
                        } else {
                            throw new Exception();
                        }
                    }
                }

                let csrf = null;
                try {
                    csrf = await Axios.get(`${global.cvat.config.host}/auth/login`, {
                        proxy: global.cvat.config.proxy,
                    });
                } catch (errorData) {
                    throw new ServerInteractionException();
                }

                setCookie(csrf);

                const authentificationData = ([
                    `${encodeURIComponent('username')}=${encodeURIComponent(username)}`,
                    `${encodeURIComponent('password')}=${encodeURIComponent(password)}`,
                ]).join('&').replace(/%20/g, '+');

                let authentificationResponse = null;
                try {
                    authentificationResponse = await Axios.post(
                        `${global.cvat.config.host}/auth/login`,
                        authentificationData,
                        {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            proxy: global.cvat.config.proxy,
                            // do not redirect to a dashboard,
                            // otherwise we don't get a session id in a response
                            maxRedirects: 0,
                        },
                    );
                } catch (errorData) {
                    if (errorData.response.status === 302) {
                        // Redirection code expected
                        authentificationResponse = errorData.response;
                    } else {
                        throw new ServerInteractionException();
                    }
                }

                setCookie(authentificationResponse);
            }

            async function getTasks(filter = '') {
                const { host } = global.cvat.config;
                const { api } = global.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${host}/api/${api}/tasks?${filter}`, {
                        proxy: global.cvat.config.proxy,
                    });
                } catch (errorData) {
                    throw new ServerInteractionException();
                }

                return response.data;
            }

            async function getTaskJobs(taskID) {
                const { host } = global.cvat.config;
                const { api } = global.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${host}/api/${api}/tasks/${taskID}/jobs`, {
                        proxy: global.cvat.config.proxy,
                    });
                } catch (errorData) {
                    throw new ServerInteractionException();
                }

                return response.data;
            }

            async function getJob(jobID) {
                const { host } = global.cvat.config;
                const { api } = global.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${host}/api/${api}/jobs/${jobID}`, {
                        proxy: global.cvat.config.proxy,
                    });
                } catch (errorData) {
                    throw new ServerInteractionException();
                }

                return response.data;
            }

            async function getUsers() {
                const { host } = global.cvat.config;
                const { api } = global.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${host}/api/${api}/users`, {
                        proxy: global.cvat.config.proxy,
                    });
                } catch (errorData) {
                    throw new ServerInteractionException();
                }

                return response.data;
            }

            async function getSelf() {
                const { host } = global.cvat.config;
                const { api } = global.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${host}/api/${api}/users/self`, {
                        proxy: global.cvat.config.proxy,
                    });
                } catch (errorData) {
                    throw new ServerInteractionException();
                }

                return response.data;
            }

            // Set csrftoken header from browser cookies if it exists
            // NodeJS env returns 'undefined'
            // So in NodeJS we need authentificate after each run
            const csrftoken = Cookie.get('csrftoken');
            if (csrftoken) {
                setCSRFHeader(csrftoken);
            }

            Object.defineProperties(this, {
                server: {
                    value: Object.freeze({
                        about,
                        share,
                        exception,
                        authentificate,
                    }),
                    writable: false,
                },

                tasks: {
                    value: Object.freeze({
                        get: getTasks,
                    }),
                    writable: false,
                },

                jobs: {
                    value: Object.freeze({
                        getTaskJobs,
                        getJob,
                    }),
                    writable: false,
                },

                users: {
                    value: Object.freeze({
                        getUsers,
                        getSelf,
                    }),
                    writable: false,
                },
            });
        }
    }

    const serverProxy = new ServerProxy();
    module.exports = {
        serverProxy,
    };
})();
