import { GroupData } from './canvasModel';

export interface GroupHandler {
    group(groupData: GroupData): void;
}

export class GroupHandlerImpl implements GroupHandler {
    // callback is used to notify about grouping end
    private onGroupDone: (objects: any[], reset: boolean) => void;

    public constructor(onGroupDone: any) {
        this.onGroupDone = onGroupDone;
    }

    /* eslint-disable-next-line */
    public group(groupData: GroupData): void {
        throw new Error('Method not implemented.');
    }
}
