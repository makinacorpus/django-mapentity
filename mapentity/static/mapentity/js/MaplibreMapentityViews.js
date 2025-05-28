// Écouteurs d'événements pour les vues
document.addEventListener('DOMContentLoaded', function() {

    // Écouteur d'événement pour la vue détail
    window.addEventListener('entity:view:detail', function(e) {
        console.log('Map initialized for detail view with data:', e.detail);

    });

    // Écouteur d'événement pour la vue liste
    window.addEventListener('entity:view:list', function(e) {
        console.log('Map initialized for list view with data:', e.detail);

        const { objectsLayer, modelname } = e.detail;

            // Sélectionneur unique défini globalement
        const selectorOnce = (() => {
            let current = { 'pk': null, 'row': null };

            const toggleSelectRow = (prevRow, nextRow) => {
                const animateRow = (row, adding) => {
                    if (!row) return;
                    row.style.display = 'none';
                    setTimeout(() => {
                        row.style.display = '';
                        row.classList.toggle('success', adding);
                    }, 100);
                };

                animateRow(prevRow, false);
                animateRow(nextRow, true);
            };

            const toggleSelectObject = (pk, on = true) => {
                console.log('toggleSelectObject', pk);
                objectsLayer.select(pk, on);
            };

            return {
                select: (pk, row) => {
                    if (pk === current.pk) {
                        pk = null;
                        row = null;
                    }

                    const prev = current;
                    current = { pk, row };

                    toggleSelectRow(prev.row, row);

                    if (prev.pk && prev.row) toggleSelectObject(prev.pk, false);
                    if (row && pk) toggleSelectObject(pk, true);
                }
            };
        })();


        // Initialisation du DataTable
        const mainDatatable = new DataTable('#objects-list', {
            processing: true,
            serverSide: true,
            columnDefs: [
                { visible: false, targets: [0] }
            ],
            ajax: {
                url: `/api/${modelname}/drf/${modelname}s.datatables`
            },
            responsive: true,
            pageLength: 7,
            scrollY: '100vh',
            scrollCollapse: true,
            lengthChange: false,
            language: {
                paginate: {
                    first: "<<",
                    last: ">>",
                    next: ">",
                    previous: "<"
                },
            },
            createdRow: function (row, data, index) {
                const pk = data.id;

                row.addEventListener('mouseenter', () => {
                    objectsLayer.highlight(pk);
                });
                row.addEventListener('mouseleave', () => {
                    objectsLayer.highlight(pk, false);
                });
                row.addEventListener('click', () => {
                    selectorOnce.select(pk, row);
                });
                row.addEventListener('dblclick', () => {
                    objectsLayer.jumpTo(pk);
                });
            }
        });

        window.MapEntity.dt = mainDatatable;
    });

    // Fonction utilitaire pour accéder à la carte courante
    window.getCurrentMap = function() {
        return window.MapEntity.currentMap;
    };

});