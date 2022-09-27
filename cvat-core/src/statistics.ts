// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

interface ObjectStatistics {
    track: number;
    shape: number;
}

interface StatisticsBody {
    rectangle: ObjectStatistics;
    polygon: ObjectStatistics;
    polyline: ObjectStatistics;
    points: ObjectStatistics;
    ellipse: ObjectStatistics;
    cuboid: ObjectStatistics;
    skeleton: ObjectStatistics;
    mask: {
        shape: number;
    };
    tag: number;
    manually: number;
    interpolated: number;
    total: number;
}

export default class Statistics {
    private labelData: Record<string, StatisticsBody>;
    private totalData: StatisticsBody;

    constructor(label: Statistics['labelData'], total: Statistics['totalData']) {
        this.labelData = label;
        this.totalData = total;
    }

    public get label(): Record<string, StatisticsBody> {
        return JSON.parse(JSON.stringify(this.labelData));
    }

    public get total(): StatisticsBody {
        return JSON.parse(JSON.stringify(this.totalData));
    }
}
