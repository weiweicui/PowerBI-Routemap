import { Func } from "../type";
import { selex } from "../d3";
import { Legend, Config as LegendConfig } from "./legend";
import { Controller, MapFormat } from '../bingmap';
import * as route from './route';

export class Config {
    legend = new LegendConfig();
    route = new route.Config() as Partial<route.Config>;
    map = new MapFormat();
}

export const events = {
    route: route.events
}

let mapctl = null as Controller;
let legend = null as Legend;
export function init(div: HTMLElement, mapFmt: MapFormat, then: Func<Controller, void>) {
    const root = selex(div);
    root.append('div').att.id('view').sty.size('100%');
    root.append('div').att.id('legend').sty.position('absolute').sty.top('0px').sty.left('0px');
    mapctl = new Controller('#view');
    mapctl.restyle(mapFmt, () => {
        mapctl.svg.sty.cursor('default').sty.pointer_events('visiblePainted');
        legend = new Legend(root.select('#legend'), mapctl);
        mapctl.add(route.init(mapctl.svg.append('g')));
        then && then(mapctl);
    });
}

export function reset(fmt: Config, data: number[][], init = false) {
    fmt.legend && legend.update(fmt.legend);
    fmt.map && mapctl.restyle(fmt.map);
    fmt.route && route.reset(data, mapctl, fmt.route, init);
}