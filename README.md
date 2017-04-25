## Backgound
This is a custom visual built for PowerBI to support rout visualization.

![](assets/screenshot.png)

## How to Use
* Required fields: 
    * **Timestamp**: Values in this field are used to decide the chronological order of the records. These values can be anything sortables, such as numbers and dates.
    * **Latitude** and **Longitude**: Geo-coordinates for the records. 
* Optional fields:
    * **Segment**: Records are grouped into routs based on this field. If not specified, all records are connected together.
    * **Color/Width/Dash Legend**: If specified, you can customize the route styles in the _Format_ tab.
    * **Tooltip**: Values here will be displayed when hovering over route arrows.

* Special settings:
    * **Legend**: You can customize labels to for different colors, widths, and dashes. If the labels are empty, they will not show in the legend.
    * **Arrow** - **Interval**: This controls the sparseness of arrows. Too many arrows may cause visual clutter and slow down the performance.
    * **Dash**: They are dash types available. However, drawing very long dashed routes may slow down your browser.
    * **Advanced** - **Ignore zeros** and **Ignore invalids**: These are simple safeguards of the visual. If geo-locations are all zeros, i.e., _(0,0)_, or invalid, i.e., _Math.abs(latitude) > 85.05112878 or Math.abs(longitude) < 180_, they will be ignored from the visual. These two switches are on by default.
* Need more help? Please leave a comment [here](https://weiweicui.github.io/PowerBI-Routemap).

***
{% include disqus_comments.html %}