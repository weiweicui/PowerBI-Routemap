import { ISelex, selex } from '../d3';
import { dash } from './config';
import { sequence, StringMap, keys } from '../type';
import { Controller } from '../bingmap';

export class Config {
    show = false;
    color = {} as StringMap<string>;//color ==> label
    thick = {} as StringMap<string>;//number ==> label
    style = {} as StringMap<string>;//enum ==> label
    fontSize = 12;
    position = 'top' as 'top' | 'bottom'
}

export class Legend {
    private _svg: ISelex;
    private _config = new Config();
    constructor(div: ISelex, ctl: Controller) {
        this._svg = div.append('svg').sty.position('absolute');
        this._svg.append('rect').att.fill('white').att.id('mask').att.size('100%', '100%');
        this._svg.append('g').att.id('color');
        this._svg.append('g').att.id('thick');
        this._svg.append('g').att.id('style');
        ctl.add({ resize: () => this._resize(ctl) });
        this._resize(ctl);
    }

    private _resize(ctl: Controller) {
        const width = ctl.map.getWidth(), height = ctl.map.getHeight();
        this._svg.att.size(width, this._height());
        const top = this._config.position === 'top' ? -1 : height - this._height() + 2;
        this._svg.sty.margin_top(top + 'px');
    }

    public update(config: Config): void {
        this._config = config;
        this._config.fontSize = +config.fontSize;
        this._svg.att.height(this._height());
        this._svg.style('display', this._config.show ? null : 'none');
        if (this._config.show) {
            const { color, style, thick } = this._config;
            this._restyle(style, this._rethick(thick, this._recolor(color, 0)));
        }
    }

    private _group(cnt: number, type: 'color' | 'thick' | 'style', tag: string): ISelex<number> {
        const root = this._svg.select('#' + type), y = this._textBase();
        const group = root.selectAll('.item').data(sequence(0, cnt));
        const enter = group.enter().append('g').attr('class', 'item');
        enter.append(tag as any);
        enter.append('text');
        group.exit().remove();
        return this._svg.select('#' + type).selectAll('.item');
    }

    private _text(group: ISelex<number>, padding: number, labels: string[], start: number): number {
        var ty = this._textBase(), offset = [0] as number[], fsize = this._config.fontSize;
        group.selectAll('text').att.x(padding).att.y(ty).att.font_size(fsize)
            .text(i => labels[i]).each(function (i) {
                const tw = (selex(this).node() as SVGTextElement).getBBox().width;
                offset[i + 1] = offset[i] + padding + fsize * 1.2 + tw;
            });
        group.att.transform(i => `translate(${offset[i] + start},0)`);
        if (labels.length === 0) {
            return start;
        }
        else {
            return offset[offset.length - 1] + start + 2.4 * fsize;
        }
    }

    private _restyle(data: StringMap<string>, start: number): number {
        let styles = Object.keys(data), fsize = this._config.fontSize;
        let group = this._group(styles.length, 'style', 'line');
        let mid = this._textBase() - fsize * 0.7 / 2;
        let width = 2 * fsize, thick = width / 12;
        let dasharray = styles.map(t => dash[t]);
        group.selectAll('line')
            .att.class('dash')
            .att.x1(0)
            .att.x2(width)
            .att.y1(mid)
            .att.y2(mid)
            .att.stroke('black')
            .att.stroke_width(thick)
            .att.stroke_opacity(1)
            .att.stroke_dasharray(i => dasharray[i](thick));
        return this._text(group, width + 2, styles.map(s => data[s]), start);
    }

    private _rethick(data: StringMap<string>, start: number): number {
        let thicks = keys(data), fsize = this._config.fontSize;
        let group = this._group(thicks.length, 'thick', 'rect');
        let mid = this._textBase() - fsize * 0.7 / 2, width = 1.5 * fsize;
        group.selectAll<number>('rect')
            .att.y(i => mid - (+thicks[i] / 2))
            .att.fill('$555')
            .att.width(width)
            .att.height(i => thicks[i]);
        return this._text(group, width + 2, thicks.map(t => data[t]), start);
    }

    private _recolor(data: StringMap<string>, start: number): number {
        const colors = keys(data);
        const group = this._group(colors.length, 'color', 'circle');
        const r = this._config.fontSize * 0.7 / 2, cy = this._textBase() - r + 1;
        group.selectAll('circle')
            .att.cx(r + 2)
            .att.cy(cy)
            .att.r(r)
            .att.fill(i => colors[i]);
        return this._text(group, 2 * r + 4, colors.map(c => data[c]), start);
    }

    private _textBase(): number {
        return this._config.fontSize + 2;
    }

    private _height(): number {
        return this._config.fontSize * 1.35 + 4;
    }
}