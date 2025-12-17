import { ObjectState } from 'cvat-core-wrapper';
import { ColorBy } from 'reducers';

export function getObjectStateColor(state: ObjectState, colorBy: ColorBy): {
    hex: string;
    rgbComponents: () => string;
} {
    let color = '';
    try {
        if (colorBy === ColorBy.INSTANCE) {
            color = state.color;
        } else if (colorBy === ColorBy.GROUP) {
            color = state.group?.color ?? '#000000';
        } else if (colorBy === ColorBy.LABEL) {
            color = state.label.color as string;
        }

        color = color.slice(1);
        if (color.length === 3) {
            color = color.split('').map((ch) => ch + ch).join('');
        }

        if (!/^([0-9a-f]{6})$/i.test(color)) {
            throw new Error('Invalid hex color format');
        }
    } catch (_: unknown) {
        // fallback
        color = 'ffffff';
    }

    const convert = (start: number, stop: number): string => (
        `${parseInt(color.slice(start, stop), 16)}`
    );

    return {
        hex: `#${color}`,
        rgbComponents() {
            return `${convert(0, 2)}, ${convert(2, 4)}, ${convert(4, 6)}`;
        },
    };
}
