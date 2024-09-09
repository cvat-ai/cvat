// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedConsensusReportData } from './server-response-types';
import User from './user';

export interface ConsensusSummary {
    frameCount: number;
    conflictCount: number;
    conflictsByType: {
        no_matching_item: number;
        no_matching_annotation: number;
        annotation_too_close: number;
        failed_label_voting: number;
    }
}

export default class ConsensusReport {
    #id: number;
    #taskID: number;
    #jobID: number | null;
    #createdDate: string;
    #assignee: User | null;
    #consensus_score: number;
    #target: string;
    #summary: Partial<SerializedConsensusReportData['summary']>;

    constructor(initialData: SerializedConsensusReportData) {
        this.#id = initialData.id;
        this.#taskID = initialData.task_id;
        this.#jobID = initialData.job_id;
        this.#createdDate = initialData.created_date;
        this.#target = initialData.target;
        this.#consensus_score = initialData.consensus_score;
        this.#summary = initialData.summary;

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

    get jobID(): number | null {
        return this.#jobID;
    }

    get createdDate(): string {
        return this.#createdDate;
    }

    get assignee(): User | null {
        return this.#assignee;
    }

    get consensus_score(): number {
        return this.#consensus_score;
    }

    get target(): string {
        return this.#target;
    }

    get summary(): ConsensusSummary {
        return {
            frameCount: this.#summary.frame_count,
            conflictCount: this.#summary.conflict_count,
            conflictsByType: {
                no_matching_item: this.#summary.conflicts_by_type?.no_matching_item,
                no_matching_annotation: this.#summary.conflicts_by_type?.no_matching_annotation,
                annotation_too_close: this.#summary.conflicts_by_type?.annotation_too_close,
                failed_label_voting: this.#summary.conflicts_by_type?.failed_label_voting,
            },
        };
    }
}
