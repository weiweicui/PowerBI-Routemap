import { dict, StringMap, obj, groupBy, find } from 'type';
import { host, Persist } from "host";
import { tooltip } from "tooltip";
import { $cfg, reset, $mapctl, init, tryFitView } from 'bing/routemap/app';
import { Selection } from 'selection';
import { Format } from 'bing/routemap/format';
import { Grand } from 'data';
import * as routes from 'bing/routemap/route';
import { selectAll, select } from 'd3-selection';

type C_T_S = 'color' | 'thick' | 'style';
type C_T_S_R = C_T_S | 'route';
type Role = 'tooltip' | 'stamp' | 'latitude' | 'longitude' | C_T_S_R;

let CTS = ['color', 'thick', 'style'] as C_T_S[];
let CTSR = ['color', 'thick', 'style', 'route'] as C_T_S_R[];

class Context extends Grand<Role, Format> {
    constructor() {
        super(new Format(), ['stamp']);
        this.selection.highlight(rows => {
            routes.all().forEach(r => r.highlight(rows));
            tryFitView();
        });
        for (let role of CTSR) {
            this.fmt[role].bind(role, 'item', 'customize');
            if (role === 'route') {
                this.fmt.arrow.bind('route', 'item', 'customize');
            }
            else {
                this.fmt.legend.bind(role, role + '_label' as any, role);
            }
        }
        this.require(['stamp'], ['Timestamp']);
        this.roles.silence('tooltip');
    }

    update(view: powerbi.DataView): void{
        super.update(view);
        debugger;
        if (this.invalid()) {
            $cfg.legend = { color: {}, thick: {}, style: {} }
            reset({});
            return;
        }
        let interval = +this.fmt.arrow.meta.interval;
        if (isNaN(interval) || interval <= 0) {
            $cfg.glyph.interval =  Math.max(this.items.rows().length / 50, 1);
        }
        else {
            $cfg.glyph.interval = interval;
        }
        let glyph = this.property('arrow', 'item');
        $cfg.glyph.show = r => glyph(+r);
        CTS.forEach(k => { $cfg.legend[k] = this._buildLegendItems(k); });

        let fill = this.property('color', 'item');
        $cfg.color = r => fill(r).solid.color;
        let thick = this.property('thick', 'item');
        $cfg.thick = r => thick(r);
        let style = this.property('style', 'item');
        $cfg.style = r => style(r);

        let lats = this.column('latitude').values;
        $cfg.lat = r => +lats[r];
        let lons = this.column('longitude').values;
        $cfg.lon = r => +lons[r];
        let route = this.key('route');
        reset(dict(this.group('route'), r => route(r[0])));
        if (this.dirty('data')) {
            tryFitView();
        }
        else if (this.fmt.mapControl.flip('autofit') === 'on') {
            tryFitView();
        }
    }

    private _buildLegendItems(key: C_T_S) {
        if (!this.fmt.legend.meta[key]) {
            return {};
        }
        let cat = this.cat(key), label = key + '_label';
        if (!cat.column || !this.fmt[key].meta.customize) {
            let dft = this.fmt[key].meta.item as any;
            if (key === 'color') {
                dft = dft.solid.color;
            }
            let txt = this.fmt.legend.meta[label] as string || '';
            return !txt.trim() ? {} : obj(dft, txt);
        }
        let itemOf = this.property(key, 'item');
        let labelOf = this.fmt.legend.property(label as any);
        let valueOf = itemOf;
        if (key === 'color') {
            valueOf = r => (itemOf(r) as any).solid.color;
        }
        let result = {} as StringMap<string>;
        let rows = cat.distincts();
        let groups = groupBy(rows, valueOf) as StringMap<number[]>;
        for (let key in groups) {
            let row = find(groups[key], r => labelOf(+r));
            row !== undefined && (result[key] = labelOf(+row));
        }
        return result;
    }


    public invalid(view?: powerbi.DataView): string {
        view = view || this._view;
        if (!this._exist(view, 'stamp', 'longitude', 'latitude')) {
            return 'fields are missing';
        }
        return null;    
    }
}

let persist = {
    map: new Persist<[Microsoft.Maps.Location, number]>('persist', 'centerzoom')
};

let ctx = new Context();

