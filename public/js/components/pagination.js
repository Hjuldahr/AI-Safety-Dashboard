/**
 * Shared Pagination Component
 * 
 * Usage:
 *   Pagination.render(containerElement, totalPages, currentPage, onPageChangeCallback);
 * 
 *   - onPageChangeCallback(newPageNumber) will be called when a user clicks a page.
 */
window.Pagination = (function() {

    function render(container, totalItems, currentPage, paginationSize, onPageChange, onPaginationSizeChange) {
        container.innerHTML = ''

        const divLeft = document.createElement('div');
        divLeft.classList.add('pagination-left');

        // <p>Items per page</p>
        const itemsPerPage = document.createElement('p');
        itemsPerPage.innerText = 'Items per page';
        divLeft.appendChild(itemsPerPage);

        const paginationSizeSelect = document.createElement('select');
        [10,20,30].forEach(e => {
            const opt = document.createElement('option');
            opt.value = e;
            opt.innerText = e;
            opt.selected = paginationSize === e;
            paginationSizeSelect.appendChild(opt);
        });
        paginationSizeSelect.onchange = (e) => { 
            // gaurd against boundary breach from pagination size increase (which will reduce total pages)
            const newPaginationSize = Number.parseInt(e.currentTarget.value);
            onPaginationSizeChange(newPaginationSize);
            const newTotalPages = Math.ceil(totalItems / newPaginationSize);
            if (currentPage > newTotalPages) {
                onPageChange(newTotalPages); // enforce new max
            } else {
                onPageChange(currentPage); // refresh
            }
        }
        divLeft.appendChild(paginationSizeSelect);

        const paginationSlice = document.createElement('p');
        const sliceStart = totalItems === 0 ? 0 : (currentPage - 1) * paginationSize + 1;
        const sliceEnd = Math.min(currentPage * paginationSize, totalItems);
        paginationSlice.innerText = `${sliceStart} - ${sliceEnd} of ${totalItems} items`
        divLeft.appendChild(paginationSlice);

        container.appendChild(divLeft);

        const divRight = document.createElement('div');
        divRight.classList.add('pagination-right');

        const atStart = currentPage <= 1;
        const totalPages = Math.ceil(totalItems / paginationSize);
        const atEnd = currentPage >= totalPages;

        const firstPageBtn = document.createElement('button');
        firstPageBtn.innerHTML = '<i class="fa-solid fa-angles-left"></i> First';
        firstPageBtn.disabled = atStart;
        firstPageBtn.onclick = () => onPageChange(1);
        divRight.appendChild(firstPageBtn);

        const prevPageBtn = document.createElement('button');
        prevPageBtn.innerHTML = '<i class="fa-solid fa-angle-left"></i> Prev';
        prevPageBtn.disabled = atStart;
        prevPageBtn.onclick = () => onPageChange(currentPage - 1);
        divRight.appendChild(prevPageBtn);

        const paginationPage = document.createElement('input');
        paginationPage.type = 'number';
        paginationPage.min = 1;
        paginationPage.value = currentPage;
        paginationPage.max = totalPages;
        paginationPage.style.width = "50px";
        paginationPage.onchange = (e) => onPageChange(Number.parseInt(e.currentTarget.value));
        divRight.appendChild(paginationPage);

        const paginationTotal = document.createElement('p');
        paginationTotal.innerText = `of ${totalPages}`;
        divRight.appendChild(paginationTotal);

        const nextPageBtn = document.createElement('button');
        nextPageBtn.innerHTML = 'Next <i class="fa-solid fa-angle-right"></i>';
        nextPageBtn.disabled = atEnd;
        nextPageBtn.onclick = () => onPageChange(currentPage + 1);
        divRight.appendChild(nextPageBtn);

        const lastPageBtn = document.createElement('button');
        lastPageBtn.innerHTML = 'Last <i class="fa-solid fa-angles-right"></i>';
        lastPageBtn.disabled = atEnd;
        lastPageBtn.onclick = () => onPageChange(totalPages);
        divRight.appendChild(lastPageBtn);

        container.appendChild(divRight);
    }

    return {
        render: render
    };

})();
