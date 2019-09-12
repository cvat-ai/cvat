/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    require:false
*/

(() => {
    const PluginRegistry = require('./plugins');

    /**
        * Class describe scheme of a log object
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class Log {
        constructor(logType, continuous, details) {
            this.type = logType;
            this.continuous = continuous;
            this.details = details;
        }

        /**
            * Method closes a continue log
            * @method close
            * @memberof module:API.cvat.classes.Log
            * @readonly
            * @instance
            * @async
            * @throws {module:API.cvat.exceptions.PluginError}
        */
        async close() {
            const result = await PluginRegistry
                .apiWrapper.call(this, Log.prototype.close);
            return result;
        }
    }

    module.exports = Log;
})();
