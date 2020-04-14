// TODO:
// add dialog window
// add button to menu
// add run and check callbacks

export function run(): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 1000);
    });
}

export function cancel(): void {

}
