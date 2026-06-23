/**
 * Converts a geometry object into its WKT (Well-Known Text) representation.
 * @param geometry {Object} - The geometry object to convert, which must contain a type and coordinates.
 * @returns {string} - The WKT string representing the geometry, or 'GEOMETRY()' if the type is not recognized.
 */
function getWKT(geometry){
    if(geometry.type === 'Point'){
        return `POINT(${geometry.coordinates.join(' ')})`;
    }

    if(geometry.type === 'Polygon'){
        const coordinates = geometry.coordinates[0].map(coord => coord.join(' ')).join(', ');
        return `POLYGON((${coordinates}))`;
    }

    if(geometry.type === 'LineString'){
        const coordinates = geometry.coordinates.map(coord => coord.join(' ')).join(', ');
        return `LINESTRING(${coordinates})`;
    }

    return 'GEOMETRY()';
}