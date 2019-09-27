import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import { Format } from "./Format";
import { Persist } from "../pbi/Persist";
import * as app from '../lava/bingmap/routemap/app';
import { RoutemapConfig } from '../lava/bingmap/routemap/config';
import { Context } from '../pbi/Context';
import { override, groupBy, StringMap, first, Func } from '../lava/type';
import * as deepmerge from 'deepmerge';
import * as route from '../lava/bingmap/routemap/route';
import { ISelex, selex } from "../lava/d3";
import { tooltip } from '../pbi/tooltip';
import { MapFormat } from "../lava/bingmap/controller";

type C_T_S = 'color' | 'thick' | 'style';
type Role = 'tooltip' | 'stamp' | 'latitude' | 'longitude' | 'route' | C_T_S;

const CTS = ['color', 'thick', 'style'] as const;

const LEGEND = {
    color: { role: 'color', default: 'color_default', label: 'color_label' } as const,
    thick: { role: 'thick', default: 'thick_default', label: 'thick_label' } as const,
    style: { role: 'style', default: 'style_default', label: 'style_label' } as const
} as const;

const persist = { map: new Persist<[Microsoft.Maps.Location, number]>('persist', 'centerzoom') } as const;

function autoThick(key: string, deft: number) {
    const result = +key || deft;
    return result === deft || result > 36 ? deft : result;
}

export class Visual implements IVisual {
    private _target: HTMLElement;
    private _ctx = null as Context<Role, Format>;
    private _config = null as Readonly<RoutemapConfig>;
    constructor(options: VisualConstructorOptions) {
        if (!options) {
            return;
        }
        this._target = options.element;
        tooltip.init(options);
        this._ctx = new Context(options.host, new Format());
        this._ctx.fmt.color.bind('color', 'item', 'customize');
        this._ctx.fmt.thick.bind('thick', 'item', 'customize');
        this._ctx.fmt.style.bind('style', 'item', 'customize');
        this._ctx.fmt.arrow.bind('route', 'item', 'customize');

        this._ctx.fmt.legend.bind('color', 'color_label', 'color');
        this._ctx.fmt.legend.bind('thick', 'thick_label', 'thick');
        this._ctx.fmt.legend.bind('style', 'style_label', 'style');
        route.events.onGlyphCreated = group => tooltip.add(group, arg => {
            const row = arg.data.row;
            const columns = this._ctx.columns('tooltip');
            if (!columns || !columns.length) {
                return null;
            }
            return columns.map(c => <VisualTooltipDataItem>{
                displayName: c.source.displayName,
                value: c.values[row] + ""
            });
        });
        selex(this._target).sty.cursor('default');
        route.events.onBadShape = show => selex('.iconMsg').sty.display(show ? null : 'none');
    }

    private config(): RoutemapConfig {
        const ctx = this._ctx;
        const config = new RoutemapConfig();
        //legend field
        override(ctx.config('legend'), config.legend);
        for (const v of CTS) {
            config.legend[v] = this._buildLegendItems(v);
        }
        //map field
        override(deepmerge(ctx.config('mapControl'), ctx.config('mapElement')), config.map);
        //glyph field
        override(ctx.config('arrow'), config.glyph);

        const glyph = ctx.fmt.arrow.property('item');
        config.glyph.active = r => config.glyph.show && glyph(r);

        //lat/lon
        const lat = ctx.value('latitude'), lon = ctx.value('longitude');
        config.lat = r => +lat(r);
        config.lon = r => +lon(r);

        //category
        config.color = this._property('color') as Func<number, string>;
        config.thick = this._property('thick') as Func<number, number>;
        config.style = ctx.fmt.style.property('item');

        if (config.glyph.interval <= 0 || isNaN(config.glyph.interval)) {
            config.glyph.interval = Math.max((ctx.rows().length || 50) / 50, 1);
        }

        //nonzero, onlyvalid
        override(ctx.config('advance'), config);
        //autofit
        override(ctx.config('mapControl'), config);
        return config;
    }

    private _buildLegendItems(role: C_T_S): StringMap<string> {
        const ctx = this._ctx;
        const legend = ctx.config('legend');
        if (!legend[role]) {
            //hide legend
            return {};
        }
        const cat = ctx.cat(role), defaultLabel = LEGEND[role].label;
        const autofill = legend[LEGEND[role].default];
        if (!cat || !ctx.fmt[role].meta.customize) {
            const txt = (legend[defaultLabel] || '').trim();
            return txt ? { [ctx.metaValue(role, 'item')]: txt } : {};
        }
        else {
            //has cat && customized
            const key = ctx.cat(role).key;
            const customLabels = ctx.fmt.legend.special(defaultLabel);
            const result = {} as StringMap<string>;
            const groups = groupBy(cat.distincts(), this._property(role));
            for (const g in groups) {
                const row = first(groups[g], r => key(r) in customLabels);
                if (row !== undefined) {
                    result[g] = customLabels[key(row)] as string;
                }
                else if (autofill) {
                    result[g] = groups[g].map(r => key(r)).join(', ');
                }
            }
            return result;
        }
    }

