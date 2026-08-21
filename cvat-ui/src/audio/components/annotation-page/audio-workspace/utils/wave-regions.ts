// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { Region } from 'wavesurfer.js/dist/plugins/regions';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';

import { clientIDFromWaveRegionId } from './audio-interval';

export function getIntervalRegionsByClientID(regionsPlugin: RegionsPlugin): Map<number, Region> {
    const regionsByID = new Map<number, Region>();
    regionsPlugin.getRegions().forEach((region) => {
        const clientID = clientIDFromWaveRegionId(region.id);
        if (clientID !== null) regionsByID.set(clientID, region);
    });
    return regionsByID;
}
