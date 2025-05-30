class MaplibreScreenshotControl {
    static TITLE = 'Screenshot';

    constructor(url, getcontext) {
        this.url = url;
        this.getcontext = getcontext;
        this.options = {
            position: 'top-left'
        };
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

        this.fire('triggered');
    }

    onAdd(map) {
        this.map = map;
        this._container = document.createElement('div');
        this._container.className = 'leaflet-control-zoom leaflet-control leaflet-bar';

        const link = document.createElement('a');
        link.className = 'leaflet-control-zoom-out screenshot-control';
        link.href = '#';
        link.title = ScreenshotControl.TITLE;

        link.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.screenshot();
        });

        this._container.appendChild(link);
        return this._container;
    }

    fire(eventName) {
        // Simulation simple du système d'événements Leaflet
        if (this._events && this._events[eventName]) {
            this._events[eventName].forEach(callback => callback());
        }
    }

    on(eventName, callback) {
        if (!this._events) this._events = {};
        if (!this._events[eventName]) this._events[eventName] = [];
        this._events[eventName].push(callback);
    }

    off(eventName, callback) {
        if (this._events && this._events[eventName]) {
            this._events[eventName] = this._events[eventName].filter(cb => cb !== callback);
        }
    }
}