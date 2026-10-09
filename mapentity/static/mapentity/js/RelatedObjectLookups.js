// Handles related-objects functionality: lookup link for raw_id_fields
// and Add Another links.
// uses only JQUERY and django. JQUERY which is a version of jquery encapsulated by django
/*
The html_unescape function is a JavaScript function that allows you to "unescape"
a string that has been escaped using the
django.utils.html.escape method. It replaces HTML entities (like &lt;, &gt;, etc.)
 with their corresponding characters (<, >, etc.). This is useful for displaying
 escaped text in its original form.
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

// consider obsolete if the code does not run on old machines still using IE
// IE does not accept dots or hyphens in the window name, but the element IDs
// we use to generate popup window names may contain them, therefore, we map them
// to allowed characters in a reversible manner so we can locate the correct
// element when the popup window is dismissed.
function id_to_windowname(text) {
    text = text.replace(/\./g, '__dot__');
    text = text.replace(/\-/g, '__dash__');
    return text;
}

// may be considered obsolete if the code does not run on IE
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

// Displays an admin popup for a linked object.
// `triggeringLink` is the link element that triggered the popup.
// Uses a regular expression to extract the name from the link ID.
function showRelatedObjectLookupPopup(triggeringLink) {
    return showAdminPopup(triggeringLink, /^lookup_/);
}

// Closes a linked object search popup window and updates the value of the associated item.
// `win` : The popup window to close.
// `chosenId` : The ID of the object selected in the popup.
function dismissRelatedLookupPopup(win, chosenId) {
    // Retrieve the associated element's name by converting the window name.
    var name = windowname_to_id(win.name);

    // Retrieve the HTML element corresponding to this name.
    var elem = document.getElementById(name);

    // If the element is a ManyToMany field and it already has a value, add the selected identifier.
    if (elem.className.indexOf('vManyToManyRawIdAdminField') != -1 && elem.value) {
        elem.value += ',' + chosenId; // Ajoute l'identifiant à la liste existante.
    } else {
        // Otherwise, replace the current value with the selected identifier.
        document.getElementById(name).value = chosenId;
    }

    win.close();
}

// Displays an admin popup for a linked object.
// `triggeringLink` is the link element that triggered the popup.
function showRelatedObjectPopup(triggeringLink) {
    // Extract the name of the element from the triggering link's ID
    // and convert it to a valid window name.
    var name = triggeringLink.id.replace(/^(change|add|delete)_/, '');
    name = id_to_windowname(name);

    // Retrieve the URL of the triggering link.
    var href = triggeringLink.href;

    // Open a new popup window with the specified dimensions and settings.
    var win = window.open(href, name, 'height=500,width=800,resizable=yes,scrollbars=yes');

    // Bring the popup window to the foreground.
    win.focus();

    // Prevent the default action of the triggering link.
    return false;
}

function dismissAddRelatedObjectPopup(win, newId, newRepr) {
    // The parameters newId and newRepr are assumed to have been escaped
    // previously using django.utils.html.escape.
    newId = html_unescape(newId); // Unescape the identifier.
    newRepr = html_unescape(newRepr); // Unescape the representation.

    // Convert the window name to an HTML element ID.
    var name = windowname_to_id(win.name);

    // Retrieve the HTML element corresponding to this ID.
    var elem = document.getElementById(name);
    var o;

    if (elem) {
        // Check the type of the element (SELECT or INPUT).
        var elemName = elem.nodeName.toUpperCase();

        if (elemName == 'SELECT') {
            // If it's a SELECT, add a new option with the identifier and representation.
            o = new Option(newRepr, newId);
            elem.options[elem.options.length] = o; // Add the option to the list.
            o.selected = true; // Select the new option.
        } else if (elemName == 'INPUT') {
            // If it's an INPUT, check if it's a ManyToMany field.
            if (elem.className.indexOf('vManyToManyRawIdAdminField') != -1 && elem.value) {
                // Add the identifier to the existing list.
                elem.value += ',' + newId;
            } else {
                // Replace the current value with the new identifier.
                elem.value = newId;
            }
        }

        // Trigger a change event to update any associated links if necessary.
        $(elem).trigger("change");
    } else {
        // If the element doesn't exist, treat it as a ManyToMany field.
        var toId = name + "_to"; // Generate the ID for the cache.
        o = new Option(newRepr, newId); // Create a new option.
        SelectBox.add_to_cache(toId, o); // Add the option to the cache.
        SelectBox.redisplay(toId); // Redisplay the options in the select box.
    }

    // Close the popup window.
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
    // Unescape the object's identifier to ensure it's in a usable format.
    objId = html_unescape(objId);

    // Convert the window name to an HTML element ID by removing the "delete_" prefix.
    var id = windowname_to_id(win.name).replace(/^delete_/, '');

    // Build a selector to target elements associated with this ID.
    var selectsSelector = interpolate('#%s, #%s_from, #%s_to', [id, id, id]);

    // Retrieve the matching elements using the selector.
    var selects = django.jQuery(selectsSelector);

    // Iterate over the options of the selected elements.
    selects.find('option').each(function() {
        // If the option's value matches the object's identifier, remove it.
        if (this.value == objId) {
            django.jQuery(this).remove();
        }
    }).trigger('change'); // Trigger a "change" event to update the interface.

    // Close the popup window.
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
