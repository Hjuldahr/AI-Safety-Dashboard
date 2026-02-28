/**
 * TagSelect Component
 * Handles fetching, displaying, and selecting multiple tags.
 */
export default class TagSelect {
    constructor(options = {}) {
        // If customContainer (a DOM node) is provided, search inside it. 
        // Otherwise, search the whole document.
        const scope = options.customContainer || document;

        this.container = scope.querySelector(`#${options.containerId}`);
        this.searchInput = scope.querySelector(`#${options.searchInputId}`);
        this.dropdown = scope.querySelector(`#${options.dropdownId}`);

        this.tagsCache = {};
        this.selectedTags = [];
        this.onSelectionChange = options.onSelectionChange || null;
    }

    async init(initialSelectedIds = []) {
        if (!this.container) return;

        // Fetch tags if not already loaded
        await this.loadTags();

        // Set initial state
        this.selectedTags = [...initialSelectedIds];

        // Setup Listeners
        this.setupEventListeners();

        // Initial Render
        this.render();
    }

    async loadTags() {
        try {
            const response = await fetch('/tags');
            const data = await response.json();
            const tags = data.tags || [];
            this.tagsCache = {};
            tags.forEach(t => this.tagsCache[t._id] = t);
        } catch (e) {
            console.error('TagSelect: Failed to load tags', e);
        }
    }

    setupEventListeners() {
        // Toggle dropdown on container click
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-tag')) {
                this.removeTag(e.target.dataset.id);
                return;
            }

            const isVisible = this.dropdown.style.display === 'block';
            this.dropdown.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) this.renderDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.container && !this.container.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.dropdown.style.display = 'none';
            }
        });
    }

    render() {
        this.renderInputPills();
        this.renderDropdown();
    }

    renderInputPills() {
        if (!this.container || !this.searchInput) return;

        // Clear existing pills
        const pills = this.container.querySelectorAll('.tag-input-pill');
        pills.forEach(p => p.remove());

        // Add current pills
        this.selectedTags.forEach(id => {
            const t = this.tagsCache[id];
            if (!t) return;

            const pill = document.createElement('div');
            pill.className = 'tag-input-pill';
            pill.style.backgroundColor = t.color;
            pill.innerHTML = `${t.name} <span class="remove-tag" data-id="${t._id}">&times;</span>`;
            this.container.insertBefore(pill, this.searchInput);
        });

        this.searchInput.placeholder = this.selectedTags.length > 0 ? '' : 'Select tags...';
    }

    renderDropdown() {
        if (!this.dropdown) return;
        this.dropdown.innerHTML = '';

        const available = Object.values(this.tagsCache)
            .filter(t => !this.selectedTags.includes(t._id))
            .sort((a, b) => a.name.localeCompare(b.name));

        if (available.length === 0) {
            this.dropdown.innerHTML = '<div style="padding:0.5rem; color:#888;">No more tags</div>';
            return;
        }

        available.forEach(t => {
            const item = document.createElement('div');
            item.className = 'tags-dropdown-item';
            item.innerHTML = `<div class="color-dot" style="background:${t.color}"></div> ${t.name}`;
            item.addEventListener('click', (e) => {
                e.stopPropagation(); // Keep dropdown logic clean
                this.addTag(t._id);
            });
            this.dropdown.appendChild(item);
        });
    }

    addTag(id) {
        if (!this.selectedTags.includes(id)) {
            this.selectedTags.push(id);
            this.render();
            if (this.onSelectionChange) this.onSelectionChange(this.selectedTags);
        }
    }

    removeTag(id) {
        this.selectedTags = this.selectedTags.filter(tId => tId !== id);
        this.render();
        if (this.onSelectionChange) this.onSelectionChange(this.selectedTags);
    }

    getSelectedIds() {
        return this.selectedTags;
    }

    setSelectedIds(ids) {
        this.selectedTags = [...ids];
        this.render();
    }

    reset() {
        this.selectedTags = [];
        this.render();
    }
}