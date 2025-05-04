// Toggable console.debug() function
console.debug = function () {
    if (window.SETTINGS && window.SETTINGS.debug) {
        if (arguments.length > 1)
            console.log(arguments);
        else
            console.log(arguments[0]);
    }
};

/*
Il vérifie si Function.prototype.bind n'est pas déjà défini
(ce qui peut être le cas dans des environnements JavaScript plus anciens) et,
si nécessaire, il fournit une implémentation polyfill de Function.prototype.bind.
Cela garantit que la méthode bind est disponible pour toutes les fonctions dans
l'environnement JavaScript

Ce helper peut être supprimer, Function.prototype.bind est globalement prise en charge
par la majorité des navigateurs maintenant
 */
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
                               aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
    };
}

/**
 * Get URL parameter in Javascript
 * source: http://stackoverflow.com/questions/1403888/get-url-parameter-with-jquery
 */

/*
La fonction `getURLParameter` extrait la valeur d'un paramètre spécifique dans l'URL actuelle. Voici son fonctionnement détaillé :

1. Extraction du paramètre :
   Elle utilise une expression régulière pour rechercher le paramètre spécifié (`name`) dans la chaîne de requête de l'URL (`location.search`).

2. Décodage :
   La valeur trouvée est ensuite décodée avec `decodeURIComponent` pour gérer les caractères encodés dans l'URL.

3. Conversion JSON (optionnelle) :
   Si la valeur décodée est une chaîne, elle tente de la convertir en objet JSON avec `JSON.parse`. Si cela échoue (par exemple, si ce n'est pas un JSON valide), elle retourne simplement la chaîne.

4. Retour :
   Si le paramètre n'est pas trouvé, elle retourne `null`.

### Ancien ou nouveau ?
Cette fonction est **ancienne**. Elle repose sur des techniques classiques de manipulation d'URL en JavaScript, mais elle n'utilise pas les API modernes comme `URLSearchParams`, qui est plus lisible et largement supportée dans les navigateurs récents. Voici un exemple équivalent moderne :

```javascript
function getURLParameter(name) {
    return new URLSearchParams(window.location.search).get(name);
}
```
L'utilisation de `URLSearchParams` est recommandée pour les projets récents.
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
function tr(s) {
    return MapEntity.i18n[s] || s;
}

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
