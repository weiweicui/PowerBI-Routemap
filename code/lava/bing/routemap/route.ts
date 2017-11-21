import { repeat } from 'array';
import { sameArray, clamp, Action, Func, StringMap, values } from 'type';
import { Style, IPoint, $cfg, $GRAY, dash, $fmt, shapes, $mapctl } from './app';
import { IBound, IListener, ILocation } from 'bing';
import { Converter } from 'bing/converter';
import { translate, scale } from 'd3/attr';
import { unit } from "vector";
import { Any, select } from 'd3-selection';
function bad(r: number): boolean {
    return r === null || r === undefined || isNaN(r);
}

let showBadShapeMsg: Func<boolean, void>;
export function onBadShape(then: Func<boolean, void>) {
    showBadShapeMsg = then;
}

export function all() {
    return values(data);
}

export class Route {
    public color = [] as string[];
    public thick = [] as number[];
    public style = [] as Style[];
    public segmt = [] as number[];
    public selet = [] as boolean[];
    public points = [] as IPoint[];
    public group = null as string;

    constructor(rows: number[], group: string) {
        let { color, thick, style, lat, lon } = $cfg;
        let { nonzero, onlyvalid } = $fmt.advance;
        let flags = $cfg.selection.flags();
        let selet = flags ? r => r in flags : r => true;
        let cCol, cSel, cThi, cSty;
        this.group = group;
        // rows = [0, 1, 2, 3];        
        // for (let row of rows) {
        //     let lati = lat(row), lngi = lon(row);
        //     if (row === 0) lngi = -70;
        //     if (row === 1) lngi = -120;
        //     if (row === 2) lngi = 160;
        //     if (row === 3) { lngi = 0; lati = 20;}

        //     if (bad(lati) || bad(lngi)) { continue; }
        //     if (nonzero && lati === 0 && lngi === 0) { continue; }
        //     if (lati < -85.05112878 || lati > 85.05112878) {
        //         if (onlyvalid) { continue; }
        //         lati = clamp(lati, -85.05112878, 85.05112878);
        //     }
        //     if (lngi < -180 || lngi > 180) {
        //         if (onlyvalid) { continue; }
        //         lngi = clamp(lngi, -180, 180);
        //     }
        //     let sel = selet(row), col = color(row), thi = thick(row), sty = style(row);
        //     if (sel !== cSel || col !== cCol || thi !== cThi || sty !== cSty) {
        //         if (this.points.length !== 0) {
        //             this._segment(cSel, cCol, cThi, cSty);
        //         }
        //         cSel = sel, cCol = col, cThi = thi, cSty = sty;
        //     }
        //     this.points.push({
        //         longitude: lngi, latitude: lati, row, segment: this.segmt.length
        //     });
        // }
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
            let sel = selet(row), col = color(row), thi = thick(row), sty = style(row);
            if (sel !== cSel || col !== cCol || thi !== cThi || sty !== cSty) {
                if (this.points.length !== 0) {
                    this._segment(cSel, cCol, cThi, cSty);
                }
                cSel = sel, cCol = col, cThi = thi, cSty = sty;
            }
            this.points.push({
                longitude: lngi, latitude: lati, row, segment: this.segmt.length
            });
        }
        if (this.points.length !== 0) {
            this._segment(cSel, cCol, cThi, cSty);
        }
    }

    private _segment(sel: boolean, col: string, thi: number, sty: Style) {
        this.selet.push(sel);
        this.color.push(col);
        this.style.push(sty);
        this.thick.push(thi);
        this.segmt.push(this.points.length);
    }
}

let map20 = new Converter(20);

let glyphCreated: Func<Any<IPoint>, void>;
export function onGlyphCreated(then: Func<Any<IPoint>, void>) {
    glyphCreated = then;
}

let root: d3.Any;
let data = {} as StringMap<VisualRoute>;
export function listener(d3: d3.Any): IListener{
    root = d3;
    return {
        transform(m, p, e) {
            all().forEach(r => r.transform(m));
        }
    }
}

export function reset(input: StringMap<number[]>) {
    root.selectAll('*').remove();
    data = {};
    for (let name in input) {
        let route = new Route(input[name], name);
        let vr = new VisualRoute(route, root.append('g'), $mapctl.map.getZoom());
        data[route.group] = vr;
    }
}

export class VisualRoute {
    private static IMAGE_CACHE = [null, 1, 1] as [string, number, number];
    private static IMAGE_FETCHING = false;
    private static IMAGE_ACTIONS = [] as Action[];
    private _d3: d3.Any;
    private _bound: IBound;
    private _pnts: IPoint[];
    private _base: Route;
    private _zoom: number;

