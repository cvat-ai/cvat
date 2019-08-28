import { SplitData } from './canvasModel';

export interface SplitHandler {
    split(splitData: SplitData): void;
}

export class SplitHandlerImpl implements SplitHandler {
    // callback is used to notify about splitting end
    private onSplitDone: (object: any) => void;

    public constructor(onSplitDone: any) {
        this.onSplitDone = onSplitDone;
    }

    /* eslint-disable-next-line */
    public split(splitData: SplitData): void {
        throw new Error('Method not implemented.');
    }
}
