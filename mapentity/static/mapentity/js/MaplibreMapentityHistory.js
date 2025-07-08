class MaplibreMapentityHistory {
    constructor() { }

    /**
     * Wrapper pour l'accès sécurisé à localStorage.
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
     * Sauvegarde les informations de la liste de recherche dans localStorage.
     * @param infos {Object} - Un objet contenant les informations de la liste de recherche.
     * @returns {boolean} - Retourne true si la sauvegarde a réussi, sinon false.
     */
    saveListInfo(infos) {
        if (!infos || typeof infos !== 'object') {
            console.warn('Invalid infos object provided to saveListInfo');
            return false;
        }
        
        return this._safeLocalStorage.setItem('list-search-results', JSON.stringify(infos));
    }

    /**
     * Supprime une entrée de l'historique.
     * @param path {string} - Le chemin de l'entrée à supprimer.
     * @returns {Promise<void>} - Retourne une promesse qui se résout lorsque l'entrée est supprimée.
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
     * Assure la gestion du succès de la suppression d'une entrée de l'historique.
     * @param path {string} - Le chemin de l'entrée supprimée.
     * @private
     */
    _handleRemoveSuccess(path) {
        const entries = document.querySelectorAll("#historylist > li");
        let entry = null;
        
        // Retrouve l'entrée correspondante dans la liste à supprimer
        document.querySelectorAll('#historylist li a').forEach(a => {
            if (a.getAttribute('href') === path) {
                entry = a.closest('li');
            }
        });

        const closeCurrent = window.location.href.includes(path);
        
        if (closeCurrent) {
            // si l'entrée supprimée est la page actuelle, on gère la navigation
            if (entries.length > 2) {
                // Si d'autres entrées sont présentes, on redirige vers la suivante
                const nextEntry = entries[1].querySelector('> a');
                if (nextEntry) {
                    nextEntry.click();
                }
                if (entry) {
                    entry.remove();
                }
            } else {
                // Si c'est la dernière entrée, on redirige vers la page d'accueil
                window.location.href = window.SETTINGS.urls.root;
                if (entry) {
                    entry.remove();
                }
            }
        } else {
            // Si l'entrée supprimée n'est pas la page actuelle, on la supprime simplement de la liste
            if (entry) {
                entry.remove();
            }
        }
    }

    /**
     * Affiche les informations de la liste de recherche et gère les événements hover.
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
     * Assure la gestion du hover in pour afficher le texte original et le bouton de fermeture.
     * @param link {HTMLElement} - L'élément de lien sur lequel l'utilisateur survole.
     * @param closeButton {HTMLElement} - Le bouton de fermeture associé au lien.
     * @param contentElement {HTMLElement} - L'élément de contenu dont le texte doit être modifié.
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
     * Assure la gestion du hover out pour rétablir le texte original et masquer le bouton de fermeture.
     * @param link {HTMLElement} - L'élément de lien sur lequel l'utilisateur quitte le survol.
     * @param closeButton {HTMLElement} - Le bouton de fermeture associé au lien.
     * @param contentElement {HTMLElement} - L'élément de contenu dont le texte doit être rétabli.
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