    private _arrowPoints = null as IPoint[];

    public bound(flags: StringMap<boolean>): IBound {
        if (!flags) {
            return this._bound;
        }
        let locs = this._pnts.filter(p => p.row in flags);
        if (locs.length <= 0) {
            return null;
        }
        else {
            return $mapctl.bound(locs as ILocation[]);
        }
    }
    
    public transform(map: Microsoft.Maps.Map): void {
        if (!this._d3) {
            return;
        }
        if (this._zoom !== map.getZoom()) {
            var factor = map20.factor(map.getZoom());
            var widths = this._base.thick.map(t => (+t) / factor);
            var styles = this._base.style;
            this._d3.selectAll<number>('.segment')
                .att.transform(scale(factor))
                .att.stroke_width(i => widths[i])
                .att.stroke_dasharray(i => dash[styles[i]](widths[i]));
            this._d3.selectAll<IPoint>('.glyph')
                .att.transform(p => translate(p.x * factor, p.y * factor));
            this._zoom = map.getZoom();
        }
        this._d3.att.transform(translate($mapctl.pixel(this._bound)));
    }

    highlight(flags?: StringMap<true>): void {
        //route is highlighted as a whole, so only need to check one row
        let show = !flags || this._pnts[0].row in flags;
        let color = this._base.color;
        this._d3.selectAll<number>('.segment')
            .att.stroke(i => show ? color[i] : $GRAY);
        this._d3.selectAll<IPoint>('.glyph')
            .att.fill(p => show ? color[p.segment] : $GRAY);
    }

    private _resetArrowPoints() {
        this._arrowPoints = [];
        let sum = 0, segs = [] as number[], pnts = this._pnts;        
        if (this._pnts.length <= 2) {
            return;
        }
        if ($cfg.glyph.interval <= 1) {
            this._arrowPoints = pnts.slice(1, pnts.length - 1);
            return;
        }

        for (let i = 0; i < pnts.length - 1; i++) {
            let p1 = pnts[i], p2 = pnts[i + 1];
            let dx = p1.x - p2.x, dy = p1.y - p2.y;
            sum += (segs[i] = Math.sqrt(dx * dx + dy * dy));
        }
        let step = sum / pnts.length * $cfg.glyph.interval;

        let dist = segs[0], curr = 1;
        while (curr < pnts.length - 1) {
            if (dist > step) {
                this._arrowPoints.push(pnts[curr]);
                dist = segs[curr];
            }
            else {
                dist += segs[curr];
            }
            curr++;
        }
    }

    constructor(raw: Route, root: d3.Any, zoom: number) {
        this._d3 = root;
        this._base = raw;
        this._zoom = zoom;
        this._pnts = raw.points;
        //let area = map20.points(raw.points as ILocation[]);
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
        this.drawGlyphs();
        this.transform($mapctl.map);
    }


    public drawGlyphs(): void {
        let fmt = $fmt.arrow, pnts = this._pnts, raw = this._base;
        let factor = map20.factor(this._zoom);
        let segmt = this._base.segmt, color = this._base.color;
        let selet = this._base.selet, thick = this._base.thick;
        this._d3.selectAll('.glyph').remove();
        if (!fmt.show || (fmt.customize && !$cfg.glyph.show(raw.points[0].row))) {
            return;
        }
        let glyph = (pnt: IPoint, tag: string, type: string) => {
            let s = pnt.segment;
            return this._d3.append(tag).datum(pnt)
                .att.fill(p => selet[s] ? color[s] : $GRAY)
                .att.class(type + ' glyph')
                .att.transform(translate(pnt.x * factor, pnt.y * factor));
        };
        if (fmt.middle) {
            if (!this._arrowPoints) {
                this._resetArrowPoints();
            }
            for (var p of this._arrowPoints) {
                glyph(p, 'path', 'arrow')
                    .att.d(this._arrow(p.ux, p.uy, fmt.middleScale * (+thick[p.segment])));
            }
        }
        
        if (fmt.start) {
            glyph(pnts[0], 'circle', 'start')
                .att.cx(0).att.cy(0)
                .att.r(fmt.startScale * (+thick[pnts[0].segment]) / 2);
        }

        if (fmt.end) {
            var end = pnts[pnts.length - 1];
            this._endShape(glyph(end, 'g', 'end'), end, fmt.endScale * (+thick[end.segment]));
        }
        var glyphs = this._d3.selectAll<IPoint>('.glyph');
        glyphCreated && glyphCreated(glyphs);
        glyphs.on('click', this._onclick);
    }

