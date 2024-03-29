if (!window.MapEntity) window.MapEntity = {};


$(document).ready(function (e) {

    // Scrollable panels
    var fillmax = function () {
        $('.scrollable').each(function () {
            if ($(window).width() >= 992) {
                var top = $(this).offset().top,
                    height = $(window).height() - top - parseFloat($(this).css('margin-top'))
                                                      - parseFloat($(this).css('margin-bottom'));
                $(this).css('max-height', height + 'px');
            } else {
                $(this).css('max-height', 'none')
            }
        });
    };

    setTimeout(fillmax, 0);
    $(window).resize(fillmax);

    // Chosen-ify elements
    $(".chzn-select").chosen();

    // Top-navigation tabs
    MapEntity.history.render();

    // Fade out success/infos messages
    $('#alert-box .alert').delay(2000).fadeOut('slow');

    // Form Cancel buttons
    $('#button-id-cancel').click(function (){ window.history.go(-1); });

    // Auto-hide elements
    $('.autohide').parents().hover(
        function() { $(this).children(".autohide").addClass('hover'); },
        function() { $(this).children(".autohide").removeClass('hover'); }
    );



    // Views
    var context = $('body').data();
    console.debug('View ', context.modelname, context.viewname);
    $(window).trigger('entity:view:' + context.viewname, [context]);

    // Maps
    $(window).on('map:init', function (e) {
        var data = e.originalEvent ?
                   e.originalEvent.detail : e.detail;
        $.extend(data, context);
        $(window).trigger('entity:map', [data]);
        $(window).trigger('entity:map:' + context.viewname, [data]);

        // Split
        var resizableOptions = {
            handleSelector: ".splitter",
            resizeHeight: false,
            onDragEnd: function (e, $el, opt) {
                window.maps[0].invalidateSize();
            }
        }
        $("#panelleft, .details-panel").resizable(resizableOptions);
    });

});
