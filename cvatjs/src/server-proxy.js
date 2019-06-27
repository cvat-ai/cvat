/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
    encodeURIComponent:false
*/

(() => {
    class ServerProxy {
        constructor() {
            const Cookie = require('js-cookie');
            const Axios = require('axios');

            function setCSRFHeader(header) {
                Axios.defaults.headers.delete['X-CSRFToken'] = header;
                Axios.defaults.headers.patch['X-CSRFToken'] = header;
                Axios.defaults.headers.post['X-CSRFToken'] = header;
                Axios.defaults.headers.put['X-CSRFToken'] = header;

                // Allows to move authentification headers to backend
                Axios.defaults.withCredentials = true;
            }

            async function about() {
                const { backendAPI } = window.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/server/about`, {
                        proxy: window.cvat.config.proxy,
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not get "about" information from the server',
                        code,
                    );
                }

                return response.data;
            }

            async function share(directory) {
                const { backendAPI } = window.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/server/share?directory=${directory}`, {
                        proxy: window.cvat.config.proxy,
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not get "share" information from the server',
                        code,
                    );
                }

                return response.data;
            }

            async function exception(exceptionObject) {
                const { backendAPI } = window.cvat.config;

                try {
                    await Axios.post(`${backendAPI}/server/exception`, JSON.stringify(exceptionObject), {
                        proxy: window.cvat.config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not send an exception to the server',
                        code,
                    );
                }
            }

            async function login(username, password) {
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
                        let csrftoken = response.data.csrf;
                        if (csrftoken) {
                            setCSRFHeader(csrftoken);
                            Cookie.set('csrftoken', csrftoken);
                        } else {
                            csrftoken = Cookie.get('csrftoken');
                            if (csrftoken) {
                                setCSRFHeader(csrftoken);
                            } else {
                                throw new window.cvat.exceptions.ScriptingError(
                                    'An environment has been detected as a browser'
                                    + ', but CSRF token has not been found in cookies',
                                );
                            }
                        }
                    }
                }

                const host = window.cvat.config.backendAPI.slice(0, -7);
                let csrf = null;
                try {
                    csrf = await Axios.get(`${host}/auth/csrf`, {
                        proxy: window.cvat.config.proxy,
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not get CSRF token from a server',
                        code,
                    );
                }

                setCookie(csrf);

                const authentificationData = ([
                    `${encodeURIComponent('username')}=${encodeURIComponent(username)}`,
                    `${encodeURIComponent('password')}=${encodeURIComponent(password)}`,
                ]).join('&').replace(/%20/g, '+');

                let authentificationResponse = null;
                try {
                    authentificationResponse = await Axios.post(
                        `${host}/auth/login`,
                        authentificationData,
                        {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            proxy: window.cvat.config.proxy,
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
                        const code = errorData.response
                            ? errorData.response.status : errorData.code;
                        throw new window.cvat.exceptions.ServerError(
                            'Could not login on a server',
                            code,
                        );
                    }
                }

                setCookie(authentificationResponse);
            }

            async function getTasks(filter = '') {
                const { backendAPI } = window.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/tasks?${filter}`, {
                        proxy: window.cvat.config.proxy,
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not get tasks from a server',
                        code,
                    );
                }

                response.data.results.count = response.data.count;
                return response.data.results;
            }

            async function saveTask(id, taskData) {
                const { backendAPI } = window.cvat.config;

                try {
                    await Axios.patch(`${backendAPI}/tasks/${id}`, JSON.stringify(taskData), {
                        proxy: window.cvat.config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not save the task on the server',
                        code,
                    );
                }
            }

            async function deleteTask(id) {
                const { backendAPI } = window.cvat.config;

                try {
                    await Axios.delete(`${backendAPI}/tasks/${id}`);
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not delete the task from the server',
                        code,
                    );
                }
            }

            async function createTask(taskData, files, onUpdate) {
                const { backendAPI } = window.cvat.config;

                async function wait(id) {
                    return new Promise((resolve, reject) => {
                        async function checkStatus() {
                            try {
                                const response = await Axios.get(`${backendAPI}/tasks/${id}/status`);
                                if (['Queued', 'Started'].includes(response.data.state)) {
                                    if (response.data.message !== '') {
                                        onUpdate(response.data.message);
                                    }
                                    setTimeout(checkStatus, 1000);
                                } else if (response.data.state === 'Finished') {
                                    resolve();
                                } else if (response.data.state === 'Failed') {
                                    // If request has been successful, but task hasn't been created
                                    // Then passed data is wrong and we can pass code 400
                                    reject(new window.cvat.exceptions.ServerError(
                                        'Could not create the task on the server',
                                        400,
                                    ));
                                } else {
                                    // If server has another status, it is unexpected
                                    // Therefore it is server error and we can pass code 500
                                    reject(new window.cvat.exceptions.ServerError(
                                        `Unknown task state has been recieved: ${response.data.state}`,
                                        500,
                                    ));
                                }
                            } catch (errorData) {
                                const code = errorData.response
                                    ? errorData.response.status : errorData.code;

                                reject(new window.cvat.exceptions.ServerError(
                                    'Data uploading error occured',
                                    code,
                                ));
                            }
                        }

                        setTimeout(checkStatus, 1000);
                    });
                }

                const batchOfFiles = new window.FormData();
                for (const key in files) {
                    if (Object.prototype.hasOwnProperty.call(files, key)) {
                        for (let i = 0; i < files[key].length; i++) {
                            batchOfFiles.append(`${key}[${i}]`, files[key][i]);
                        }
                    }
                }

                let response = null;

                onUpdate('The task is being created on the server..');
                try {
                    response = await Axios.post(`${backendAPI}/tasks`, JSON.stringify(taskData), {
                        proxy: window.cvat.config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not put task to the server',
                        code,
                    );
                }

                onUpdate('The data is being uploaded to the server..');
                try {
                    await Axios.post(`${backendAPI}/tasks/${response.data.id}/data`, batchOfFiles, {
                        proxy: window.cvat.config.proxy,
                    });
                } catch (errorData) {
                    deleteTask(response.data.id);
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not put data to the server',
                        code,
                    );
                }

                try {
                    await wait(response.data.id);
                } catch (createException) {
                    deleteTask(response.data.id);
                    throw createException;
                }


                const createdTask = await getTasks(`?id=${response.id}`);
                return createdTask[0];
            }

            async function getJob(jobID) {
                const { backendAPI } = window.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/jobs/${jobID}`, {
                        proxy: window.cvat.config.proxy,
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not get jobs from a server',
                        code,
                    );
                }

                return response.data;
            }

            async function saveJob(id, jobData) {
                const { backendAPI } = window.cvat.config;

                try {
                    await Axios.patch(`${backendAPI}/jobs/${id}`, JSON.stringify(jobData), {
                        proxy: window.cvat.config.proxy,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not save the job on the server',
                        code,
                    );
                }
            }

            async function getUsers() {
                const { backendAPI } = window.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/users`, {
                        proxy: window.cvat.config.proxy,
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not get users from a server',
                        code,
                    );
                }

                return response.data.results;
            }

            async function getSelf() {
                const { backendAPI } = window.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/users/self`, {
                        proxy: window.cvat.config.proxy,
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        'Could not get users from a server',
                        code,
                    );
                }

                return response.data;
            }

            async function getFrame(tid, frame) {
                const { backendAPI } = window.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/tasks/${tid}/frames/${frame}`, {
                        proxy: window.cvat.config.proxy,
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        `Could not get frame ${frame} for a task ${tid} from a server`,
                        code,
                    );
                }

                return response.data;
            }

            async function getMeta(tid) {
                const { backendAPI } = window.cvat.config;

                let response = null;
                try {
                    response = await Axios.get(`${backendAPI}/tasks/${tid}/frames/meta`, {
                        proxy: window.cvat.config.proxy,
                    });
                } catch (errorData) {
                    const code = errorData.response ? errorData.response.status : errorData.code;
                    throw new window.cvat.exceptions.ServerError(
                        `Could not get frame meta info for a task ${tid} from a server`,
                        code,
                    );
                }

                return response.data;
            }

            // Set csrftoken header from browser cookies if it exists
            // NodeJS env returns 'undefined'
            // So in NodeJS we need login after each run
            const csrftoken = Cookie.get('csrftoken');
            if (csrftoken) {
                setCSRFHeader(csrftoken);
            }

            Object.defineProperties(this, Object.freeze({
                server: {
                    value: Object.freeze({
                        about,
                        share,
                        exception,
                        login,
                    }),
                    writable: false,
                },

                tasks: {
                    value: Object.freeze({
                        getTasks,
                        saveTask,
                        createTask,
                        deleteTask,
                    }),
                    writable: false,
                },

                jobs: {
                    value: Object.freeze({
                        getJob,
                        saveJob,
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

                frames: {
                    value: Object.freeze({
                        getFrame,
                        getMeta,
                    }),
                    writable: false,
                },
            }));
        }
    }

    const serverProxy = new ServerProxy();
    module.exports = serverProxy;
})();
