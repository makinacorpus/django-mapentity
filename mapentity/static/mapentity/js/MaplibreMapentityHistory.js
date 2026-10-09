class MaplibreMapentityHistory {
    constructor() { }

    /**
     * Wrapper for secure access to localStorage.
     * @type {{setItem: function(*, *): (boolean), getItem: function(*, null=): (*)}}
     * @private
     */
    _safeLocalStorage = {
        setItem: (key, value) => {
            try {
                if (typeof Storage !== 'undefined' && localStorage) {
                    localStorage.setItem(key, value);
                    return true;
                }
            } catch (e) {
                console.warn('localStorage not available:', e);
            }
            return false;
        },
        
        getItem: (key, defaultValue = null) => {
            try {
                if (typeof Storage !== 'undefined' && localStorage) {
                    return localStorage.getItem(key) || defaultValue;
                }
            } catch (e) {
                console.warn('localStorage not available:', e);
            }
            return defaultValue;
        }
    };

    /**
     * Saves the search list information in localStorage.
     * @param infos {Object} - An object containing the search list information.
     * @returns {boolean} - Returns true if the save was successful, otherwise false.
     */
    saveListInfo(infos) {
        if (!infos || typeof infos !== 'object') {
            console.warn('Invalid infos object provided to saveListInfo');
            return false;
        }
        
        return this._safeLocalStorage.setItem('list-search-results', JSON.stringify(infos));
    }

    /**
     * Deletes an entry from the history.
     * @param path {string} - The path of the entry to delete.
     * @returns {Promise<void>} - Returns a promise that resolves when the entry is deleted.
     */
    async remove(path) {
        if (!path || typeof path !== 'string') {
            console.warn('Invalid path provided to remove method');
            return;
        }

        try {
            const response = await fetch(window.SETTINGS.urls.root + 'history/delete/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `path=${encodeURIComponent(path)}`
            });

            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }

            this._handleRemoveSuccess(path);
        } catch (error) {
            console.error('Failed to remove history entry:', error);
        }
    }

    /**
     * Ensures successful deletion of an entry from history.
     * @param path {string} - The path of the deleted entry.
     * @private
     */
    _handleRemoveSuccess(path) {
        const entries = document.querySelectorAll("#historylist > li");
        let entry = null;
        
        // Find the corresponding entry in the list to delete
        document.querySelectorAll('#historylist li a').forEach(a => {
            if (a.getAttribute('href') === path) {
                entry = a.closest('li');
            }
        });

        const closeCurrent = window.location.href.includes(path);
        
        if (closeCurrent) {
            // if the deleted entry is the current page, we handle navigation
            if (entries.length > 2) {
                // If other entries are present, we redirect to the next one
                const nextEntry = entries[1].querySelector('> a');
                if (nextEntry) {
                    nextEntry.click();
                }
                if (entry) {
                    entry.remove();
                }
            } else {
                // If it's the last entry, we redirect to the homepage
                window.location.href = window.SETTINGS.urls.root;
                if (entry) {
                    entry.remove();
                }
            }
        } else {
            // If the deleted entry is not the current page, it is simply removed from the list
            if (entry) {
                entry.remove();
            }
        }
    }

    /**
     * Displays search list information and manages hover events.
     */
    render() {
        const defaultInfos = '{"nb": "?", "model": null}';
        const infosString = this._safeLocalStorage.getItem('list-search-results', defaultInfos);
        let infos;
        
        try {
            infos = JSON.parse(infosString);
        } catch (e) {
            console.warn('Failed to parse search results info:', e);
            infos = JSON.parse(defaultInfos);
        }

        if (infos.model) {
            const dropdownParent = document.querySelector('#entitylist-dropdown')?.parentElement;
            if (dropdownParent && dropdownParent.tagName.toLowerCase() === 'li') {
                dropdownParent.classList.add(infos.model);
            }
        }

        if (typeof $ !== 'undefined') {
            try {
                $('#historylist a').tooltip({'placement': 'bottom'});
            } catch (e) {
                console.warn('Bootstrap tooltip initialization failed:', e);
            }
        } else {
            console.warn('jQuery not available for Bootstrap tooltips');
        }

        document.querySelectorAll('#historylist button.close').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const link = button.closest('a');
                const path = link?.getAttribute('href');
                if (path) {
                    this.remove(path);
                }
            });
        });

        document.querySelectorAll('#historylist a').forEach(link => {
            const closeButton = link.querySelector('.close');
            const contentElement = link.querySelector('.content');

            // Use hoverIntent if available (via jQuery), otherwise fallback to regular events
            if (typeof $ !== 'undefined' && typeof $(link).hoverIntent === 'function') {
                $(link).hoverIntent(
                    () => this._onHoverIn(link, closeButton, contentElement),
                    () => this._onHoverOut(link, closeButton, contentElement)
                );
            } else {
                // Fallback to regular hover events
                if (typeof $ === 'undefined') {
                    console.warn('hoverIntent plugin not available, using regular hover events');
                }
                
                link.addEventListener('mouseenter', () => {
                    this._onHoverIn(link, closeButton, contentElement);
                });

                link.addEventListener('mouseleave', () => {
                    this._onHoverOut(link, closeButton, contentElement);
                });
            }
        });
    }

    /**
     * Ensures hover management to display the original text and the close button.
     * @param link {HTMLElement} - The link element the user is hovering over.
     * @param closeButton {HTMLElement} - The close button associated with the link.
     * @param contentElement {HTMLElement} - The content element whose text needs to be modified.
     * @private
     */
    _onHoverIn(link, closeButton, contentElement) {
        if (closeButton) {
            closeButton.classList.remove('d-none');
        }
        if (contentElement) {
            link.dataset.originalText = contentElement.textContent;
            const title = link.dataset.originalTitle;
            if (title) {
                contentElement.textContent = title;
            }
        }
    }

    /**
     * Ensures hover out management to restore the original text and hide the close button.
     * @param link {HTMLElement} - The link element the user hovers out of.
     * @param closeButton {HTMLElement} - The close button associated with the link.
     * @param contentElement {HTMLElement} - The content element whose text should be restored.
     * @private
     */
    _onHoverOut(link, closeButton, contentElement) {
        if (contentElement && link.dataset.originalText) {
            contentElement.textContent = link.dataset.originalText;
        }
        if (closeButton) {
            closeButton.classList.add('d-none');
        }
    }
}