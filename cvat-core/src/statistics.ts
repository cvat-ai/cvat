// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

type ImageObjectStat = Readonly<{
    track: number;
    shape: number;
}>;

type IntervalStat = Readonly<{
    count: number;
    duration: number;
    coverage: number;
}>;

type Stats = Readonly<{
    rectangle: ImageObjectStat;
    polygon: ImageObjectStat;
    polyline: ImageObjectStat;
    points: ImageObjectStat;
    ellipse: ImageObjectStat;
    cuboid: ImageObjectStat;
    skeleton: ImageObjectStat;
    mask: Readonly<{
        shape: number;
    }>;
    tag: number;
    interval: IntervalStat;
    manually: number;
    interpolated: number;
    total: number;
}>;

export default class Statistics {
    private labelData: Record<string, Stats>;
    private totalData: Stats;

    constructor(label: Statistics['labelData'], total: Statistics['totalData']) {
        this.labelData = label;
        this.totalData = total;
    }

    public get label(): Record<string, Stats> {
        return JSON.parse(JSON.stringify(this.labelData));
    }

    public get total(): Stats {
        return JSON.parse(JSON.stringify(this.totalData));
    }
}
