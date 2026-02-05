if (!window.MapEntity) window.MapEntity = {};

document.addEventListener('DOMContentLoaded', function() {

    /**
     * Remplit la hauteur maximale des éléments avec la classe .scrollable
     */
    function fillmax() {
        document.querySelectorAll('.scrollable').forEach(function(element) {
            if (window.innerWidth >= 992) {
                // Calcul de la hauteur disponible pour les panneaux
                const rect = element.getBoundingClientRect();
                const computedStyle = getComputedStyle(element);
                const marginTop = parseFloat(computedStyle.marginTop) || 0;
                const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
                const height = window.innerHeight - rect.top - marginTop - marginBottom;
                element.style.maxHeight = height + 'px';
            } else {
                // Désactiver la hauteur maximale pour les petits écrans
                element.style.maxHeight = 'none';
            }
        });
    }

    // Appeler la fonction fillmax après un délai et lors du redimensionnement de la fenêtre
    setTimeout(fillmax, 0);
    window.addEventListener('resize', fillmax);

    // Appliquer le plugin "Chosen" aux éléments avec la classe .chzn-select (si disponible)
    if (window.jQuery && window.jQuery.fn.chosen) {
        jQuery(".chzn-select").chosen();
    }

    // Rendu des onglets de navigation supérieure
    const history = new MaplibreMapentityHistory();
    if (history) {
        window.MapEntity.currentHistory = history;
        history.render();
    }

    // Faire disparaître les messages de succès/informations après un délai
    const alertBox = document.querySelector('#alert-box');
    if (alertBox) {
        const alerts = alertBox.querySelectorAll('.alert');
        alerts.forEach(function(alert) {
            setTimeout(function() {
                alert.style.transition = 'opacity 0.5s';
                alert.style.opacity = '0';
                setTimeout(function() {
                    alert.remove();
                }, 500);
            }, 2000);
        });
    }


    // Gestion des boutons d'annulation dans les formulaires
    const cancelButton = document.getElementById('button-id-cancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            window.history.go(-1);
        });
    }

    // Gestion des éléments à affichage automatique
    document.querySelectorAll('.autohide').forEach(function(element) {
        const parent = element.parentElement;
        if (parent) {
            parent.addEventListener('mouseenter', function() {
                element.classList.add('hover');
            });
            parent.addEventListener('mouseleave', function() {
                element.classList.remove('hover');
            });
        }
    });

    // Récupération du contexte
    const bodyElement = document.body;
    const context = Object.assign({}, bodyElement.dataset);

    // Initialisation directe de la carte
    const mapId = context.viewname === 'detail' ? 'detailmap' : 'mainmap';
    const mapElement = document.getElementById(mapId);

    if (!mapElement) {
        console.warn(`Élément de carte '${mapId}' non trouvé`);
        return;
    }

    // initialisation de la carte

    const { BOUNDS, DEFAULT_CENTER, DEFAULT_ZOOM, SCALE, TILES, MAX_ZOOM } = window.SETTINGS.map.maplibreConfig;
    const bounds = [BOUNDS[0], BOUNDS[1]];

    const map = new MaplibreMap(mapId, DEFAULT_CENTER, DEFAULT_ZOOM, MAX_ZOOM, bounds, SCALE);
    window.map = map;
    const modelname = context.modelname;
    const objects_verbose_name = document.body.getAttribute('data-objectsname');
    const objectUrlTemplate = window.SETTINGS.urls.detail.replace(/modelname/g, modelname);
    const layerUrl = window.SETTINGS.urls.layer.replace(/modelname/g, modelname);
    const layerManager = new MaplibreLayerManager();
    const mapentityContext = new MaplibreMapentityContext(bounds, layerManager);

    let style = window.SETTINGS.map.styles[modelname] || window.SETTINGS.map.styles['others'];
    if (typeof style !== 'function') style = { ...style };
    let detailStyle = window.SETTINGS.map.styles.detail;
    if (typeof detailStyle !== 'function') detailStyle = { ...detailStyle };
    const nameHTML = '<span style="color:' + style['color'] + ';">&#x25A3;</span>&nbsp;' + objects_verbose_name;
    const category = gettext("Objects");
    const primaryKey = generateUniqueId();

    const objectsLayer = new MaplibreObjectsLayer(null, {
        objectUrl: props => objectUrlTemplate.replace('0', props.id),
        style,
        detailStyle,
        modelname: modelname,
        readonly: false,
        nameHTML : nameHTML,
        category: category,
        dataUrl: layerUrl,
        primaryKey: primaryKey,
        isLazy: false,
        displayPopup: true,
    });

    const mapReadyEvent = new CustomEvent('entity:map:ready', {
        detail: {
            map: map,
            objectsLayer: objectsLayer,
            context: context,
            mapentityContext: mapentityContext,
            TILES : TILES,
            bounds : bounds,
            layerManager: layerManager,
            layerUrl : layerUrl,
        }
    });
    window.dispatchEvent(mapReadyEvent);

});
