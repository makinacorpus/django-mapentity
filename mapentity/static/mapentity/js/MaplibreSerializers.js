/**
 * Convertit un objet de géométrie en sa représentation WKT (Well-Known Text).
 * @param geometry {Object} - L'objet de géométrie à convertir, qui doit contenir un type et des coordonnées.
 * @returns {string} - La chaîne WKT représentant la géométrie, ou 'GEOMETRY()' si le type n'est pas reconnu.
 */
function getWKT(geometry){
    if(geometry.type === 'Point'){
        return `POINT(${geometry.cordinates.join(' ')})`;
    }

    if(geometry.type === 'Polygon'){
        const coordinates = geometry.coordinates[0].map(coord => coord.join(' ')).join(', ');
        return `POLYGON((${coordinates}))`;
    }

    if(geometry.type === 'LineString'){
        const coordinates = geometry.coordinates.map(coord => coord.join(' ')).join(', ');
        return `LINESTRING(${coordinates})`;
    }

    if(geometry.type === 'MultiPolygon'){
        const coordinates = geometry.coordinates.map(polygon => {
            return `(${polygon[0].map(coord => coord.join(' ')).join(', ')})`;
        }).join(', ');
        return `MULTIPOLYGON(${coordinates})`;
    }

    if(geometry.type === 'MultiLineString'){
        const coordinates = geometry.coordinates.map(line => {
            return `(${line.map(coord => coord.join(' ')).join(', ')})`;
        }).join(', ');
        return `MULTILINESTRING(${coordinates})`;
    }

    return 'GEOMETRY()';
}