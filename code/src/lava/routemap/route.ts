import { DashType, dash, shapes, ShapeType, IPoint } from './config';
import { clamp, Action, Func, copy } from '../type';
import { ISelex, selex } from '../d3';
import { IBound, ILocation, Converter, Controller, IListener } from '../bingmap';
import { unit } from '../vector';

export class Config {
    glyph = {
        start: null as { scale: number },
        middle: null as { scale: number, interval: number },
        end: null as { scale: number, direction: 'up' | 'left' | 'down' | 'right' } & EndGlyph,
        active: null as Func<number, boolean>
    };

    data = {
        lat: null as Func<number, number>,
        lon: null as Func<number, number>,
        color: null as Func<number, string>,
        thick: null as Func<number, number>,
        style: null as Func<number, DashType>,
        onlyvalid: true,
        nonzero: true
    };
    autofit = true;
}

export const events = {
    onBadShape: null as Func<boolean, void>,
    onGlyphCreated: null as Func<ISelex<IPoint>, void>
}

export function init(group: ISelex): IListener {
    _root = group;
    return { transform: m => _visuals.forEach(r => r.transform(m)) };
}

let _root = null as ISelex;
let _fmt = new Config();

let _input = [] as number[][];
let _routes = [] as Route[];
let _visuals = [] as VisualRoute[];
export function reset(input: number[][], ctl: Controller, config: Partial<Config>, init = false) {
    const turnon = !_fmt.autofit && config.autofit;
    copy(config, _fmt);
    _input = input || _input;
    if (config.data || input) {
        _routes = _input.map(v => new Route(v, config.data));
    }
    if (config.glyph || config.data || input) {
        const zoom = ctl.map.getZoom();
        _root.selectAll('*').remove();
        _visuals = _routes.map(r => new VisualRoute(r, _root.append('g'), zoom));
        _visuals.forEach(v => v.transform(ctl));
    }
    if (input) {
        input.length && _fmt.autofit && !init && ctl.fitView(_visuals.map(v => v.bound()));
    }
    else {
        _input.length && turnon && !init && ctl.fitView(_visuals.map(v => v.bound()));
    }
}

type EndGlyph = { builtin: ShapeType } | { custom: string } | { image: string }

class Route {
    public color = [] as string[];
    public thick = [] as number[];
    public style = [] as DashType[];
    public segmt = [] as number[];
    public points = [] as IPoint[];

    constructor(rows: number[], config: Config['data']) {
        const { color, thick, style, lat, lon, nonzero, onlyvalid } = config;
        let cColor = undefined as string;
        let cThick = undefined as number;
        let cStyle = undefined as DashType;
        for (let row of rows) {
            let lati = lat(row), lngi = lon(row);
            if (bad(lati) || bad(lngi)) { continue; }
            if (nonzero && lati === 0 || lngi === 0) { continue; }
            if (lati < -85.05112878 || lati > 85.05112878) {
                if (onlyvalid) { continue; }
                lati = clamp(lati, -85.05112878, 85.05112878);
            }
            if (lngi < -180 || lngi > 180) {
                if (onlyvalid) { continue; }
                lngi = clamp(lngi, -180, 180);
            }
            const col = color(row), thi = thick(row), sty = style(row);
            if (col !== cColor || thi !== cThick || sty !== cStyle) {
                if (this.points.length !== 0) {
                    this._segment(cColor, cThick, cStyle);
                }
                cColor = col, cThick = thi, cStyle = sty;
            }
            this.points.push({
                longitude: lngi, latitude: lati, row, segment: this.segmt.length
            });
        }
        if (this.points.length !== 0) {
            this._segment(cColor, cThick, cStyle);
        }
    }

    private _segment(col: string, thi: number, sty: DashType) {
        this.color.push(col);
        this.style.push(sty);
        this.thick.push(thi);
        this.segmt.push(this.points.length);
    }
}

const map20 = new Converter(20);

class VisualRoute {
    private static IMAGE_CACHE = ["", 1, 1] as [string, number, number];
    private static IMAGE_FETCHING = false;
    private static IMAGE_ACTIONS = [] as Action[];
    private _d3: ISelex;
    private _bound: IBound;
    private _pnts: IPoint[];
    private _base: Route;
    private _zoom: number;

    private _middlePoints = null as IPoint[];

    public bound(): IBound {
        return this._bound;
    }

