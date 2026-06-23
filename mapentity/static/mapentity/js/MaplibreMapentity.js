if (!window.MapEntity) window.MapEntity = {};

document.addEventListener('DOMContentLoaded', function() {

    /**
     * Fills the maximum height of elements with the class .scrollable
     */
    function fillmax() {
        document.querySelectorAll('.scrollable').forEach(function(element) {
            if (window.innerWidth >= 992) {
                // Calculation of the available height for the panels
                const rect = element.getBoundingClientRect();
                const computedStyle = getComputedStyle(element);
                const marginTop = parseFloat(computedStyle.marginTop) || 0;
                const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
                const height = window.innerHeight - rect.top - marginTop - marginBottom;
                element.style.maxHeight = height + 'px';
            } else {
                // Disable maximum height for small screens
                element.style.maxHeight = 'none';
            }
        });
    }

    // Call the fillmax function after a delay and on window resize
    setTimeout(fillmax, 0);
    window.addEventListener('resize', fillmax);

    // Top navigation tabs rendering
    const history = new MaplibreMapentityHistory();
    if (history) {
        window.MapEntity.currentHistory = history;
        history.render();
    }

    // Make success/information messages disappear after a delay
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


    // Managing cancel buttons in forms
    const cancelButton = document.getElementById('button-id-cancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            window.history.go(-1);
        });
    }

    // Auto-display element management
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

    // Context Retrieval
    const bodyElement = document.body;
    const context = Object.assign({}, bodyElement.dataset);

    // Direct card initialization
    const mapId = context.viewname === 'detail' ? 'detailmap' : 'mainmap';
    const mapElement = document.getElementById(mapId);

    if (!mapElement) {
        console.warn(`Élément de carte '${mapId}' non trouvé`);
        return;
    }

    // card initialization

    const { BOUNDS, DEFAULT_CENTER, DEFAULT_ZOOM, SCALE, TILES, MAX_ZOOM } = window.SETTINGS.map.maplibreConfig;
    const bounds = [BOUNDS[0], BOUNDS[1]];

    const map = new MaplibreMap(mapId, DEFAULT_CENTER, DEFAULT_ZOOM, MAX_ZOOM, bounds, SCALE);
    window.map = map;
    const modelname = context.modelname;
    const objects_verbose_name = document.body.getAttribute('data-objectsname');
    const objectUrlTemplate = window.SETTINGS.urls.detail.replace(/modelname/g, modelname);
    const layerUrl = window.SETTINGS.urls.layer.replace(/modelname/g, modelname);
    const mvtUrl = window.SETTINGS.urls.mvt ? window.SETTINGS.urls.mvt.replace(/modelname/g, modelname) : undefined;
    const tilejsonUrl = window.SETTINGS.urls.tilejson ? window.SETTINGS.urls.tilejson.replace(/modelname/g, modelname) : undefined;
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
        mvtUrl: mvtUrl,
        tilejsonUrl: tilejsonUrl,
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
            mvtUrl : mvtUrl,
            tilejsonUrl : tilejsonUrl,
        }
    });
    window.dispatchEvent(mapReadyEvent);

});
