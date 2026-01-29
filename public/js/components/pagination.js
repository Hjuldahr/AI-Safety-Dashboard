/**
 * Shared Pagination Component
 * 
 * Usage:
 *   Pagination.render(containerElement, totalPages, currentPage, onPageChangeCallback);
 * 
 *   - onPageChangeCallback(newPageNumber) will be called when a user clicks a page.
 */
window.Pagination = (function() {

    function render(container, totalPages, currentPage, onPageChange) {
        container.innerHTML = ''; // Clear old buttons

        if (totalPages <= 1) return;

        // Helper: Creates a clickable page button
        const createPageBtn = (page) => {
            const btn = document.createElement('button');
            btn.textContent = page;
            if (page === currentPage) btn.classList.add('active');
            btn.addEventListener('click', () => onPageChange(page));
            return btn;
        };

        // Helper: Creates a non-clickable "..." span
        const createDots = () => {
            const span = document.createElement('span');
            span.textContent = '...';
            span.className = 'pagination-dots'; 
            return span;
        };

        // "Previous" Button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '« Prev';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));
        container.appendChild(prevBtn);

        const siblings = 1;

        // If total pages is small, just show them all
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                container.appendChild(createPageBtn(i));
            }
        } else {
            // Complex Logic: Start, End, Current, and Dots
            const showLeftDots = currentPage > siblings + 2;
            const showRightDots = currentPage < totalPages - (siblings + 1);

            // Always show Page 1
            container.appendChild(createPageBtn(1));

            // Logic for Left "..."
            if (showLeftDots) {
                container.appendChild(createDots());
            }

            // Calculate the range of middle buttons
            let start = Math.max(2, currentPage - siblings);
            let end = Math.min(totalPages - 1, currentPage + siblings);

            if (currentPage <= siblings + 2) end = siblings + 4; // Extend range if near start
            if (currentPage >= totalPages - (siblings + 1)) start = totalPages - (siblings + 3); // Extend range if near end
            
            // Sanity check
            start = Math.max(2, start);
            end = Math.min(totalPages - 1, end);

            // Render the middle range
            for (let i = start; i <= end; i++) {
                container.appendChild(createPageBtn(i));
            }

            // Logic for Right "..."
            if (showRightDots) {
                container.appendChild(createDots());
            }

            // Always show Last Page
            container.appendChild(createPageBtn(totalPages));
        }

        // "Next" Button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next »';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
        container.appendChild(nextBtn);
    }

    return {
        render: render
    };

})();