    public transform(ctl: Controller): void {
        const map = ctl.map;
        if (!this._d3) {
            return;
        }
        if (this._zoom !== map.getZoom()) {
            var factor = map20.factor(map.getZoom());
            var widths = this._base.thick.map(t => (+t) / factor);
            var styles = this._base.style;
            this._d3.selectAll<number>('.segment')
                .att.scale(factor)
                .att.stroke_width(i => widths[i])
                .att.stroke_dasharray(i => dash[styles[i]](widths[i]));
            this._d3.selectAll<IPoint>('.glyph')
                .att.translate(p => p.x * factor, p => p.y * factor);
            this._zoom = map.getZoom();
        }
        this._d3.att.translate(ctl.pixel(this._bound));
    }

    private _resetMiddlePoints() {
        this._middlePoints = [];
        let sum = 0, segs = [] as number[], pnts = this._pnts;
        if (this._pnts.length <= 2) {
            return;
        }
        if (+_fmt.glyph.middle.interval <= 1) {
            this._middlePoints = pnts.slice(1, pnts.length - 1);
            return;
        }

        for (let i = 0; i < pnts.length - 1; i++) {
            let p1 = pnts[i], p2 = pnts[i + 1];
            let dx = p1.x - p2.x, dy = p1.y - p2.y;
            sum += (segs[i] = Math.sqrt(dx * dx + dy * dy));
        }
        let step = sum / pnts.length * (+_fmt.glyph.middle.interval); //fmt.glyph.interval;

        let dist = segs[0], curr = 1;
        while (curr < pnts.length - 1) {
            if (dist > step) {
                this._middlePoints.push(pnts[curr]);
                dist = segs[curr];
            }
            else {
                dist += segs[curr];
            }
            curr++;
        }
    }

    constructor(raw: Route, root: ISelex, zoom: number) {
        this._d3 = root;
        this._base = raw;
        this._zoom = zoom;
        this._pnts = raw.points;
        let area = map20.line(raw.points as ILocation[]);
        this._bound = { anchor: area.anchor, margin: area.margin };
        let points = area.points;
        let ux = 0, uy = 1;
        for (let i = 0; i < points.length; i++) {
            let p1 = points[i], p2 = points[i + 1];
            let p = raw.points[i];
            if (p2 && (p1.x !== p2.x || p1.y !== p2.y)) {
                [ux, uy] = unit(p1, p2);
            }
            p.ux = ux, p.uy = uy;
            p.x = p1.x, p.y = p1.y;
        }
        this._drawRoute();
        this._redrawGlyphs();
    }

    private _redrawGlyphs(): void {
        const pnts = this._pnts, raw = this._base;
        const factor = map20.factor(this._zoom);
        const color = this._base.color;
        const thick = this._base.thick;
        this._d3.selectAll('.glyph').remove();
        if (!_fmt.glyph.active(raw.points[0].row)) {
            return;
        }
        const elem = (pnt: IPoint, tag: any, type: string) => {
            return this._d3.append(tag).datum(pnt)
                .att.fill(color[pnt.segment]).att.class(type + ' glyph')
                .att.translate(p => p.x * factor, p => p.y * factor);
        };
        const { middle, start, end } = _fmt.glyph;
        if (middle) {
            !this._middlePoints && this._resetMiddlePoints();
            for (const p of this._middlePoints) {
                elem(p, 'path', 'arrow').att.d(this._arrow(p, middle.scale * (+thick[p.segment])));
            }
        }
        if (start) {
            const p = pnts[0], size = start.scale * (+thick[p.segment]);
            elem(pnts[0], 'circle', 'start').att.cx(0).att.cy(0).att.r(size / 2);
        }
        if (end) {
            const p = pnts[pnts.length - 1];
            this._endShape(elem(p, 'g', 'end'), p, end.scale * (+thick[p.segment]));
        }
        events.onGlyphCreated && events.onGlyphCreated(this._d3.selectAll<IPoint>('.glyph'));
    }

    private _rotate(pnt: IPoint) {
        let angle = Math.atan2(pnt.uy, pnt.ux) * 180 / Math.PI;
        switch (_fmt.glyph.end.direction) {
            case 'right': return `rotate(${angle})`;
            case 'up': return `rotate(${angle + 90})`;
            case 'left': return `rotate(${angle + 180})`;
            case 'down': return `rotate(${angle + 270})`;
        }
    }

    private _vertical() {
        return _fmt.glyph.end.direction === 'up' || _fmt.glyph.end.direction === 'down';
    }

