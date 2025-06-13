class MaplibreMapentityHistory {
    constructor() { }

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

    saveListInfo(infos) {
        if (!infos || typeof infos !== 'object') {
            console.warn('Invalid infos object provided to saveListInfo');
            return false;
        }
        
        return this._safeLocalStorage.setItem('list-search-results', JSON.stringify(infos));
    }

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

    _handleRemoveSuccess(path) {
        const entries = document.querySelectorAll("#historylist > li");
        let entry = null;
        
        // Find the entry to remove
        document.querySelectorAll('#historylist li a').forEach(a => {
            if (a.getAttribute('href') === path) {
                entry = a.closest('li');
            }
        });

        const closeCurrent = window.location.href.includes(path);
        
        if (closeCurrent) {
            // If the current page is being closed
            if (entries.length > 2) {
                // If there are more entries left, navigate to the next one
                const nextEntry = entries[1].querySelector('> a');
                if (nextEntry) {
                    nextEntry.click();
                }
                if (entry) {
                    entry.remove();
                }
            } else {
                // If no more entries are left, redirect to the list view
                window.location.href = window.SETTINGS.urls.root;
                if (entry) {
                    entry.remove();
                }
            }
        } else {
            // If the entry is not the current page, simply remove it
            if (entry) {
                entry.remove();
            }
        }
    }

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

    // Private method for hover in behavior
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

    // Private method for hover out behavior
    _onHoverOut(link, closeButton, contentElement) {
        if (contentElement && link.dataset.originalText) {
            contentElement.textContent = link.dataset.originalText;
        }
        if (closeButton) {
            closeButton.classList.add('d-none');
        }
    }

    // // Method to clean up event listeners (useful for memory management)
    // destroy() {
    //     // Clean up jQuery-based events if jQuery is available
    //     if (typeof $ !== 'undefined') {
    //         $('#historylist button.close').off('click');
    //         $('#historylist a').off('mouseenter.hoverIntent mouseleave.hoverIntent');
    //     }
    //
    //     // Clean up vanilla JS events
    //     document.querySelectorAll('#historylist button.close').forEach(button => {
    //         button.removeEventListener('click', this.remove);
    //     });
    //
    //     document.querySelectorAll('#historylist a').forEach(link => {
    //         link.removeEventListener('mouseenter', this._onHoverIn);
    //         link.removeEventListener('mouseleave', this._onHoverOut);
    //     });
    // }
}