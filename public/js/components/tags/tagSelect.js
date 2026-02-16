// --- 6. MULTISELECT DROPDOWN (RULE BUILDER) ---
const tagsInputContainer = document.getElementById('tags-input-container');
const tagsSearchInput = document.getElementById('tags-search-input');
const tagsDropdown = document.getElementById('tags-dropdown-list');

function renderTagInput() {
    if (!tagsInputContainer) return;
    const pills = tagsInputContainer.querySelectorAll('.tag-input-pill');
    pills.forEach(c => c.remove());

    selectedTags.forEach(id => {
        const t = tagsCache[id];
        if (!t) return;
        const pill = document.createElement('div');
        pill.className = 'tag-input-pill';
        pill.style.backgroundColor = t.color;
        pill.innerHTML = `${t.name} <span class="remove-tag" data-id="${t._id}">&times;</span>`;
        tagsInputContainer.insertBefore(pill, tagsSearchInput);
    });

    // Hide/Show placeholder based on selection
    if (tagsSearchInput) tagsSearchInput.placeholder = selectedTags.length > 0 ? '' : 'Select tags...';
}

function renderTagDropdown() {
    if (!tagsDropdown) return;
    tagsDropdown.innerHTML = '';
    const available = Object.values(tagsCache)
        .filter(t => !selectedTags.includes(t._id))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (available.length === 0) {
        tagsDropdown.innerHTML = '<div style="padding:0.5rem; color:#888;">No more tags</div>';
        return;
    }

    available.forEach(t => {
        const item = document.createElement('div');
        item.className = 'tags-dropdown-item';
        item.innerHTML = `<div class="color-dot" style="background:${t.color}"></div> ${t.name}`;
        item.addEventListener('click', () => {
            selectedTags.push(t._id);
            renderTagInput();
            renderTagDropdown();
            if (tagsSearchInput) {
                tagsSearchInput.value = '';
                tagsSearchInput.focus();
            }
        });
        tagsDropdown.appendChild(item);
    });
}


// Event Listeners
if (tagsInputContainer) {
    tagsInputContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-tag')) {
            const id = e.target.dataset.id;
            const idx = selectedTags.indexOf(id);
            if (idx > -1) selectedTags.splice(idx, 1);
            renderTagInput();
            // If dropdown is open, update it to show the removed tag
            if (tagsDropdown.style.display === 'block') renderTagDropdown();
            return;
        }
        // Toggle dropdown
        if (tagsDropdown) {
            const isVisible = tagsDropdown.style.display === 'block';
            tagsDropdown.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) renderTagDropdown();
        }
    });
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (tagsInputContainer && tagsDropdown && !tagsInputContainer.contains(e.target) && !tagsDropdown.contains(e.target)) {
        tagsDropdown.style.display = 'none';
    }
});