    private _endShape(group: ISelex<IPoint>, pnt: IPoint, size: number) {
        const rotate = group.append('g').datum(pnt).att.class('rotate');
        const resize = rotate.append('g').datum(pnt).att.class('resize');
        const node = resize.node() as SVGGElement;
        const end = _fmt.glyph.end;
        if ('builtin' in end) {
            const shaper = shapes[end.builtin];
            node.innerHTML = shaper.group;
            if (shaper.directional) {
                rotate.att.transform(`rotate(${Math.atan2(pnt.uy, pnt.ux) * 180 / Math.PI + 90})`);
            }
            pnt.iconWidth = 'width' in shaper ? shaper.width : node.getBBox().width;
            events.onBadShape && events.onBadShape(false);
            resize.att.transform(p => `scale(${size / p.iconWidth})`);
            group.selectAll('*').each(function () { selex(this).datum(pnt); });
            return;
        }
        if ('image' in end) {
            const custom = end.image || '';
            const [cache, w, h] = VisualRoute.IMAGE_CACHE;
            if (cache === custom && w < 0) {
                return;
            }
            if (cache === custom) {
                pnt.iconWidth = this._vertical() ? w : h;
                var elem = `<image xlink:href="${custom}" height="${h}" width="${w}" transform="translate(${0 - w / 2},${0 - h / 2})"/>`;
                node.innerHTML = elem;
                rotate.att.transform(this._rotate(pnt));
                resize.att.transform(p => `scale(${size / p.iconWidth})`);
                group.selectAll('*').each(function () { selex(this).datum(pnt); });
                events.onBadShape && events.onBadShape(false);
            }
            else if (VisualRoute.IMAGE_FETCHING) {
                VisualRoute.IMAGE_ACTIONS.push(() => this._endShape(group, pnt, size));
            }
            else {
                VisualRoute.IMAGE_FETCHING = true;
                const image = new Image();
                VisualRoute.IMAGE_ACTIONS.push(() => this._endShape(group, pnt, size));
                image.onload = () => {
                    VisualRoute.IMAGE_FETCHING = false;
                    VisualRoute.IMAGE_CACHE = [custom, image.width, image.height];
                    VisualRoute.IMAGE_ACTIONS.forEach(r => r());
                    VisualRoute.IMAGE_ACTIONS = [];
                };
                image.onerror = () => {
                    VisualRoute.IMAGE_FETCHING = false;
                    VisualRoute.IMAGE_CACHE = [custom, -1, -1];
                    VisualRoute.IMAGE_ACTIONS = [];
                    events.onBadShape && events.onBadShape(true);
                }
                image.src = custom;
            }
        }
        else {
            const custom = end.custom || '';
            node.innerHTML = custom;
            let [cache, width, height] = VisualRoute.IMAGE_CACHE;
            if (cache === custom && width < 0) {
                return;
            }
            if (cache !== custom) {
                width = node.getBBox().width;
                height = node.getBBox().height;
                if (!width || !height) {
                    events.onBadShape && events.onBadShape(true);
                    VisualRoute.IMAGE_CACHE = [custom, -1, -1];
                    return;
                }
                VisualRoute.IMAGE_CACHE = [custom, width, height];
            }
            pnt.iconWidth = this._vertical() ? width : height;
            rotate.att.transform(this._rotate(pnt));
            resize.att.transform(p => `scale(${size / p.iconWidth})`);
            group.selectAll('*').each(function () { selex(this).datum(pnt); });
            events.onBadShape && events.onBadShape(false);
            return;
        }
    }

    private _arrow(p: IPoint, size: number) {
        let ux = p.ux, uy = p.uy;
        const x1 = uy * -1 * size, y1 = ux * size;
        const x2 = uy * size, y2 = ux * -1 * size;
        ux *= size * 2;
        uy *= size * 2;
        let ret = 'M ';
        ret += x1 + ',' + y1 + ' ';
        ret += ux + ',' + uy + ' ';
        ret += x2 + ',' + y2;
        return ret;
    }


    private _drawRoute(): void {
        let factor = map20.factor(this._zoom);
        let raw = this._base, pnts = this._pnts;
        this._d3.selectAll('.segment').remove();
        for (let i = raw.segmt.length - 1; i >= 0; i--) {
            let last = raw.segmt[i] - 1;
            let start = i > 0 ? raw.segmt[i - 1] : 1;
            let org = i > 0 ? pnts[start - 1] : pnts[0];
            let dump = ['M', org.x, org.y] as any[];
            for (let j = start; j < last; j++) {
                let p = pnts[j];
                dump.push('L', p.x, p.y);
            }
            dump.push('L', pnts[last].x, pnts[last].y);
            var width = (+raw.thick[i]) / factor;
            this._d3.append('path').datum(i)
                .att.class('segment')
                .att.d(dump.join(' '))
                .sty.fill('none')
                .att.scale(factor)
                .att.stroke(raw.color[i])
                .att.stroke_width(width)
                .att.stroke_opacity(1)
                .att.stroke_linecap('round')
                .att.stroke_dasharray(dash[raw.style[i]](width));
        }
    }
}

function bad(r: number): boolean {
    return r === null || r === undefined || isNaN(r);
}