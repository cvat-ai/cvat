import { InteractionResult } from 'cvat-canvas-wrapper';

const reducer = (acc: number[][], _: number, index: number, array: number[]): number[][] => {
    if (!(index % 2)) { // 0, 2, 4
        acc.push([
            array[index],
            array[index + 1],
        ]);
    }
    return acc;
};

export default {
    shapeType: 'points', // also 'rectangle' is avaliable
    crosshair: true,
    result: 'immediate', // also 'immediate' is avaliable
    numberOfShapes: undefined, // can restrict number of points/rectangles
    convertToSever: (shapes: InteractionResult[]) => (
        // converts output of cvat-canvas to server input
        {
            points: shapes.filter((shape: InteractionResult): boolean => shape.shapeType === 'points')
                .map((shape: InteractionResult): number[] => shape.points)
                .flat().reduce(reducer, []),
        }
    ),
};
