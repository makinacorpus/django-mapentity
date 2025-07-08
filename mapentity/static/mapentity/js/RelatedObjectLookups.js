// Handles related-objects functionality: lookup link for raw_id_fields
// and Add Another links.
// utilise que du JQUERY et django.JQUERY qui est une version de jquery encapsulé de django
/*
La fonction html_unescape est une fonction JavaScript qui permet de "déséchapper"
une chaîne de caractères qui a été échappée à l'aide de la méthode
django.utils.html.escape. Elle remplace les entités HTML (comme &lt;, &gt;, etc.)
 par leurs caractères correspondants (<, >, etc.). Cela est utile pour afficher
 du texte échappé dans sa forme originale.
 */
function html_unescape(text) {
    // Unescape a string that was escaped using django.utils.html.escape.
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&amp;/g, '&');
    return text;
}

// considérer comme obsolète si le code ne tourne pas sur des anciens machines utilisant encore IE
// IE doesn't accept periods or dashes in the window name, but the element IDs
// we use to generate popup window names may contain them, therefore we map them
// to allowed characters in a reversible way so that we can locate the correct
// element when the popup window is dismissed.
function id_to_windowname(text) {
    text = text.replace(/\./g, '__dot__');
    text = text.replace(/\-/g, '__dash__');
    return text;
}

// peut être considérer comme obsolète si le code ne tourne pas sur IE
function windowname_to_id(text) {
    text = text.replace(/__dot__/g, '.');
    text = text.replace(/__dash__/g, '-');
    return text;
}

// Opens an admin popup window for a related object.
// `triggeringLink` is the link element that triggered the popup.
// `name_regexp` is a regular expression used to extract the name from the link's ID.
function showAdminPopup(triggeringLink, name_regexp) {
    // Extract the name from the triggering link's ID and convert it to a valid window name.
    var name = triggeringLink.id.replace(name_regexp, '');
    name = id_to_windowname(name);

    // Get the href attribute of the triggering link and append the `_popup=1` parameter.
    var href = triggeringLink.href;
    if (href.indexOf('?') == -1) {
        href += '?_popup=1'; // If no query string exists, add the parameter.
    } else {
        href += '&_popup=1'; // If a query string exists, append the parameter.
    }

    // Open a new popup window with the specified dimensions and settings.
    var win = window.open(href, name, 'height=500,width=800,resizable=yes,scrollbars=yes');
    win.focus(); // Bring the popup window to the foreground.
    return false; // Prevent the default action of the triggering link.
}

// Affiche une fenêtre popup d'administration pour un objet lié.
// `triggeringLink` est l'élément de lien qui a déclenché le popup.
// Utilise une expression régulière pour extraire le nom à partir de l'ID du lien.
function showRelatedObjectLookupPopup(triggeringLink) {
    return showAdminPopup(triggeringLink, /^lookup_/);
}

// Ferme une fenêtre popup de recherche d'objet lié et met à jour la valeur de l'élément associé.
// `win` : La fenêtre popup à fermer.
// `chosenId` : L'identifiant de l'objet sélectionné dans la popup.
function dismissRelatedLookupPopup(win, chosenId) {
    // Récupère le nom de l'élément associé en convertissant le nom de la fenêtre.
    var name = windowname_to_id(win.name);

    // Récupère l'élément HTML correspondant à ce nom.
    var elem = document.getElementById(name);

    // Si l'élément est un champ ManyToMany et qu'il a déjà une valeur, ajoute l'identifiant sélectionné.
    if (elem.className.indexOf('vManyToManyRawIdAdminField') != -1 && elem.value) {
        elem.value += ',' + chosenId; // Ajoute l'identifiant à la liste existante.
    } else {
        // Sinon, remplace la valeur actuelle par l'identifiant sélectionné.
        document.getElementById(name).value = chosenId;
    }

    // Ferme la fenêtre popup.
    win.close();
}

// Affiche une fenêtre popup d'administration pour un objet lié.
// `triggeringLink` est l'élément de lien qui a déclenché le popup.
function showRelatedObjectPopup(triggeringLink) {
    // Extrait le nom de l'élément à partir de l'ID du lien déclencheur
    // et le convertit en un nom de fenêtre valide.
    var name = triggeringLink.id.replace(/^(change|add|delete)_/, '');
    name = id_to_windowname(name);

    // Récupère l'URL du lien déclencheur.
    var href = triggeringLink.href;

    // Ouvre une nouvelle fenêtre popup avec les dimensions et paramètres spécifiés.
    var win = window.open(href, name, 'height=500,width=800,resizable=yes,scrollbars=yes');

    // Met la fenêtre popup au premier plan.
    win.focus();

    // Empêche l'action par défaut du lien déclencheur.
    return false;
}

