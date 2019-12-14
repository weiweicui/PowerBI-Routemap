import { MapFormat } from '../lava/bingmap';
import { DashType, ShapeType } from '../lava/routemap/config';

export class Format {
    legend = {
        show: true,
        position: 'top' as 'top' | 'bottom',
        fontSize: 12,
        color: false,
        thick: false,
        style: false,
        color_label: '',
        thick_label: '',
        style_label: '',
        color_default: false,
        thick_default: false,
        style_default: false
    };
    color = {
        customize: true,
        item: { solid: { color: '#01B8AA' } },
        auto: false
    };
    thick = {
        customize: true,
        item: 3,
        auto: false
    };
    style = {
        customize: true,
        item: 'solid' as DashType
    };
    arrow = {
        show: true,
        startScale: 3,
        start: false,
        middle: true,
        middleScale: 1.5,
        interval: 0,
        end: false,
        endScale: 6,
        endData: "",
        endImage: "",
        endDirectional: 'up' as 'up' | 'left' | 'down' | 'right',
        endShape: 'triangle' as ShapeType | 'customize' | 'image',
        customize: false,
        item: true
    };
    advance = {
        onlyvalid: true,
        nonzero: true,
        debug: false
    };
    mapControl = MapFormat.control(new MapFormat(), { autofit: true });
    mapElement = MapFormat.element(new MapFormat(), {});
}