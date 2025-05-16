// Define a utility function in the Leaflet library to generate WKT (Well-Known Text) representations of layers.
L.Util.getWKT = function(layer) {

    // Check if the layer is a Marker and return its WKT representation as a POINT.
    if (layer instanceof L.Marker)
        return 'POINT(' + coord2str(layer.getLatLng()) + ')';

    // Check if the layer is a Polygon and return its WKT representation as a POLYGON.
    else if (layer instanceof L.Polygon) {
        var closed = layer.getLatLngs();

        // Ensure the polygon is closed by adding the first point to the end if necessary.
        if (!closed[0].equals(closed[closed.length-1])) {
            closed.push(closed[0]);
        }
        return 'POLYGON(' + coord2str(closed) + ')';
    }

    // Check if the layer is a Polyline and return its WKT representation as a LINESTRING.
    else if (layer instanceof L.Polyline)
        return 'LINESTRING' + coord2str(layer.getLatLngs());

    // Default case: return a generic GEOMETRY if the layer type is not recognized.
    return 'GEOMETRY()';

    // Helper function to convert coordinates to a string representation.
    function coord2str(obj) {
        // If the object has longitude and latitude, return them as a string.
        if(obj.lng) return obj.lng + ' ' + obj.lat;

        // If the object is empty, return null.
        if(obj.length === 0) return null;

        var n, c, wkt = [];

        // Recursively process each coordinate and build the WKT string.
        for (n in obj) {
            c = coord2str(obj[n]);
            if (c) wkt.push(c);
        }

        // Return the WKT string enclosed in parentheses.
        return ("(" + String(wkt) + ")");
    }
};