function dismissAddRelatedObjectPopup(win, newId, newRepr) {
    // Les paramètres newId et newRepr sont supposés avoir été échappés
    // auparavant à l'aide de django.utils.html.escape.
    newId = html_unescape(newId); // Déséchapper l'identifiant.
    newRepr = html_unescape(newRepr); // Déséchapper la représentation.

    // Convertit le nom de la fenêtre en un identifiant d'élément HTML.
    var name = windowname_to_id(win.name);

    // Récupère l'élément HTML correspondant à cet identifiant.
    var elem = document.getElementById(name);
    var o;

    if (elem) {
        // Vérifie le type de l'élément (SELECT ou INPUT).
        var elemName = elem.nodeName.toUpperCase();

        if (elemName == 'SELECT') {
            // Si c'est un SELECT, ajoute une nouvelle option avec l'identifiant et la représentation.
            o = new Option(newRepr, newId);
            elem.options[elem.options.length] = o; // Ajoute l'option à la liste.
            o.selected = true; // Sélectionne la nouvelle option.
        } else if (elemName == 'INPUT') {
            // Si c'est un INPUT, vérifie s'il s'agit d'un champ ManyToMany.
            if (elem.className.indexOf('vManyToManyRawIdAdminField') != -1 && elem.value) {
                // Ajoute l'identifiant à la liste existante.
                elem.value += ',' + newId;
            } else {
                // Remplace la valeur actuelle par le nouvel identifiant.
                elem.value = newId;
            }
        }

        // Déclenche un événement de changement pour mettre à jour les liens associés si nécessaire.
        $(elem).trigger("chosen:updated");
    } else {
        // Si l'élément n'existe pas, traite-le comme un champ ManyToMany.
        var toId = name + "_to"; // Génère l'identifiant pour le cache.
        o = new Option(newRepr, newId); // Crée une nouvelle option.
        SelectBox.add_to_cache(toId, o); // Ajoute l'option au cache.
        SelectBox.redisplay(toId); // Redistribue les options dans la boîte de sélection.
    }

    // Ferme la fenêtre popup.
    win.close();
}

function dismissChangeRelatedObjectPopup(win, objId, newRepr, newId) {
    objId = html_unescape(objId);
    newRepr = html_unescape(newRepr);
    var id = windowname_to_id(win.name).replace(/^edit_/, '');
    var selectsSelector = interpolate('#%s, #%s_from, #%s_to', [id, id, id]);
    var selects = django.jQuery(selectsSelector);
    selects.find('option').each(function() {
        if (this.value == objId) {
            this.textContent = newRepr;
            this.value = newId;
        }
    });
    win.close();
}

function dismissDeleteRelatedObjectPopup(win, objId) {
    // Déséchapper l'identifiant de l'objet pour s'assurer qu'il est dans un format utilisable.
    objId = html_unescape(objId);

    // Convertir le nom de la fenêtre en un identifiant d'élément HTML en supprimant le préfixe "delete_".
    var id = windowname_to_id(win.name).replace(/^delete_/, '');

    // Construire un sélecteur pour cibler les éléments associés à cet identifiant.
    var selectsSelector = interpolate('#%s, #%s_from, #%s_to', [id, id, id]);

    // Récupérer les éléments correspondants en utilisant le sélecteur.
    var selects = django.jQuery(selectsSelector);

    // Parcourir les options des éléments sélectionnés.
    selects.find('option').each(function() {
        // Si la valeur de l'option correspond à l'identifiant de l'objet, la supprimer.
        if (this.value == objId) {
            django.jQuery(this).remove();
        }
    }).trigger('change'); // Déclencher un événement "change" pour mettre à jour l'interface.

    // Fermer la fenêtre popup.
    win.close();
}

// Kept for backward compatibility
showAddAnotherPopup = showRelatedObjectPopup;
dismissAddAnotherPopup = dismissAddRelatedObjectPopup;

$(document).ready(function() {
    $('.related-lookup').click(function(e) {
        e.preventDefault();
        showRelatedObjectLookupPopup(this); // call function as soon as the page is loaded and ready
    });
});
