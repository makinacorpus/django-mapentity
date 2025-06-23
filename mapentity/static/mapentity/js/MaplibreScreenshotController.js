class MaplibreScreenshotController {

    constructor(url, getcontext) {
        this.url = url;
        this.getcontext = getcontext;
        this.map = null;
        this.container = null;
    }

    screenshot() {
        // Effet visuel de capture d'écran (même logique que l'original)
        const overlay = document.createElement('div');
        overlay.id = 'overlay';
        overlay.style.cssText = 'z-index: 5000; position:fixed; top:0; left:0; width:100%; height:100%; background-color: white;';
        document.body.appendChild(overlay);

        // Simulation du fadeOut jQuery
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);

        const fullContext = this.getcontext();

        // Hack pour télécharger une réponse en pièce jointe via Ajax (même logique)
        const form = document.createElement('form');
        form.action = this.url;
        form.method = 'post';

        const textarea = document.createElement('textarea');
        textarea.name = 'printcontext';
        textarea.value = fullContext;

        form.appendChild(textarea);
        document.body.appendChild(form);
        form.submit();
        form.remove();
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