// Écouteurs d'événements pour les cartes
document.addEventListener('DOMContentLoaded', function() {

    // Écouteur d'événement pour la vue détail
    window.addEventListener('entity:map:detail', function(e) {
        console.log('Map initialized for detail view with data:', e.detail);

    });

    // Écouteur d'événement pour la vue liste
    window.addEventListener('entity:map:list', function(e) {
        console.log('Map initialized for list view with data:', e.detail);
        
        const { map, objectsLayer } = e.detail;
    });

    // Fonction utilitaire pour accéder à la carte courante
    window.getCurrentMap = function() {
        return window.MapEntity.currentMap;
    };

});