    private _onclick = () => {
        $cfg.selection.click(this._base.points.map(p => p.row));
    };

    private _rotate(pnt: IPoint) {
        let angle = Math.atan2(pnt.uy, pnt.ux) * 180 / Math.PI;
        switch ($fmt.arrow.endDirectional) {
            case 'right': return `rotate(${angle})`;
            case 'up'   : return `rotate(${angle + 90})`;
            case 'left' : return `rotate(${angle + 180})`;
            case 'down' : return `rotate(${angle + 270})`;
        }
    }

    private _vertical() {
        return $fmt.arrow.endDirectional === 'up' || $fmt.arrow.endDirectional === 'down';
    }

    private _endShape(group: d3.Any, pnt: IPoint, size: number) {
        let rotate = group.append('g').att.class('rotate').datum(pnt);
        let resize = rotate.append('g').att.class('resize').datum(pnt);
        let node = resize.node<SVGGElement>();
        let fmt = $fmt.arrow;
        if (fmt.endShape in shapes) {
            let shaper = shapes[fmt.endShape];
            node.innerHTML = shaper.group;
            if (shaper.directional) {
                rotate.att.transform(`rotate(${Math.atan2(pnt.uy, pnt.ux) * 180 / Math.PI + 90})`);
            }
            pnt.iconWidth = shaper.width || node.getBBox().width;
            showBadShapeMsg && showBadShapeMsg(false);
            resize.att.transform(p => `scale(${size / p.iconWidth})`);
            group.selectAll('*').each(function () { select(this).datum(pnt); });
            return;
        }
        else if (fmt.endShape === 'image') {
            let custom = fmt.endImage || '';
            let [cache, w, h] = VisualRoute.IMAGE_CACHE;
            if (cache === custom && w < 0) {
                return;
            }
            if (cache === custom) {
                pnt.iconWidth = this._vertical() ? w : h;
                var elem = `<image xlink:href="${custom}" height="${h}" width="${w}" transform="translate(${0 - w / 2},${0 - h / 2})"/>`;
                node.innerHTML = elem;                
                rotate.att.transform(this._rotate(pnt));
                resize.att.transform(p => `scale(${size / p.iconWidth})`);
                group.selectAll('*').each(function () { select(this).datum(pnt); });
                showBadShapeMsg && showBadShapeMsg(false);
            }
            else if (VisualRoute.IMAGE_FETCHING) {
                VisualRoute.IMAGE_ACTIONS.push(() => this._endShape(group, pnt, size));
            }
            else {
                VisualRoute.IMAGE_FETCHING = true;
                var image = new Image();
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
                    showBadShapeMsg && showBadShapeMsg(true);
                }
                image.src = custom;
            }
        }
        else {
            let custom = fmt.endData || "";
            node.innerHTML = custom;
            let [cache, width, height] = VisualRoute.IMAGE_CACHE;
            if (cache === custom && width < 0) {
                return;
            }
            if (cache !== custom) {
                if (!!custom && node.innerHTML.length <= 1) {
                    showBadShapeMsg && showBadShapeMsg(true);
                    VisualRoute.IMAGE_CACHE = [custom, -1, -1];
                    return;
                }
                else {
                    width = node.getBBox().width;
                    height = node.getBBox().height;
                    VisualRoute.IMAGE_CACHE = [custom, width, height];
                }
            }
            pnt.iconWidth = this._vertical() ? width : height;
            rotate.att.transform(this._rotate(pnt));
            resize.att.transform(p => `scale(${size / p.iconWidth})`);
            group.selectAll('*').each(function () { select(this).datum(pnt); });
            showBadShapeMsg && showBadShapeMsg(false);
            return;
        }
    }

    private _arrow(ux: number, uy: number, size: number): string {
        var x1 = uy * -1 * size, y1 = ux * size;
        var x2 = uy * size, y2 = ux * -1 * size;
        ux *= size * 2;
        uy *= size * 2;
        var ret = 'M ';
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
                .att.transform(scale(factor))
                .att.stroke(raw.selet[i] ? raw.color[i] : $GRAY)
                .att.stroke_width(width)
                .att.stroke_opacity(1)
                .att.stroke_linecap('round')
                .att.stroke_dasharray(dash[raw.style[i]](width));
        }
    }
}