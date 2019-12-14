import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import { Format } from "./Format";
import { Persist, tooltip, Context } from '../pbi';
import * as app from '../lava/routemap/app';
import { override, StringMap, copy, dict } from '../lava/type';
import { ISelex, selex } from "../lava/d3";
import { MapFormat } from "../lava/bingmap";

type Role = 'tooltip' | 'stamp' | 'latitude' | 'longitude' | 'route' | 'color' | 'thick' | 'style';

const LEGEND = {
    color: { autofill: 'color_default', label: 'color_label' } as const,
    thick: { autofill: 'thick_default', label: 'thick_label' } as const,
    style: { autofill: 'style_default', label: 'style_label' } as const
} as const;

const persist = {
    map: new Persist<[Microsoft.Maps.Location, number]>('persist', 'centerzoom')
} as const;

export class Visual implements IVisual {
    private _target: HTMLElement;
    private _ctx = null as Context<Role, Format>;
    constructor(options: VisualConstructorOptions) {
        if (!options) {
            return;
        }
        this._target = options.element;
        tooltip.init(options);
        this._ctx = new Context(options.host, new Format());
        this._ctx.fmt.color.bind('color', 'item', 'customize', 'auto', k => {
            return { solid: { color: this._ctx.palette(k) } }
        });
        this._ctx.fmt.thick.bind('thick', 'item', 'customize', 'auto', k => {
            return (+k) > 36 ? +this._ctx.config('thick', 'item') : (+k);
        });
        this._ctx.fmt.style.bind('style', 'item', 'customize');
        this._ctx.fmt.arrow.bind('route', 'item', 'customize');

        this._ctx.fmt.legend.bind('color', 'color_label', 'color', 'color_default', '');
        this._ctx.fmt.legend.bind('thick', 'thick_label', 'thick', 'thick_default', '');
        this._ctx.fmt.legend.bind('style', 'style_label', 'style', 'style_default', '');
        app.events.route.onGlyphCreated = group => tooltip.add(group, arg => {
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
        app.events.route.onBadShape = show => selex('.iconMsg').sty.display(show ? null : 'none');
    }

    private _interval(): number {
        const interval = +this._ctx.meta.arrow.interval;
        if (interval <= 0 || isNaN(interval)) {
            return Math.max((this._ctx.rows().length || 50) / 50, 1);
        }
        return interval;
    }

    private _fillRouteConfig(config: app.Config['route']) {
        const ctx = this._ctx;
        if (!ctx.meta.arrow.show) {
            config.glyph.active = r => false;
        }
        else {
            const arrow = ctx.meta.arrow, glyph = ctx.fmt.arrow.item('item');
            config.glyph.active = r => glyph(r);
            if (arrow.start) {
                config.glyph.start = { scale: +arrow.startScale };
            }
            if (arrow.middle) {
                config.glyph.middle = { scale: +arrow.middleScale, interval: this._interval() };
            }
            if (arrow.end) {
                if (arrow.endShape === 'customize') {
                    config.glyph.end = {
                        scale: +arrow.endScale,
                        direction: arrow.endDirectional,
                        custom: arrow.endData
                    };
                }
                else if (arrow.endShape === 'image') {
                    config.glyph.end = {
                        scale: +arrow.endScale,
                        direction: arrow.endDirectional,
                        image: arrow.endImage
                    }
                }
                else {
                    config.glyph.end = {
                        scale: +arrow.endScale,
                        direction: arrow.endDirectional,
                        builtin: arrow.endShape
                    }
                }
            }
        }

        //lat/lon
        const lat = ctx.reader('latitude'), lon = ctx.reader('longitude');
        config.data = {
            lat: r => +lat(r),
            lon: r => +lon(r),
            color: ctx.fmt.color.item('item'),
            thick: ctx.fmt.thick.item('item'),
            style: ctx.fmt.style.item('item'),
            nonzero: ctx.meta.advance.nonzero,
            onlyvalid: ctx.meta.advance.onlyvalid
        }
        copy(ctx.meta.mapControl, config, ['autofit']);
    }

    private _config(): app.Config {
        const ctx = this._ctx, config = new app.Config();
        //legend field
        override(ctx.meta.legend, config.legend);

        config.legend.color = this._buildLegendItems('color');
        config.legend.thick = this._buildLegendItems('thick');
        config.legend.style = this._buildLegendItems('style');

        //map field
        copy(ctx.meta.mapControl, copy(ctx.meta.mapElement, config.map));

        //glyph field
        this._fillRouteConfig(config.route);

        //autofit
        copy(ctx.meta.mapControl, config.route, ['autofit']);
        return config;
    }

    private _buildLegendItems(role: 'color' | 'thick' | 'style'): StringMap<string> {
        const ctx = this._ctx, legend = ctx.fmt.legend, { autofill, label } = LEGEND[role];
        if (!legend.config(role)) {
            return {};//hide legend
        }
        const arr = ctx.labels(ctx.binding(role, 'item'), legend.special(label));
        if (legend.config(autofill)) {
            return dict(arr, a => a.key, a => a.value || a.auto);
        }
        else {
            return dict(arr.filter(a => a.value), a => a.key, a => a.value);
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

    public update(options: VisualUpdateOptions) {
        const view = options.dataViews && options.dataViews[0] || {} as powerbi.DataView;
        if (Persist.update(view)) {
            // console.log("Return due to persist update");
            return;
        }
        if (this._initing) {
            return;
        }
        const ctx = this._ctx.update(view);
        if (!this._inited) {
            this._initing = true;
            const mapFmt = new MapFormat();
            override(ctx.original('mapControl'), override(ctx.original('mapElement'), mapFmt));
            app.init(this._target, mapFmt, ctl => {
                this._setupIconDiv(selex(this._target).append('div'));
                const [center, zoom] = persist.map.value() || [null, null];
                center && ctl.map.setView({ center, zoom });
                ctl.add({
                    transform: (c, _, e) => e && persist.map.write([c.map.getCenter(), c.map.getZoom()], 400)
                });
                this._initing = false;
                app.reset(this._config(), this._data());
            });
            this._inited = true;
        }
        else {
            if (ctx.isResizeVisualUpdateType(options)) {
                return;
            }
            const config = this._config(), route = config.route;
            if (ctx.dirty()) {
                config.route = { autofit: route.autofit };
                if (ctx.dirty(['color', 'thick', 'style', 'advance'])) {
                    config.route.data = route.data;
                }
                if (ctx.dirty(['arrow'])) {
                    config.route.glyph = route.glyph;
                }
                if (!ctx.dirty(['mapControl', 'mapElement'])) {
                    config.map = null;
                }
                app.reset(config, null);
            }
            else {
                app.reset(config, this._data());
            }
        }
    }

    private _data(): number[][] {
        const ctx = this._ctx;
        return (ctx.cat('stamp') && ctx.cat('latitude') && ctx.cat('longitude')) ? ctx.group('route') : [];
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
        const oname = options.objectName, ctx = this._ctx, fmt = ctx.fmt;
        switch (oname) {
            case 'legend':
                return fmt.legend.dumper()
                    .metas(['show', 'position', 'fontSize'])
                    .labels(ctx.binding('color', 'item'), LEGEND['color'].label, true)
                    .labels(ctx.binding('thick', 'item'), LEGEND['thick'].label, true)
                    .labels(ctx.binding('style', 'item'), LEGEND['style'].label, true)
                    .result;
            case 'mapControl':
                return fmt.mapControl.dumper().default;
            case 'mapElement':
                return fmt.mapElement.dumper().default;
            case 'color':
                return fmt.color.dumper().specification('item').result;
            case 'thick':
                return fmt.thick.dumper().specification('item').result;
            case 'style':
                return fmt.style.dumper().specification('item').result;
            case 'arrow':
                const { end, endShape, show } = ctx.meta.arrow;
                const inst = ctx.fmt.arrow.dumper().metas(['show']);
                if (!show) {
                    return inst.result;
                }
                return inst
                    .metas('start', ['startScale'])
                    .metas('middle', ['interval', 'middleScale'], { interval: this._interval() })
                    .metas('end', ['endScale', 'endShape'])
                    .metas(endShape === 'customize' && end, ['endData', 'endDirectional'])
                    .metas(endShape === 'image' && end, ["endImage", 'endDirectional'])
                    .items(!!ctx.cat('route'), 'item')
                    .result;
        }
    }
}