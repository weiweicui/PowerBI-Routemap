import { MapFormat } from 'bing';

var mapformat = new MapFormat();
export class Format {
    legend = {
        show       : false,
        position   : 'top' as 'top' | 'bottom',
        fontSize   : 12,
        color      : false,
        thick      : false,
        style      : false,
        color_label: '',
        thick_label: '',
        style_label: ''
    };
    color = {
        customize: true,
        item     : { solid: { color: '#01B8AA' } }
    };
    thick = {
        customize: true,
        item     : 3
    };
    style = {
        customize: true,
        item     : 'solid'
    };

    route = {
        customize: true,
        item     : true
    };

    arrow = {
        show          : true,
        startScale    : 6,
        start         : false,
        middle        : true,
        middleScale   : 1.5,
        interval      : 0,
        end           : false,
        endScale      : 6,
        endData       : "",
        endImage      : "",
        endDirectional: 'up' as 'up' | 'left' | 'down' | 'right',
        endShape      : 'triangle',
        customize     : false,
        item          : true
    };

    advance = {
        onlyvalid: true,
        nonzero  : true,
        debug    : false
    };

    mapControl = MapFormat.control(mapformat, { autofit: true });

    mapElement = MapFormat.element(mapformat, {});
}
