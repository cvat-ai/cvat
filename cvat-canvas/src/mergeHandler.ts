import { MergeData } from './canvasModel';

export interface MergeHandler {
    merge(mergeData: MergeData): void;
}

export class MergeHandlerImpl implements MergeHandler {
    // callback is used to notify about merging end
    private onMergeDone: (objects: any[]) => void;

    public constructor(onMergeDone: any) {
        this.onMergeDone = onMergeDone;
    }

    /* eslint-disable-next-line */
    public merge(mergeData: MergeData): void {
        throw new Error('Method not implemented.');
    }
}
