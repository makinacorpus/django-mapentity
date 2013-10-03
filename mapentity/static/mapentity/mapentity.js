/*
 * MapEntity core tools and classes.
 */


if (!window.MapEntity) window.MapEntity = {};


// Toggable console.debug() function
console.debug = function () {
    if (window.SETTING && window.SETTING.debug)
        console.log(arguments);
};


/**
 * Get URL parameter in Javascript
 * source: http://stackoverflow.com/questions/1403888/get-url-parameter-with-jquery
 */
function getURLParameter(name) {
    var paramEncoded = (RegExp('[?|&]' + name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1],
        paramDecoded = decodeURIComponent(paramEncoded);
    if (typeof paramDecoded == 'string') {
        try {
            return JSON.parse(paramDecoded);
        }
        catch (e) {}
    }
    return paramDecoded;
}


/**!
 * @preserve parseColor
 * Copyright 2011 THEtheChad Elliott
 * Released under the MIT and GPL licenses.
 */
// Parse hex/rgb{a} color syntax.
// @input string
// @returns array [r,g,b{,o}]
parseColor = function(color) {

    var cache
      , p = parseInt // Use p as a byte saving reference to parseInt
      , color = color.replace(/\s\s*/g,'') // Remove all spaces
    ;//var

    // Checks for 6 digit hex and converts string to integer
    if (cache = /^#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/.exec(color))
        cache = [p(cache[1], 16), p(cache[2], 16), p(cache[3], 16)];

    // Checks for 3 digit hex and converts string to integer
    else if (cache = /^#([\da-fA-F])([\da-fA-F])([\da-fA-F])/.exec(color))
        cache = [p(cache[1], 16) * 17, p(cache[2], 16) * 17, p(cache[3], 16) * 17];

    // Checks for rgba and converts string to
    // integer/float using unary + operator to save bytes
    else if (cache = /^rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*.[\d]+)\)/.exec(color))
        cache = [+cache[1], +cache[2], +cache[3], +cache[4]];

    // Checks for rgb and converts string to
    // integer/float using unary + operator to save bytes
    else if (cache = /^rgb\(([\d]+),([\d]+),([\d]+)\)/.exec(color))
        cache = [+cache[1], +cache[2], +cache[3]];

    // Otherwise throw an exception to make debugging easier
    else throw Error(color + ' is not supported by parseColor');

    // Performs RGBA conversion by default
    isNaN(cache[3]) && (cache[3] = 1);

    // Adds or removes 4th value based on rgba support
    // Support is flipped twice to prevent erros if
    // it's not defined
    return cache.slice(0,3 + !!$.support.rgba);
};


function tr(s) { return s; }


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
});
