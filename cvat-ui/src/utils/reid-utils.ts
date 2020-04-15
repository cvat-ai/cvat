// TODO:
// add run and check callbacks

// когда запускаем

type Params = {
    threshold: number;
    distance: number;
    onUpdatePercentage(percentage: number): void;
    jobID: number;
    annotations: any;
};

export function run(params: Params): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 1000);
    });
}

export function cancel(jobID: number): void {

}
