// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import ObjectState, { type SerializedData } from '../object-state';
import { ScriptingError } from '../exceptions';
import { ObjectType } from '../enums';
import type { SerializedTag } from '../server-response-types';
import { ImageObject } from './image-object';
import { serializeAttributes } from './utils';

export class Tag extends ImageObject {
    protected withContext(): ReturnType<ImageObject['withContext']> & {
        save: (data: ObjectState) => ObjectState;
        export: () => SerializedTag;
    } {
        return {
            ...super.withContext(),
            save: this.save.bind(this),
            export: this.toJSON.bind(this),
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
            attributes: serializeAttributes(this.attributes),
        };

        if (typeof this._serverId === 'number') {
            result.id = this._serverId;
        }

        return result;
    }

    public get(frame: number): Omit<Required<SerializedData>,
    'elements' | 'occluded' | 'outside' | 'rotation' | 'zOrder' |
    'points' | 'hidden' | 'pinned' | 'keyframe' | 'shapeType' |
    'parentID' | 'descriptions' | 'keyframes' | 'score' | 'votes'
    > {
        if (frame !== this.frame) {
            throw new ScriptingError('Received frame is not equal to the frame of the shape');
        }

        return {
            objectType: ObjectType.TAG,
            clientID: this.clientID,
            serverID: this._serverId ?? null,
            lock: this.lock,
            attributes: Object.fromEntries(this.attributes),
            label: this.label,
            group: this.groupObject,
            color: this.color,
            updated: this.updated,
            frame,
            source: this.source,
            __internal: this.withContext(),
        };
    }

    public updateFromServerResponse(body: { id: number }): void {
        this._serverId = body.id;
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
            delete updated[readOnlyField];
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
