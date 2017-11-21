## Routemap custom visual for PowerBI

* Please find the plugin files in the **dist** folder.
* Please find the source code in the **code** folder.
    * Please check the official PBI custom visual guide first.
    * `npm install` to setup nodejs packages.
    * `npm run watch` to start the custom visual, which is a shortcut for:
        * `tsc` to compile ts files into the `./.bundle` folder.
        * `rollup -c` to bundle all compiled js files in to a single `./visual/app.js` file.
        * `pbiviz start` in the `./visual` folder to activate the custom visual.
* Need more info/help? Please visit [here](https://weiweicui.github.io/PowerBI-Routemap).
