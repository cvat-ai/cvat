export type Pick2<T, K1 extends keyof T, K2 extends keyof T[K1]> = {
    [P1 in K1]: {
        [P2 in K2]: (T[K1])[P2];
    };
};
