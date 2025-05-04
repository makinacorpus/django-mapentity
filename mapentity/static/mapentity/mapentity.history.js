// do not contains any other leaflet plugins a part from hoverIntent and the fact that
// it is directly created via L.Class making it a leaflet based class;
// MapEntity.History class is used to manage the history of user interactions with the application.
MapEntity.History = L.Class.extend({

    // Saves search result information (e.g., number of results, model type) to localStorage.
    saveListInfo: function (infos) {
        localStorage.setItem('list-search-results', JSON.stringify(infos));
    },

    // Removes a specific history entry based on the given path.
    remove: function (path) {
        $.post(window.SETTINGS.urls.root + 'history/delete/', {path: path}, function() {
            var entries = $("#historylist > li")
              , entry = $("#historylist li a[href='" + path + "']").parents('li')
              , closeCurrent = String(window.location).indexOf(path, window.location.length - path.length) !== -1;
            if (closeCurrent) {
                // If the current page is being closed
                if (entries.length > 2) {
                    // If there are more entries left, navigate to the next one
                    entries.find(' > a').get(1).click();
                    $(entry).remove();
                }
                else {
                    // If no more entries are left, redirect to the list view
                    window.location = window.SETTINGS.urls.root;
                    $(entry).remove();
                }
            }
            else {
                // If the entry is not the current page, simply remove it
                $(entry).remove();
            }
        });
    },

    // Renders the history list and sets up event handlers for user interactions.
    render: function () {
        var history = this;

        // Retrieve and parse search result information from localStorage
        infos = localStorage.getItem('list-search-results') || '{"nb": "?", "model": null}';
        infos = JSON.parse(infos);
        //$('#nbresults').text(infos.nb);
        // Add a CSS class to the dropdown parent based on the model type
        $('#entitylist-dropdown').parent('li').addClass(infos.model);

        // Initialize tooltips for history list links
        $('#historylist a').tooltip({'placement': 'bottom'});

        // Set up click event for the close button to remove history entries
        $('#historylist button.close').click(function (e) {
            e.preventDefault();
            var path = $(this).parents('a').attr('href');
            history.remove(path);
        });

        // Set up hover events to show/hide the close button and update link text
        $('#historylist a').hoverIntent(
            function (e) {
                $(this).find('.close').removeClass('d-none');
                $(this).data('original-text', $(this).find('.content').text());
                var title = $(this).data('original-title');
                if (title)
                    $(this).find('.content').text(title);
            },
            function (e) {
                $(this).find('.content').text($(this).data('original-text'));
                $(this).find('.close').addClass('d-none');
            }
        );
    },
});

MapEntity.history = new MapEntity.History();
