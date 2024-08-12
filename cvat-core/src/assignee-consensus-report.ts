// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedAssigneeConsensusReportData } from './server-response-types';
import User from './user';

export default class AssigneeConsensusReport {
    #id: number;
    #taskID: number;
    #assignee: User | null;
    #consensus_score: number;
    #consensus_report_id: number;

    constructor(initialData: SerializedAssigneeConsensusReportData) {
        this.#id = initialData.id;
        this.#taskID = initialData.task_id;
        this.#consensus_score = initialData.consensus_score;
        this.#consensus_report_id = initialData.consensus_report_id;

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

    get assignee(): User | null {
        return this.#assignee;
    }

    get assignee_id(): number {
        return this.#assignee ? this.#assignee.id : 0;
    }

    get consensus_score(): number {
        return this.#consensus_score;
    }

    get consensus_report_id(): number {
        return this.#consensus_report_id;
    }
}
