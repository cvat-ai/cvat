/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

(() => {
    /**
        * Class representing an attribute
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class Attribute {
        constructor() {
            this.b = 5;
        }
    }

    /**
        * Class representing a label
        * @memberof module:API.cvat.classes
        * @hideconstructor
    */
    class Label {
        constructor() {
            this.a = 5;
        }
    }

    module.exports = {
        Attribute,
        Label,
    };
})();
