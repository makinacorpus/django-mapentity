// Vendor plugins (attach to global window.jQuery / window.Popper from mapentity-head.js)
import 'bootstrap';
import 'bootstrap-datepicker';
import 'jquery-resizable-dom';
import DataTable from 'datatables.net-bs4';
import 'datatables.net-select-bs4';
import * as toGeoJSON from '@mapbox/togeojson';
import 'jquery-hoverintent';

window.DataTable = DataTable;
window.toGeoJSON = toGeoJSON;

// MapEntity application scripts (load order preserved from base.html)
import '../mapentity/static/mapentity/js/MaplibreLayerManager.js';
import '../mapentity/static/mapentity/js/GeometryDataManager.js';
import '../mapentity/static/mapentity/js/MaplibreDrawControlManager.js';
import '../mapentity/static/mapentity/js/MaplibreFieldStore.js';
import '../mapentity/static/mapentity/js/MaplibreGeometryField.js';
import '../mapentity/static/mapentity/js/MaplibreScreenshotController.js';
import '../mapentity/static/mapentity/js/MaplibreMapentityHelpers.js';
import '../mapentity/static/mapentity/js/MaplibreSerializers.js';
import '../mapentity/static/mapentity/js/MaplibreRectangle.js';
import '../mapentity/static/mapentity/js/MaplibreMapentityContext.js';
import '../mapentity/static/mapentity/js/MaplibreMapentityHistory.js';
import '../mapentity/static/mapentity/js/MaplibreMapListSync.js';
import '../mapentity/static/mapentity/js/MaplibreMapentityTogglableFilter.js';
import '../mapentity/static/mapentity/js/MaplibreFileLayerControl.js';
import '../mapentity/static/mapentity/js/MaplibreObjectsLayer.js';
import '../mapentity/static/mapentity/js/MaplibreMeasureControl.js';
import '../mapentity/static/mapentity/js/MaplibreResetViewControl.js';
import '../mapentity/static/mapentity/js/MaplibreMap.js';
import '../mapentity/static/mapentity/js/MaplibreLayerControl.js';
import '../mapentity/static/mapentity/js/MaplibreMapentityViews.js';
import '../mapentity/static/mapentity/js/MaplibreMapentityMap.js';
import '../mapentity/static/mapentity/js/MaplibreMapentity.js';
import '../mapentity/static/mapentity/js/RelatedObjectLookups.js';
import '../mapentity/static/mapentity/jquery.formset-patched.js';
import '../mapentity/static/mapentity/jquery.deserialize.js';
import '../mapentity/static/mapentity/mapentity.snapping.js';
