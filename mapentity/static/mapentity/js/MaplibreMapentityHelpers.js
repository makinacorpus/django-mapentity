// Toggable console.debug() function
console.debug = function () {
    if (window.SETTINGS && window.SETTINGS.debug) {
        if (arguments.length > 1)
            console.log(arguments);
        else
            console.log(arguments[0]);
    }
};

/**
 * Get URL parameter in Javascript
 * @param name {string} - The name of the parameter to retrieve from the URL
 * @returns {string} - The value of the parameter, or null if not found
 */
function getURLParameter(name) {
    return new URLSearchParams(window.location.search).get(name);
}

// /**!
//  * @preserve parseColor
//  * Copyright 2011 THEtheChad Elliott
//  * Released under the MIT and GPL licenses.
//  */
// parseColor = function(color) {
//
//     var cache
//       , p = parseInt // Use p as a byte saving reference to parseInt
//       , color = color.replace(/\s\s*/g,'') // Remove all spaces
//     ;
//
//     // Checks for 6 digit hex and converts string to integer
//     if (cache = /^#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/.exec(color))
//         cache = [p(cache[1], 16), p(cache[2], 16), p(cache[3], 16)];
//
//     // Checks for 3 digit hex and converts string to integer
//     else if (cache = /^#([\da-fA-F])([\da-fA-F])([\da-fA-F])/.exec(color))
//         cache = [p(cache[1], 16) * 17, p(cache[2], 16) * 17, p(cache[3], 16) * 17];
//
//     // Checks for rgba and converts string to
//     // integer/float using unary + operator to save bytes
//     else if (cache = /^rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*.[\d]+)\)/.exec(color))
//         cache = [+cache[1], +cache[2], +cache[3], +cache[4]];
//
//     // Checks for rgb and converts string to
//     // integer/float using unary + operator to save bytes
//     else if (cache = /^rgb\(([\d]+),([\d]+),([\d]+)\)/.exec(color))
//         cache = [+cache[1], +cache[2], +cache[3]];
//
//     // Otherwise throw an exception to make debugging easier
//     else throw Error(color + ' is not supported by parseColor');
//
//     // Performs RGBA conversion by default
//     isNaN(cache[3]) && (cache[3] = 1);
//
//     // Adds or removes 4th value based on rgba support
//     // Support is flipped twice to prevent erros if
//     // it's not defined
//     return cache.slice(0,3 + !!$.support.rgba);
// };

function expandDatatableHeight() {
    // Calculate the available height for the table by subtracting 75 from the container height
    var fill_height = $('#objects-list_wrapper').height() - 75;
    // Define the height of a single table row
    var row_height = 36;
    // Calculate the number of rows that can fit in the available space
    var number_of_rows = Math.floor(fill_height / row_height);
    // Update the number of rows displayed in the table and redraw
    $('#objects-list').DataTable().page.len(parseInt(number_of_rows.toString())).draw();
}

// translation langue
// function tr(s) {
//     return MapEntity.i18n[s] || s;
// }

//cette fonction personnalise TinyMCE pour gérer les limites de caractères et améliorer
// l'expérience utilisateur avec des validations visuelles.
// ceci pourrait être réécrit en js ou gardé tel quel pour garantir la compatibilité
function tinyMceInit(editor) {
    var context = $('body').data();
    editor.on('WordCountUpdate', function(event) {
        console.log(window.SETTINGS);
        // DEPRECATED paramters maxCharacters -> to remove
        if (("container" in event.target) && (window.SETTINGS.maxCharacters > 0)) {
            var characters = event.wordCount.characters;
            if (characters > window.SETTINGS.maxCharacters) {
                event.target.container.classList.add('cec-overflow');
            } else {
                event.target.container.classList.remove('cec-overflow');
            }
        }
        if (("container" in event.target) && (window.SETTINGS.maxCharactersByField)) {
            var fullTableName = context.appname+"_"+context.modelname
            if (fullTableName in window.SETTINGS.maxCharactersByField) {
                var currenInputName = event.target.container.previousSibling.name;
                window.SETTINGS.maxCharactersByField[fullTableName].forEach(config => {
                    if(config.field == currenInputName) {
                        var statusBar = $(event.target.container).find(".tox-statusbar__wordcount");
                        $(event.target.container).find(".injectedCount").remove()
                        $("<p class='injectedCount'>"+event.wordCount.characters+"/"+config.value+" characters</p>").insertBefore(statusBar)
                        if(event.wordCount.characters > config.value) {

                            event.target.container.classList.add('cec-overflow');
                            event.target.container.classList.add('is-invalid');
                        } else {
                            event.target.container.classList.remove('cec-overflow');
                            event.target.container.classList.remove('is-invalid');
                        }
                    }
                })
            }
        }
    });
}

