// TODO:
// add dialog window
// add button to menu
// add run and check callbacks

type Params = {
    threshold: number;
    distance: number;
    onUpdatePercentage(percentage: number): void;
    jobID: number;
    annotations: any[];
};

export function run(params: Params): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 1000);
    });
}

export function cancel(): void {

}
