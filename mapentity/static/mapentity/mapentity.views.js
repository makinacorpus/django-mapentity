$(window).on('entity:view:list', function (e, data) {
    /*
     * Datatables
     * .......................
     */
    MapEntity.mainDatatable = JQDataTable.init($('#objects-list'), null /* no load at startup */, {
        // Hide pk column
        aoColumnDefs: [ { "bVisible": false, "aTargets": [ 0 ] } ],
        sDom: "tpf",
        aaData: [],
        iDeferLoading: 0,
        iDisplayLength: 15,  // TODO: this is VERY ANNOYING ! I want to fill height !
    });

    // Adjust vertically
    expandDatatableHeight(MapEntity.mainDatatable);
    $(window).resize(function (e) {
        expandDatatableHeight(MapEntity.mainDatatable);
    });


    // Show tooltips on left menu
    $('#entitylist a').tooltip({'placement': 'right'});

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
    $('li.next a').html($('li.next a').html().replace('Next', ''));
    $('li.prev a').html($('li.prev a').html().replace('Previous', ''));
    $('#objects-list_filter input').attr('placeHolder', tr("Search"));
    $('#objects-list_filter label').contents().filter(function() {return this.nodeType === 3;/*Node.TEXT_NODE*/}).remove();

});