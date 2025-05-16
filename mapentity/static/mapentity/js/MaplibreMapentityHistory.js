class MaplibreMapentityHistory {
    constructor() {
        // Constructor can be used to initialize any necessary properties
    }

    // Saves search result information (e.g., number of results, model type) to localStorage.
    saveListInfo(infos) {
        localStorage.setItem('list-search-results', JSON.stringify(infos));
    }

    // Removes a specific history entry based on the given path.
    async remove(path) {
        try {
            const response = await fetch(window.SETTINGS.urls.root + 'history/delete/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `path=${encodeURIComponent(path)}`
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const entries = document.querySelectorAll("#historylist > li");
            let entry = null;
            document.querySelectorAll('#historylist li a').forEach(a => {
                if (a.getAttribute('href') === path) {
                    entry = a.parentNode;
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
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Renders the history list and sets up event handlers for user interactions.
    render() {
        // Retrieve and parse search result information from localStorage
        let infos = localStorage.getItem('list-search-results') || '{"nb": "?", "model": null}';
        infos = JSON.parse(infos);

        // Add a CSS class to the dropdown parent based on the model type
        const dropdownParent = document.querySelector('#entitylist-dropdown')?.parentNode;
        if (dropdownParent) {
            dropdownParent.classList.add(infos.model);
        }

        // Set up click event for the close button to remove history entries
        document.querySelectorAll('#historylist button.close').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const path = button.parentNode.querySelector('a').getAttribute('href');
                this.remove(path);
            });
        });

        // Set up hover events to show/hide the close button and update link text
        document.querySelectorAll('#historylist a').forEach(link => {
            const closeButton = link.querySelector('.close');
            const contentElement = link.querySelector('.content');

            link.addEventListener('mouseenter', () => {
                if (closeButton) {
                    closeButton.classList.remove('d-none');
                }
                link.dataset.originalText = contentElement.textContent;
                const title = link.dataset.originalTitle;
                if (title) {
                    contentElement.textContent = title;
                }
            });

            link.addEventListener('mouseleave', () => {
                if (contentElement) {
                    contentElement.textContent = link.dataset.originalText;
                }
                if (closeButton) {
                    closeButton.classList.add('d-none');
                }
            });
        });
    }
}

// Usage example:
// const mapEntityHistory = new MaplibreMapEntityHistory();
// mapEntityHistory.render();
