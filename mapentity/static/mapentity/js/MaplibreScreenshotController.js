class MaplibreScreenshotController {

    constructor(url, getcontext) {
        this.url = url;
        this.getcontext = getcontext;
        this.map = null;
        this.container = null;
    }

    screenshot() {
        // Effet visuel de capture d'écran avec jQuery
        $('<div id="overlay" style="z-index: 5000; position:fixed; top:0; left:0; width:100%; height:100%; background-color: white;"> </div>')
            .appendTo(document.body) // Ajoute un overlay blanc au document
            .fadeOut(); // Fait disparaître l'overlay

        const fullContext = this.getcontext();

        // Hack pour télécharger une réponse en pièce jointe via Ajax avec jQuery
        $('<form action="' + this.url + '" method="post">' +
        '<textarea name="printcontext">' + fullContext + '</textarea>' +
        '</form>').appendTo('body').submit().remove(); // Soumet et supprime le formulaire
    }

    onAdd(map) {
        this.map = map; // faire attention : référence à la carte et pas instance de MaplibreMap qui lui possède une référence à la carte

        // Créer le conteneur principal
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group maplibregl-screenshot';

        // Bouton pour prendre une capture d'écran
        const button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.setAttribute('title', 'Capture d\'écran');
        button.className = 'maplibregl-ctrl-icon maplibregl-screenshot';

        const img = document.createElement('img');
        img.src = '/static/mapentity/images/screenshot.png'; // Adapter le chemin selon vos besoins
        img.alt = 'Screenshot';
        img.style.width = '25px';
        img.style.height = '25px';
        img.style.padding = '2px';
        button.appendChild(img);
        this.container.appendChild(button);

        // Ajouter l'événement de clic pour prendre la capture d'écran
        button.onclick = () => this.screenshot();

        return this.container;
    }
}