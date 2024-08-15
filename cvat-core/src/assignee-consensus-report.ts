// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedAssigneeConsensusReportData } from './server-response-types';
import User from './user';

export default class AssigneeConsensusReport {
    #id: number;
    #taskID: number;
    #assignee: User;
    #consensusScore: number;
    #conflictCount: number;
    #consensusReportID: number;

    constructor(initialData: SerializedAssigneeConsensusReportData) {
        this.#id = initialData.id;
        this.#taskID = initialData.task_id;
        this.#consensusScore = initialData.consensus_score;
        this.#consensusReportID = initialData.consensus_report_id;
        this.#conflictCount = initialData.conflict_count;

        if (initialData.assignee) {
            this.#assignee = new User(initialData.assignee);
        } else {
            this.#assignee = null;
        }
    }

    get id(): number {
        return this.#id;
    }

    get taskID(): number {
        return this.#taskID;
    }

    get assignee(): User {
        return this.#assignee;
    }

    get consensusScore(): number {
        return this.#consensusScore;
    }

    get conflictCount(): number {
        return this.#conflictCount;
    }

    get consensusReportID(): number {
        return this.#consensusReportID;
    }
}
