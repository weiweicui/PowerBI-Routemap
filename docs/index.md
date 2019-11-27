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
    * Revise **Glyphs - End**: Now you can change the glyphs placed at end points. There are several built-in shapes, such as cars and ships. You can also choose the option `Customize` to pass in any shape. By now, the customization is quite tricky and requires some programming background. You cannot drag-n-drop or open one from the file system. Instead, you need to provide a valid svg shape as a plain text. For example, this is a upward triangle `<path d="m0,-16l-10,20l20,0z"/>`, and this is a circle `<circle cx="0" cy="0" r="10"/>`. Our visual takes this kind of text as custom icons. Details about the format can be found [here](https://www.w3schools.com/graphics/svg_intro.asp). But you can also use online svg editors, like [this one](http://www.clker.com/inc/svgedit/svg-editor.html), to draw a shape and extract the corresponding text. When building your own shapes, please note that:
        * We align the route end with the (0,0) coordinate of the svg shape. So you should anchor your shape at (0,0).
        * If you want to align the glyph direction with the route, please point your glyph to the right.
        * If you want to color glyphs based on the route data, please do not include the `fill` attribute in your input text.
        * Sorry for the complexity. Will update this when find an easier solution.
* Update 1.2.10:
    * Add **Custom image** option to **Glyphs - End**. Now you can input a valid url to place a jpeg or png image at path ends. E.g., `https://assets-cdn.github.com/images/modules/logos_page/Octocat.png`. Please note that:
        * We align the route end with the image center.
        * We also consider the right is the direction of the image if the `Directional` option is on.
* Update 1.2.12:
    * Fix some bugs.
    * Adjust the **Glyphs - End** panel: Now you can choose from four different directions for your custom shapes or images.
* Update 1.3.1:
    * Fix the tooltip may not update issue.
* Update 1.4.*:
    * Update to API 2.6.0, a lot of changes, bugs expected. Please comment below if find any.
    * Remove the highlight feature. Now it only shows result, but cannot filter values for other visuals.
    * Add **Color - Autofill**, which can automatically assign distinct colors.
    * Add **Width - Autofill**. Numbers in the **Width** field are treated as categories, but sometimes we like to direclty use them as route widths. In this case, we can automatically assign the values. Please note that numbers >=32 are ignored (**Default** value is used here) to prevent drawing something insanely thick.

# How to Use (Latest Version)
* Required fields: 
    * **Timestamp**: Values in this field are used to decide the chronological order of the records. These values can be anything sortable, such as numbers and dates.
    * **Latitude** and **Longitude**: Geo-coordinates for the records. 
* Optional fields:
    * **Segment**: Records are grouped into routs based on this field. If not specified, all records are connected together.
    * **Color/Width/Dash Legend**: If specified, you can customize the route styles in the _Format_ tab. All of them have to be categorical.
    * **Tooltip**: Values here will be displayed when hovering over route arrows.

* Major settings:
    * **Legend**: You can customize labels for colors, widths, and dash types. If the labels are empty, they will not show in the legend.
    * **Color/Width/Dash**: These panel controls the visual attributes of the routes.
    * **Glyph - Middle - Interval**: This controls the sparseness of arrows. Too many arrows may cause visual clutter and slow down the performance.
    * **Glyph - End - Icon**: You can change the glyphs placed at end points. There are several built-in shapes, such as cars and ships, and two customization options. 
        * `Custom shape`: You can pass in any shape text. By now, the customization is quite tricky. You cannot drag-n-drop or open one from the file system. Instead, you need to provide a valid svg shape as a plain text. For example, this is a upward triangle `<path d="m0,-16l-10,20l20,0z"/>`, and this is a circle `<circle cx="0" cy="0" r="10"/>`. Our visual takes this kind of text as custom icons. Details about the format can be found [here](https://www.w3schools.com/graphics/svg_intro.asp). But you can also use online svg editors, like [this one](http://www.clker.com/inc/svgedit/svg-editor.html), to draw a shape and extract the corresponding text. When building your own shapes, please note that:
            * We align the route end with the (0,0) coordinate of the svg shape. So you should anchor your shape at (0,0).
            * If you want to color glyphs based on the route data, please do not include the `fill` attribute in your input text.
        * `Custom image`: You can input an image url for `jpeg` or `png` file. Then the visual will try to read and show it at route ends. E.g., `https://assets-cdn.github.com/images/modules/logos_page/Octocat.png`. Please note that:
            * We align the route end with the image center.
    * **Advanced** - **Ignore zeros** and **Ignore invalids**: These are two simple safeguards of the visual. If geo-locations are all zeros, i.e., _(0,0)_, or invalid, i.e., _abs(latitude) > 85.05112878 or abs(longitude) > 180_, they will be excluded from the visual. These two switches are on by default.
    * **Map control - Auto fit**: When it is on, whe visual will try to fit everything in one view when a data change is detected.
    * **Map element**: There are some high-level controls about what elements can be displayed in the visual.
    
* Need more help? Please leave a comment below.
