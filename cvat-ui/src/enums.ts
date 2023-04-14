import {
    blue, cyan, orange, red, yellow,
} from '@ant-design/colors';

export enum Priority {
    LOWEST = 10,
    LOW = 20,
    MEDIUM = 30,
    HIGH = 40,
    HIGHEST = 50,
}

export const PriorityColors = new Map([
    [Priority.LOWEST, blue.primary],
    [Priority.LOW, cyan.primary],
    [Priority.MEDIUM, yellow.primary],
    [Priority.HIGH, orange.primary],
    [Priority.HIGHEST, red.primary],
]);
