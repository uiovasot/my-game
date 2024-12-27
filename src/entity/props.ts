import {Color} from '../definitions/color';
import {Vector} from '../physics/vector';

export interface PropSetting {
    offset: Vector;
    angle: number;
    fixedAngle: boolean;
    spin: number;
    spin2: number;
    color: Color | string;
    border: Color | string;
    size: number;
    sides: number | string | Vector[];
    strokeWidth: number;
    alpha: number;
    layer: number;
}

export class Prop {
    public setting: PropSetting = {
        offset: new Vector(),
        angle: 0,
        fixedAngle: false,
        spin: 0,
        spin2: 0,
        color: Color.TeamColor,
        border: Color.AutoBorder,
        size: 5,
        sides: 0,
        strokeWidth: 4,
        alpha: 1,
        layer: 1,
    };
}
