class MaplibreScreenshotController {
    /**
     * Control to take a screenshot of the MapLibre map.
     * @param url {string} - The server URL to send the screenshot to.
     * @param getcontext {function} - Function to get the full context of the map to capture.
     */
    constructor(url, getcontext) {
        this.url = url;
        this.getcontext = getcontext;
        this.map = null;
        this.container = null;
    }

    /**
     * Take a screenshot of the map and send the context to the server.
     */
    screenshot() {
        // Screenshot visual effect with jQuery
        $('<div id="overlay" style="z-index: 5000; position:fixed; top:0; left:0; width:100%; height:100%; background-color: white;"> </div>')
            .appendTo(document.body)
            .fadeOut();

        const fullContext = this.getcontext();

        // Hack to download a response as an attachment via Ajax with jQuery
        $('<form action="' + this.url + '" method="post">' +
        '<textarea name="printcontext">' + fullContext + '</textarea>' +
        '</form>').appendTo('body').submit().remove();
    }

    /**
     * Adds the screenshot control to the MapLibre map.
     * @param map {maplibregl.Map} - The MapLibre map instance to which the control is added.
     * @returns {null} - Returns the main container of the screenshot control.
     */
    onAdd(map) {
        this.map = map; // attention: reference to the map and not an instance of MaplibreMap which itself has a reference to the map

        // Create the main container
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group maplibregl-screenshot';

        // Button to take a screenshot
        const button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.setAttribute('title', gettext('Screenshot'));
        button.className = 'maplibregl-ctrl-icon maplibregl-screenshot';

        const img = document.createElement('img');
        img.src = '/static/mapentity/images/screenshot.png';
        img.alt = 'Screenshot';
        img.style.width = '25px';
        img.style.height = '25px';
        img.style.padding = '2px';
        button.appendChild(img);
        this.container.appendChild(button);

        // Add the click event to take a screenshot
        button.onclick = () => this.screenshot();

        return this.container;
    }
}