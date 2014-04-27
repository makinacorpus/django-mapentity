if (!window.MapEntity) window.MapEntity = {};


$(document).ready(function (e) {

    // Scrollable panels
    var fillmax = function () {
        $('.scrollable').each(function () {
            var top = $(this).offset().top,
                height = $(window).height() - top - parseFloat($(this).css('margin-top'))
                                                  - parseFloat($(this).css('margin-bottom'));
            $(this).css('max-height', height + 'px');

        });
    };

    setTimeout(fillmax, 0);
    $(window).resize(fillmax);

    // Chosen-ify elements
    $(".chzn-select").chosen();

    // Top-navigation tabs
    MapEntity.history.render();

    // Fade out success/infos messages
    $('.alert-info, .alert-success').delay(2000).fadeOut('slow');

    // Form Cancel buttons
    $('#button-id-cancel').click(function (){ window.history.go(-1); });

    // Auto-hide elements
    $('.autohide').parents().hover(
        function() { $(this).children(".autohide").show(); },
        function() { $(this).children(".autohide").hide(); }
    );


    // Views
    var context = $('body').data();
    console.debug('View ', context.modelname, context.view);
    $(window).trigger('entity:view:' + context.view, [context]);

    // Maps
    $(window).on('map:init', function (e) {
        var data = e.originalEvent ?
                   e.originalEvent.detail : e.detail;
        $.extend(data, context);
        $(window).trigger('entity:map', [data]);
        $(window).trigger('entity:map:' + context.view, [data]);
    });
});
