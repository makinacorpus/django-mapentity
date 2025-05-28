if (!window.MapEntity) window.MapEntity = {};

$(document).ready(function (e) {

    // Fonction pour ajuster la hauteur maximale des panneaux défilants
    var fillmax = function () {
        $('.scrollable').each(function () {
            if ($(window).width() >= 992) {
                // Calcul de la hauteur disponible pour les panneaux
                var top = $(this).offset().top,
                    height = $(window).height() - top - parseFloat($(this).css('margin-top'))
                                                      - parseFloat($(this).css('margin-bottom'));
                $(this).css('max-height', height + 'px');
            } else {
                // Désactiver la hauteur maximale pour les petits écrans
                $(this).css('max-height', 'none')
            }
        });
    };

    // Appeler la fonction fillmax après un délai et lors du redimensionnement de la fenêtre
    setTimeout(fillmax, 0);
    $(window).resize(fillmax);

    // Appliquer le plugin "Chosen" aux éléments avec la classe .chzn-select
    $(".chzn-select").chosen();

    // Rendu des onglets de navigation supérieure
    MapEntity.history.render();

    // Faire disparaître les messages de succès/informations après un délai
    $('#alert-box .alert').delay(2000).fadeOut('slow');

    // Gestion des boutons d'annulation dans les formulaires
    $('#button-id-cancel').click(function (){ window.history.go(-1); });

    // Gestion des éléments à affichage automatique
    $('.autohide').parents().hover(
        function() { $(this).children(".autohide").addClass('hover'); },
        function() { $(this).children(".autohide").removeClass('hover'); }
    );

    // Gestion des vues
    var context = $('body').data();

    console.debug('View ', context.modelname, context.viewname);
    $(window).trigger('entity:view:' + context.viewname, [context]);

    // Gestion des cartes
    $(window).on('map:init', function (e) {
        var data = e.originalEvent ?
                   e.originalEvent.detail : e.detail;

        // Fusionner les données de contexte avec les données de l'événement
        $.extend(data, context);
        $(window).trigger('entity:map', [data]);
        $(window).trigger('entity:map:' + context.viewname, [data]);

        // Gestion des panneaux redimensionnables
        var resizableOptions = {
            handleSelector: ".splitter",
            resizeHeight: false,
            onDragEnd: function (e, $el, opt) {
                // Réinitialiser la taille de la carte après le redimensionnement
                window.maps[0].invalidateSize();
            }
        }
        $("#panelleft, .details-panel").resizable(resizableOptions);
    });

});
