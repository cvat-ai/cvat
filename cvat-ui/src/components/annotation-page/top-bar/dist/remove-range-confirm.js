"use strict";
// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT
exports.__esModule = true;
var react_1 = require("react");
var react_2 = require("react");
var modal_1 = require("antd/lib/modal");
var input_number_1 = require("antd/lib/input-number");
var Text_1 = require("antd/lib/typography/Text");
var math_1 = require("utils/math");
var checkbox_1 = require("antd/lib/checkbox");
function RemoveRangeConfirmComponent(props) {
    var visible = props.visible, stopFrame = props.stopFrame, removeinRange = props.removeinRange, cancel = props.cancel;
    var minStartFrames = 0;
    var _a = react_2.useState(0), startFrame = _a[0], managestart = _a[1];
    var _b = react_2.useState(1), endFrame = _b[0], manageend = _b[1];
    var _c = react_2.useState(false), deltrack_keyframes_only = _c[0], managedeltrack_keyframes_only = _c[1];
    var minEndFrames = Math.max(startFrame, 1);
    return (react_1["default"].createElement(modal_1["default"], { okType: 'primary', okText: 'Yes', cancelText: 'Cancel', onOk: function () {
            removeinRange(startFrame, endFrame, deltrack_keyframes_only);
            cancel();
        }, onCancel: cancel, title: 'Confirm to remove annotations in range', visible: visible },
        react_1["default"].createElement("div", { className: 'cvat-propagate-confirm' },
            react_1["default"].createElement(Text_1["default"], null, "Do you want to remove the annotations on"),
            react_1["default"].createElement(input_number_1["default"], { className: 'cvat-propagate-confirm-object-on-frames', size: 'small', min: minStartFrames, max: stopFrame, value: startFrame, onChange: function (value) {
                    if (typeof value !== 'undefined') {
                        value = Math.floor(math_1.clamp(+value, 0, stopFrame - 1));
                        managestart(value);
                    }
                } }),
            startFrame > 1 ? react_1["default"].createElement(Text_1["default"], null, " frames ") : react_1["default"].createElement(Text_1["default"], null, " frame "),
            react_1["default"].createElement(Text_1["default"], null, "up to the "),
            react_1["default"].createElement(input_number_1["default"], { className: 'cvat-propagate-confirm-object-up-to-frame', size: 'small', min: minEndFrames, max: stopFrame, value: endFrame, onChange: function (value) {
                    if (typeof value !== 'undefined') {
                        value = Math.floor(math_1.clamp(+value, 1, stopFrame));
                        manageend(value);
                    }
                } }),
            react_1["default"].createElement(Text_1["default"], null, "frame"),
            ",",
            react_1["default"].createElement("br", null),
            react_1["default"].createElement("br", null),
            react_1["default"].createElement(checkbox_1["default"], { onChange: function () { managedeltrack_keyframes_only(!deltrack_keyframes_only); } }, "Delete only track keyframes"))));
}
exports["default"] = RemoveRangeConfirmComponent;