    private _setupIconDiv(icon: ISelex) {
        icon.selectAll('*').remove();
        const root = icon
            .att.class('iconMsg')
            .sty.background_color('#ec6d71')
            .sty.font_size('14px')
            .sty.display('none')
            .sty.position('absolute')
            .sty.padding('10px').sty.top('0px');
        root.append('div')
            .style("padding-bottom", '5px')
            .text(
                `The icon shape/url is invalid. Please visit the supporter's webpage for more information. ` +
                `In case the text is truncated by the format panel, which has about 250 character limit, please input it here instead:`);
        const ctls = root.append('div');
        ctls.append('input')
            .attr("type", 'input')
            .style("padding-left", '10px')
            .style("padding-right", '10px')
            .style("margin-right", '10px');
        ctls.append('button')
            .att.type('button').text('Ok')
            .sty.margin_right('10px')
            .on('click', () => {
                var data = ctls.select('input').property('value') as string;
                root.sty.display('none');
                this._ctx.fmt.arrow.persist('endData', data);
            });
        ctls.append('button')
            .att.type('button').text('Cancel')
            .on('click', () => root.sty.display('none'));
    }

    private _inited = false;
    private _initing = false;
    private _options = null as VisualUpdateOptions;

    public update(options: VisualUpdateOptions) {
        const view = options.dataViews && options.dataViews[0];
        if (Persist.update(view)) {
            // console.log("Return due to persist update");
            return;
        }
        if (this._initing) {
            this._options = options;
            return;
        }
        if (!this._inited) {
            this._options = options;
            this._initing = true;
            const mapFmt = new MapFormat();
            override(this._ctx.metaObj(view, 'mapControl'), mapFmt);
            override(this._ctx.metaObj(view, 'mapElement'), mapFmt);
            app.init(this._target, mapFmt, ctl => {
                this._setupIconDiv(selex(this._target).append('div'));
                const [center, zoom] = persist.map.value() || [null, null];
                center && ctl.map.setView({ center, zoom });
                ctl.add({ transform: (c, p, e) => e && persist.map.write([c.map.getCenter(), c.map.getZoom()], 400) });
                this._initing = false;
                this.update(this._options);
                this._options = null;
            });
            this._inited = true;
        }
        else {
            if (options.type === 4 || options.type === 32 || options.type === 36) {
                return;
            }
            const ctx = this._ctx;
            ctx.update(view);
            const valid = ctx.cat('stamp') && ctx.cat('latitude') && ctx.cat('longitude');
            this._config = this.config();
            if (ctx.dirtyFormat()) {
                if (ctx.dirtyFormat(['color', 'thick', 'style', 'advance', 'arrow'])) {
                    app.reset(this._config, valid ? ctx.group('route') : []);
                }
                else {
                    if (ctx.fmt.legend.dirty()) {
                        app.repaint(this._config, 'legend');
                    }
                    if (ctx.fmt.mapControl.dirty() || ctx.fmt.mapElement.dirty()) {
                        if (ctx.fmt.mapControl.dirty(['type', 'lang', 'pan', 'zoom']) || ctx.fmt.mapElement.dirty()) {
                            app.repaint(this._config, 'map');
                        }
                        if (ctx.fmt.mapControl.dirty('autofit') === 'on') {
                            app.tryFitView();
                        }
                    }
                }
            }
            else {
                app.reset(this._config, valid ? ctx.group('route') : []);
                app.tryFitView();
            }
        }
    }

    private _property(role: C_T_S) {
        let auto = undefined as Func<string, string | number>, ctx = this._ctx;
        if (role === 'color' && ctx.fmt.color.meta.auto) {
            auto = k => ctx.palette(k);
        }
        if (role === 'thick' && ctx.fmt.thick.meta.auto) {
            const thick = ctx.fmt.thick.meta.item;
            auto = k => autoThick(k, thick);
        }
        return ctx.property(role, 'item', auto);
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        const oname = options.objectName, ctx = this._ctx;
        switch (oname) {
            case 'legend':
                const legend = ctx.fmt.legend;
                const ins = legend.instancer().metas(['show', 'position', 'fontSize']);
                for (const role of CTS) {
                    const key = LEGEND[role];
                    const prop = this._property(role);
                    ins.metas([role]);
                    if (ctx.fmt[role].meta.customize && ctx.cat(role)) {
                        if (legend.meta[role]) {
                            ins.metas([key.default]);
                            ins.items(key.label, null, prop, legend.meta[key.default]);
                        }
                    }
                    else if (legend.meta[role]) {
                        ins.metas([key.label]);
                    }
                }
                return ins.dump();
            case 'mapControl':
            case 'mapElement':
                return ctx.fmt[oname].objectInstances();
            case 'color':
            case 'thick':
                const temp = ctx.fmt[oname].instancer().metas(['item']);
                if (ctx.cat(oname)) {
                    temp.metas(['customize']);
                    if (ctx.fmt[oname].meta.customize) {
                        temp.metas(['auto']);
                        temp.items('item', null, null, this._property(oname));
                    }
                }
                return temp.dump();
            case 'style':
                const style = ctx.fmt[oname].instancer().metas(['item']);
                if (ctx.cat(oname)) {
                    style.conditionalItems('item');
                }
                return style.dump();
            case 'arrow':
                const { end, endShape, show } = ctx.config('arrow');
                const inst = ctx.fmt.arrow.instancer().metas(['show']);
                if (!show) {
                    return inst.dump();
                }
                inst.conditionalMetas('start', ['startScale'])
                    .conditionalMetas('middle', ['interval', 'middleScale'], { interval: this._config.glyph.interval })
                    .conditionalMetas('end', ['endScale', 'endShape'])
                    .conditionalMetas(endShape === 'customize' && end, ['endData', 'endDirectional'])
                    .conditionalMetas(endShape === 'image' && end, ["endImage", 'endDirectional']);
                if (ctx.cat('route')) {
                    inst.conditionalItems('item');
                }
                return inst.dump();
        }
    }
}