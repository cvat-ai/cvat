// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedAnnotationConsensusConflictData, SerializedConsensusConflictData } from './server-response-types';
import { ObjectType } from './enums';

export enum ConsensusConflictType {
    NO_MATCHING_ITEM = 'no_matching_item',
    NO_MATCHING_ANNOTATION = 'no_matching_annotation',
    ANNOTATION_TOO_CLOSE = 'annotation_too_close',
    FAILED_LABEL_VOTING = 'failed_label_voting',
}

export class AnnotationConflict {
    #jobID: number;
    #serverID: number;
    #type: ObjectType;
    #shapeType: string | null;
    #description: string;
    #conflictType: ConsensusConflictType;

    constructor(initialData: SerializedAnnotationConsensusConflictData) {
        this.#jobID = initialData.job_id;
        this.#serverID = initialData.obj_id;
        this.#type = initialData.type;
        this.#shapeType = initialData.shape_type;
        this.#conflictType = initialData.conflict_type as ConsensusConflictType;

        const desc = this.#conflictType.split('_').join(' ');
        this.#description = desc.charAt(0).toUpperCase() + desc.slice(1);
    }

    get jobID(): number {
        return this.#jobID;
    }

    get serverID(): number {
        return this.#serverID;
    }

    get type(): ObjectType {
        return this.#type;
    }

    get shapeType(): string | null {
        return this.#shapeType;
    }

    get conflictType(): ConsensusConflictType {
        return this.#conflictType;
    }

    get description(): string {
        return this.#description;
    }
}

export default class ConsensusConflict {
    #id: number;
    #frame: number;
    #type: ConsensusConflictType;
    #annotationConflicts: AnnotationConflict[];
    #description: string;

    constructor(initialData: SerializedConsensusConflictData) {
        this.#id = initialData.id;
        this.#frame = initialData.frame;
        this.#type = initialData.type as ConsensusConflictType;
        this.#annotationConflicts = initialData.annotation_ids
            .map((rawData: SerializedAnnotationConsensusConflictData) => new AnnotationConflict({
                ...rawData,
                conflict_type: initialData.type,
            }));

        const desc = initialData.type.split('_').join(' ');
        this.#description = desc.charAt(0).toUpperCase() + desc.slice(1);
    }

    get id(): number {
        return this.#id;
    }

    get frame(): number {
        return this.#frame;
    }

    get type(): ConsensusConflictType {
        return this.#type;
    }

    get annotationConflicts(): AnnotationConflict[] {
        return this.#annotationConflicts;
    }

    get description(): string {
        return this.#description;
    }

    set description(newDescription: string) {
        this.#description = newDescription;
    }
}
