import {Color} from '@/definitions/color';
import {Class} from '@/entity/class';
import {SlowCircleMove, ControllerMaker, Nearest} from '@/entity/controller';
import {Vector} from '@/physics/vector';

Class.Basic = {
    tier: 0,
    label: '',
    sides: 0,
    color: Color.TeamColor,
    border: Color.AutoBorder,
    killMessage: true,
    skill: {
        speed: 0.5,
        health: 140,
        regen: 0.1,
        shieldRegen: 0.1,
        damage: 10,
        pen: 10,
        range: null,
        pushability: 0.1,
        fov: 500,
    },
    props: [
        {
            offset: new Vector(),
            fixedAngle: false,
            size: 35,
            sides: 3,
            color: Color.Black,
            layer: -1,
        },
        {
            offset: new Vector(),
            fixedAngle: false,
            angle: Math.PI,
            size: 35,
            sides: 3,
            color: Color.Black,
            layer: -1,
        },
    ],
    size: 10,
    miniMapType: 'team',
};

Class.Food = {
    tier: 0,
    label: '',
    name: '',
    food: true,
    sides: 0,
    color: Color.TeamColor,
    border: Color.AutoBorder,
    killMessage: true,
    skill: {
        speed: 0.5,
        health: 20,
        regen: 0.001,
        damage: 10,
        pen: 10,
        range: null,
        pushability: 0.1,
        fov: 500,
    },
    props: [
        {
            offset: new Vector(),
            fixedAngle: false,
            size: 50,
            sides: 3,
            color: Color.Black,
            layer: -1,
            spin: 0.2,
        },
    ],
    controllers: [new ControllerMaker(SlowCircleMove)],
    size: 10,
    miniMapType: 'team',
};
Class.NOOO = {
    tier: 0,
    label: '',
    name: '',
    food: true,
    sides: 0,
    color: Color.Red,
    border: Color.AutoBorder,
    killMessage: true,
    skill: {
        speed: 0.5,
        health: 20,
        regen: 0.001,
        damage: 10,
        pen: 10,
        range: null,
        pushability: 0.1,
        fov: 500,
    },
    props: [
        {
            offset: new Vector(),
            fixedAngle: false,
            size: 50,
            sides: 3,
            color: Color.Black,
            layer: -1,
            spin: 0.4,
        },
    ],
    controllers: [new ControllerMaker(Nearest)],
    size: 17,
    miniMapType: 'team',
};
