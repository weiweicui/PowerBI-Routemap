import { IPoint } from './type';

export function add(p: IPoint, vec: [number, number]): IPoint {
        return { x: p.x + vec[0], y: p.y + vec[1] };
    }

export function middle(s: IPoint, e: IPoint, frac: number): IPoint {
    return { x: e.x * frac + s.x * (1 - frac), y: e.y * frac + s.y * (1 - frac) };
}