// Vendor CSS (order preserved from base.html)
import 'maplibre-gl/dist/maplibre-gl.css';
import '../mapentity/static/mapentity/css/style-maplibre.css';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-datepicker/dist/css/bootstrap-datepicker.css';
import 'datatables.net-bs4/css/dataTables.bootstrap4.css';
import 'datatables.net-select-bs4/css/select.bootstrap4.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@ttskch/select2-bootstrap4-theme/dist/select2-bootstrap4.css';
import '../mapentity/static/mapentity/css/style.css';

// Head JS libraries exposed globally before body / extrahead scripts run
import 'jquery/jquery.js';
import Popper from 'popper.js';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import * as Geoman from '@geoman-io/maplibre-geoman-free';

window.Popper = Popper;
window.maplibregl = maplibregl;
window.turf = turf;
window.Geoman = Geoman;
