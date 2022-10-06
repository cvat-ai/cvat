// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

const {
    ssoDummyData
} = require('./dummy-data.mock');

class SSOManager {
    async validate(code) {
        return JSON.parse(JSON.stringify(ssoDummyData));
    }
}

const ssoManager = new SSOManager();
module.exports = ssoManager;