// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import ObjectState, { SerializedData } from '../object-state';
import { ScriptingError } from '../exceptions';
import { ObjectType } from '../enums';
import type { SerializedTag } from '../server-response-types';
import { Annotation } from './annotation';

export class Tag extends Annotation {
    protected withContext(frame: number): ReturnType<Annotation['withContext']> & {
        save: (data: ObjectState) => ObjectState;
        export: () => SerializedTag;
    } {
        return {
            ...super.withContext(frame),
            save: this.save.bind(this, frame),
            export: this.toJSON.bind(this) as () => SerializedTag,
        };
    }

    // Method is used to export data to the server
    public toJSON(): SerializedTag {
        const result: SerializedTag = {
            clientID: this.clientID,
            frame: this.frame,
            label_id: this.label.id,
            source: this.source,
            group: 0, // TODO: why server requires group for tags?
            attributes: Object.keys(this.attributes).reduce((attributeAccumulator, attrId) => {
                attributeAccumulator.push({
                    spec_id: +attrId,
                    value: this.attributes[attrId],
                });

                return attributeAccumulator;
            }, []),
        };

        if (this.serverID !== null) {
            result.id = this.serverID;
        }

        return result;
    }

    public get(frame: number): Omit<Required<SerializedData>,
    'elements' | 'occluded' | 'outside' | 'rotation' | 'zOrder' |
    'points' | 'hidden' | 'pinned' | 'keyframe' | 'shapeType' |
    'parentID' | 'descriptions' | 'keyframes'
    > {
        if (frame !== this.frame) {
            throw new ScriptingError('Received frame is not equal to the frame of the shape');
        }

        return {
            objectType: ObjectType.TAG,
            clientID: this.clientID,
            serverID: this.serverID,
            lock: this.lock,
            attributes: { ...this.attributes },
            label: this.label,
            group: this.groupObject,
            color: this.color,
            updated: this.updated,
            frame,
            source: this.source,
            score: this.score,
            votes: this.votes,
            __internal: this.withContext(frame),
        };
    }

    public save(frame: number, data: ObjectState): ObjectState {
        if (frame !== this.frame) {
            throw new ScriptingError('Received frame is not equal to the frame of the tag');
        }

        if (this.lock && data.lock) {
            return new ObjectState(this.get(frame));
        }

        const updated = data.updateFlags;
        for (const readOnlyField of this.readOnlyFields) {
            updated[readOnlyField] = false;
        }

        this.validateStateBeforeSave(data, updated);

        // Now when all fields are validated, we can apply them
        if (updated.label) {
            this.saveLabel(data.label, frame);
        }

        if (updated.attributes) {
            this.saveAttributes(data.attributes, frame);
        }

        if (updated.lock) {
            this.saveLock(data.lock, frame);
        }

        if (updated.color) {
            this.saveColor(data.color, frame);
        }

        this.updateTimestamp(updated);
        updated.reset();

        return new ObjectState(this.get(frame));
    }
}