export class Visual implements powerbi.extensibility.visual.IVisual {
    private _d3root : d3.Any;
    private _div: HTMLElement;
    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        host.init(options.host);
        tooltip.init(options);
        $cfg.selection.click = rows => {
            let column = ctx.column('route'), row = rows[0];
            let expr = column.source.expr['ref'];
            let value = ctx.value<string>('route')(row);
            let filter = Selection.shrink(host.id(column, row), expr, value);
            ctx.selection.click(rows, filter);
        };
        $cfg.selection.flags = () => ctx.selection.flags();
        routes.onGlyphCreated(sel => {
            tooltip.add(sel, arg => {
                let row = arg.data.row;
                let columns = ctx.columns('tooltip');
                if (!columns || !columns.length) {
                    return null;
                }
                return columns.map(col => <any>{
                    displayName: col.source.displayName,
                    value: col.values[row]
                });
            });
        });
        routes.onBadShape(show => {
            selectAll('.iconMsg').sty.display(show ? null : 'none');
        });
        this._div = options.element;
    }

    private _setupIconDiv(icon: d3.Any) {
        icon.selectAll('*').remove();
        let root = icon.att.class('iconMsg')
            .sty.background_color('#ec6d71')
            .sty.font_size('14px')
            .sty.display('none')
            .sty.position('absolute')
            .sty.padding('10px').sty.top('0px');
        root.append('div').sty.padding_bottom('5px').text(
            `The icon shape/url is invalid. Please visit the supporter's webpage for more information. ` +
            `In case the text is truncated by the format panel, which has about 250 character limit, please input it here instead:`);
        let ctls = root.append('div');
        ctls.append('input').att.type('input')
            .sty.padding_left('10px').sty.padding_right('10px').sty.margin_right('10px');
        ctls.append('button').att.type('button').text('Ok')
            .sty.margin_right('10px')
            .on('click', () => {
                var data = ctls.select('input').property('value');
                root.sty.display('none');
                ctx.fmt.arrow.persist('endData', data);
            });
        ctls.append('button').att.type('button').text('Cancel')
            .on('click', () => root.sty.display('none'));
    }

    private _loading = false;
    private _options = null as powerbi.extensibility.visual.VisualUpdateOptions;
    private _persistZoomCenter = true;
    public update(options: powerbi.extensibility.visual.VisualUpdateOptions) {
        if (this._loading) {
            this._options = options;
            return;
        }
        var view = options.dataViews[0] || {} as powerbi.DataView;
        // d3.select(this._div).selectAll('#bug').remove();
        // if (view && view.metadata && view.metadata.objects && view.metadata.objects['advance'] && view.metadata.objects['advance']['debug']) {            
        //     let bug = d3.select(this._div).append('textarea').attr('rows', 10).attr('cols', 50).att.id('bug').sty.position('absolute').sty.top('0px');
        //     let info = { meta: view.metadata.objects };
        //     if ($con.column('stamp', view)) {
        //         info['stamp'] = $con.column('stamp', view).values;
        //     }
        //     bug.text(JSON.stringify(info));
        // }

        if (!$mapctl) {
            this._options = options;
            this._loading = true;            
            ctx.init(view, 'mapControl', 'mapElement');

            let format = {} as Format;
            for (let key in ctx.fmt) {
                format[key] = ctx.fmt[key].meta;
            }

            init(this._div, format, map => {
                this._loading = false;//set to false
                this._setupIconDiv(select(this._div).append('div'));
                let view = this._options.dataViews[0];
                let [center, zoom] = persist.map.read(view, []);
                center && map.setView({ center, zoom });
                this.update(this._options);
            });            

            $mapctl.add({
                transform(m, p, e) {
                    e && persist.map.write([m.getCenter(), m.getZoom()], 400);
                }
            });            
            return;
        }

        if (host.dirtyPersist(view) && !ctx.invalid() && !ctx.invalid(view)) {
            console.log('return by new persist');
            return;
        }
        
        if (options.type === 4 || options.type === 36) {
            return;
        }
        if (options.type === powerbi.VisualUpdateType.ViewMode) {
            return;
        }
        ctx.update(view);
        console.log("update done");
    }

    public enumerateObjectInstances(options: powerbi.EnumerateVisualObjectInstancesOptions): powerbi.VisualObjectInstance[] {
        var oname = options.objectName;
        switch (oname) {
            case 'legend':
                let fill = ctx.fmt.color.property('item');            
                return ctx.inser(oname).meta(['show', 'position', 'fontSize'])
                    .custom('color_label', null, r => fill(r).solid.color)
                    .custom('thick_label', null, ctx.fmt.thick.property('item'))
                    .custom('style_label', null, ctx.fmt.style.property('item'))
                    .dump();
            case 'color':
            case 'thick':
            case 'style':
                return ctx.inser(oname).meta(['item']).custom('item').dump();
            case 'arrow':
                let { end, endShape } = ctx.fmt.arrow.meta;
                return ctx.inser(oname).meta(['show'])
                    .meta('start', ['startScale'])
                    .meta('middle', ['interval', 'middleScale'],  { interval: $cfg.glyph.interval })
                    .meta('end', ['endScale', 'endShape'])
                    .meta(endShape === 'customize' && end, ['endData', 'endDirectional'])
                    .meta(endShape === 'image' && end, ['endImage', 'endDirectional'])
                    .dump();
            case 'advance':
            case 'mapControl':
            case 'mapElement':
                return ctx.inser(oname).dump();
        }
        return [];
    }
}//end of Visual