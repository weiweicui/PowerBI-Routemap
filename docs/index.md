---
layout: default
title: PowerBI - Routemap Custom Visual
image_sliders:
  - slider1
---

[comment]: # (checklist: )
[comment]: # (a. _data/sliders.yml: change the images)
[comment]: # (b. _incudes/disqus_comments.html: change the forum id)
[comment]: # (c. index.md: title and content)

# Background
This is a custom visual built for PowerBI to support rout visualization. Route map basically visualizes trajectories of objects, such as taxies, vessels, airplanes, and hurricanes.

{% include slider.html selector="slider1" %}

# Where to Get It

You can get it from the [_Office Store_](https://store.office.com/en-us/app.aspx?assetid=WA104380985&sourcecorrid=95716b6f-f393-4115-9447-5bbfa5b95537&searchapppos=0&ui=en-US&rs=en-US&ad=US&appredirect=false) or in the [_dist_](https://github.com/weiweicui/PowerBI-Routemap/tree/master/dist) folder of this [_repo_](https://github.com/weiweicui/PowerBI-Routemap).

* Update 1.0.1:
    * Add **Advanced - Language**: Can change the language used by the background map.
* Update 1.1.2:
    * Handle routes that cross the antimeridian.
* Update 1.2.1:
    * Add **Map control** format: Map-related controls are moved here (from **Advance**). Some more controls are added, such as map type.
    * Add **Map element** format: If you find some map element distracting, you can turn them off here to give you a clearer background.
    * Fix some bugs and improve the cross-filtering performance.
* Update 1.2.2:
    * Revise **Glyphs - Middle - Interval**: Now arrows are evenly distrbuted on routes.
    * Revise **Glyphs - End**: Now you can change the glyphs placed at end points. There are several built-in shapes, such as cars and ships. You can also choose the option `Customize` to pass in any shape. By now, the customization is a little tricky. You cannot drag-n-drop or open one from the file system. Instead, you need to provide a valid svg shape as a plain text. For example, this is a upward triangle glyph `<path d="m0,-16l-10,20l20,0z"/>`, and this is a circle `<circle cx="0" cy="0" r="10"/>`. Details about the format can be found [here](https://www.w3schools.com/graphics/svg_intro.asp). But you can also use svg editor, like [this one](http://www.clker.com/inc/svgedit/svg-editor.html), to draw shapes and extract the corresponding text. Also, when building your own shapes, please note that:
        * We align the route end with the (0,0) coordinate of the svg shape.
        * If your want to align the glyph direction with the route, please point your glyph to the right.

# How to Use
* Required fields: 
    * **Timestamp**: Values in this field are used to decide the chronological order of the records. These values can be anything sortable, such as numbers and dates.
    * **Latitude** and **Longitude**: Geo-coordinates for the records. 
* Optional fields:
    * **Segment**: Records are grouped into routs based on this field. If not specified, all records are connected together.
    * **Color/Width/Dash Legend**: If specified, you can customize the route styles in the _Format_ tab.
    * **Tooltip**: Values here will be displayed when hovering over route arrows.

* Special settings:
    * **Legend**: You can customize labels for colors, widths, and dash types. If the labels are empty, they will not show in the legend.
    * **Arrow** - **Interval**: This controls the sparseness of arrows. Too many arrows may cause visual clutter and slow down the performance.
    * **Dash**: There are several dash types available. However, drawing very long dashed lines may slow down your browser.
    * **Advanced** - **Ignore zeros** and **Ignore invalids**: These are two simple safeguards of the visual. If geo-locations are all zeros, i.e., _(0,0)_, or invalid, i.e., _abs(latitude) > 85.05112878 or abs(longitude) > 180_, they will be excluded from the visual. These two switches are on by default.
    
* Need more help? Please leave a comment below.
