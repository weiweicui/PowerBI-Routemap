import { RoutemapConfig } from "./config";
import { Func, StringMap } from "../../type";
import { selex, ISelex } from "../../d3";
import { Legend } from "./legend";
import { Controller, MapFormat } from '../../bingmap/controller';
import * as route from './route';

export let $fmt = null as RoutemapConfig;
let $mapctl = null as Controller;
let $legend = null as Legend;
let $root = null as ISelex;
export function init(div: HTMLElement, mapFmt: MapFormat, then: Func<Controller, void>) {
    const root = $root = selex(div);
    root.append('div').att.id('view').sty.width('100%').sty.height('100%');
    root.append('div').att.id('legend').sty.position('absolute')
        .sty.top('0px').sty.left('0px');
    $legend = new Legend(root.select('#legend'));
    $mapctl = new Controller('#view');
    $mapctl.restyle(mapFmt, map => {
        $mapctl.svg.sty.cursor('default').sty.pointer_events('visiblePainted');
        $mapctl.add({ resize: _ => resize() });
        $mapctl.add(route.init($mapctl.svg.append('g')));
        then($mapctl);
    });
}

export function reset(fmt: RoutemapConfig, data: number[][]) {
    $fmt = fmt;
    $legend.update($mapctl.map.getWidth(), $fmt.legend);
    resize();
    $mapctl.restyle($fmt.map);
    route.reset(data, $mapctl);
}

export function repaint(fmt: RoutemapConfig, type: 'map' | 'route' | 'legend', data?: number[][]) {
    $fmt = fmt;
    if (type === 'map') {
        $mapctl.restyle($fmt.map);
    }
    else if (type === 'legend') {
        $legend.update($mapctl.map.getWidth(), $fmt.legend);
        resize();
    }
    else {
        route.reset(data, $mapctl);
    }
}

function resize() {
    const { show, position } = $fmt.legend;
    $legend.update($mapctl.map.getWidth(), $fmt.legend);
    const height = $mapctl.map.getHeight();
    const legHeight = show ? $legend.height() : 0;
    const top = position === 'top' ? null : (height - legHeight + 2) + 'px';
    $root.select('#legend').sty.margin_top(top).sty.display(show ? null : 'none');
}

export function tryFitView() {
    if ($fmt.autofit) {
        const areas = route.bounds();
        if (areas && areas.length) {
            $mapctl.fitView(areas);
        }
    }
}

export interface IPoint {
    latitude? : number;
    longitude?: number;
    x?        : number;
    y?        : number;
    row?      : number;
    segment?  : number;
    ux?       : number;
    uy?       : number;
    iconWidth?: number;
}