$(window).on('entity:view:list', function (e, data) {
    /*
     * Datatables
     * .......................
     */
    MapEntity.mainDatatable = $('#objects-list').DataTable({
        'processing': true,
        'serverSide': true,
        aoColumnDefs: [
            { "bVisible": false, "aTargets": [ 0 ] },  // don't show first column (ID)
            // {
            //     "aTargets": [ 1 ],
            //     "mRender": function ( column_data, type, full ) {  // render second column as detail link
            //         var value = '';
            //         if (column_data !== '') {
            //             value = column_data;
            //         } else {
            //             value = full.id.toString();
            //         }
            //         return `<a href="/${data.modelname}/${full.id}/">${value}</a>`;
            //     }
            // }
        ],  // hide id column (consider first)
        "ajax": {
            "url": `/api/${data.modelname}/drf/${data.modelname}s.datatables`
        },
        responsive: true,
        pageLength: 7, // page size is computed from the window size - expandDatatableHeight()
        scrollY: '100vh',
        scrollCollapse: true,
        info: false, // hide "showing 1 to n of m entries"
        "lengthChange": false, // disable page length selection
        "dom": 'T<"clear">rtp',

        "language": {
            "searchPlaceholder": tr("Search"),  // placeholder in search field
            "paginate": {
                "first":      "<<",
                "last":       ">>",
                "next":       ">",
                "previous":   "<"
            },
        },
    layout: {
            bottomEnd: 'inputPaging'
        },
        createdRow: function ( row, data, index ) {
            // highlight feature on map on row hover
            var pk = data.id;
            $(row).hover(
                function () {
                    window.objectsLayer.highlight(pk);
                },
                function () {
                    window.objectsLayer.highlight(pk, false);
                }
            );
        }
    });
    var paging = document.getElementsByClassName('dt-paging')[0];
    paging.classList.add('d-flex', 'flex-row-reverse');
    document.getElementById('list-download-toolbar').appendChild(paging);
    // champs de recherche custom
    $('#object-list-search').keyup(function(){
        MapEntity.mainDatatable.search($(this).val()).draw() ;
    })


    $(window).resize(function (e) {
        expandDatatableHeight();
    });

    // Show tooltips on left menu
    $('#entitylist .nav-link').tooltip({ placement: 'right', boundary: 'window' });

    // Trigger a call to the format url
    $('#list-download-toolbar button').on('click', function () {
        var can_export = $('#list-download-toolbar .btn-group.disabled').length === 0;
        var format = $(this).attr('name');

        var format_url = window.SETTINGS.urls.format_list.replace(new RegExp('modelname', 'g'), data.modelname);
        var url = format_url + '?' +
                  $('#mainfilter').serialize() + '&format=' + format;

        if (can_export)
            document.location = url;

        return false;
    });

    // Hardcore Datatables customizations
    $('#objects-list_filter label').contents().filter(function() {return this.nodeType === 3;/*Node.TEXT_NODE*/}).remove();

  // Adjust vertically
    expandDatatableHeight();
});


$(window).on('entity:view:detail', function (e, data) {
    //
    // Throw event when record is hovered
    // (used in Leaflet.ObjectLayer and below)
    $('.hoverable').hoverIntent(
        function on() {
            var modelname = $(this).data('modelname');
            var pk = $(this).data('pk');
            $(window).trigger('entity:mouseover', {pk: pk, modelname: modelname});
        },
        function off() {
            var modelname = $(this).data('modelname');
            var pk = $(this).data('pk');
            $(window).trigger('entity:mouseout', {pk: pk, modelname: modelname});
        }
    );

    //
    // Highlight (e.g. table rows) when record is hovered
    $(window).on('entity:mouseover', function (e, data) {
        var modelname = data.modelname;
        var pk = data.pk;
        var $item = $("[data-modelname='" + modelname + "'][data-pk='" + pk + "']");
        $item.addClass('hover');
    });
    $(window).on('entity:mouseout', function (e, data) {
        var modelname = data.modelname;
        var pk = data.pk;
        var $item = $("[data-modelname='" + modelname + "'][data-pk='" + pk + "']");
        $item.removeClass('hover');
    });
});
