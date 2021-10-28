// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

export function generateString(countPointsToMove, arrow) {
    let action = '';
    for (let i = 0; i < countPointsToMove; i++) {
        action += `{${arrow}}`;
    }
    return action;
}
