export function stubResponseUntilCalledNtimes(response, ntimes = 1) {
    let calls = 0;
    function handle(req) {
        if (calls === ntimes) {
            calls++;
            req.continue((res) => {
                res.send(response);
            });
        } else {
            req.continue();
        }
    }
    return handle;
}
