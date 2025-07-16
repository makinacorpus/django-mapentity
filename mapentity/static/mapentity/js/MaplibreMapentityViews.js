// Écouteurs d'événements pour les vues
document.addEventListener('DOMContentLoaded', function() {

    // // Écouteur d'événement pour la vue détail
    // window.addEventListener('entity:view:detail', function(e) {
    //     console.log('Map initialized for detail view with data:', e.detail);
    //
    //     const { objectsLayer, modelname, pk } = e.detail;
    //
    //     // Attacher les listeners de survol sur les éléments hoverable
    //     document.querySelectorAll('.hoverable').forEach(el => {
    //         el.addEventListener('mouseenter', () => {
    //             const mouseOverEvent = new CustomEvent('entity:mouseover', {
    //                 detail: { pk: pk, modelname: modelname }
    //             });
    //             window.dispatchEvent(mouseOverEvent);
    //         });
    //
    //         el.addEventListener('mouseleave', () => {
    //             const mouseOutEvent = new CustomEvent('entity:mouseout', {
    //                 detail: { pk: pk, modelname: modelname  }
    //             });
    //             window.dispatchEvent(mouseOutEvent);
    //         });
    //     });
    //
    //     // Réaction au survol pour mettre en évidence sur la carte
    //     window.addEventListener('entity:mouseover', function (event) {
    //         const { pk, modelname } = event.detail;
    //         // if (modelname && pk) {
    //         //     objectsLayer.highlight(pk);
    //         // }
    //
    //         // Highlight visuel sur la page
    //         document.querySelectorAll(`[data-modelname="${modelname}"][data-pk="${pk}"]`)
    //             .forEach(item => item.classList.add('hover'));
    //     });
    //
    //     // Réaction à la sortie de survol
    //     window.addEventListener('entity:mouseout', function (event) {
    //         const { pk, modelname } = event.detail;
    //         // if (modelname && pk) {
    //         //     objectsLayer.highlight(pk, false);
    //         // }
    //
    //         // Retirer le highlight visuel
    //         document.querySelectorAll(`[data-modelname="${modelname}"][data-pk="${pk}"]`)
    //             .forEach(item => item.classList.remove('hover'));
    //     });
    // });

    // Écouteur d'événement pour la vue liste
    window.addEventListener('entity:view:list', function(e) {
        console.log('Map initialized for list view with data:', e.detail);

        const { objectsLayer, modelname } = e.detail;

            // Sélectionneur unique défini globalement
        const selectorOnce = (() => {
            let current = { 'pk': null, 'row': null };

            const toggleSelectRow = (prevRow, nextRow) => {
                const animateRow = (row, adding) => {
                    if (!row) {
                        return;
                    }
                    row.classList.toggle('success', adding);
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

                    if (prev.pk && prev.row) {
                        toggleSelectObject(prev.pk, false);
                    }
                    if (row && pk) {
                        toggleSelectObject(pk, true);
                    }
                }
            };
        })();


        // Initialisation du DataTable
        const mainDatatable = new DataTable('#objects-list', {
            processing: true,
            serverSide: true,
            searching: false, // désactive la recherche intégrée de DataTables
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
            info: false,
            sDom: "tpf",
            language: {
                searchPlaceholder: tr("Search"),
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

        // Ajustement vertical de la hauteur du DataTable
       expandDatatableHeight();
       window.addEventListener('resize', function (e) {
             expandDatatableHeight();
       });

       // show tooltips on left menu
        $('#entitylist .nav-link').tooltip({ placement: 'right', boundary: 'window' });

        // trigger a call to the format url
        document.querySelectorAll('#list-download-toolbar button').forEach(button => {
            button.addEventListener('click', function () {
                const can_export = document.querySelectorAll('#list-download-toolbar .btn-group.disabled').length === 0;
                const format = this.getAttribute('name');
                const formatUrl = window.SETTINGS.urls.format_list.replace(new RegExp('modelname', 'g'), modelname);
                const mainfilter = document.getElementById('mainfilter');
                const serializedData = new URLSearchParams(new FormData(mainfilter)).toString();
                const url = `${formatUrl}?${serializedData}&format=${format}`;

                if(can_export){
                    document.location = url;
                }
                return false;
            });
        });

        const filterLabel = document.querySelector('#object-list_filter label');
        if(filterLabel){
            // Parcourir les noeuds enfants et supprimer les noeuds textuels
            Array.from(filterLabel.childNodes).forEach(node => {
                if(node.nodeType === Node.TEXT_NODE) {
                    node.remove();
                }
            })
        }
    });

});