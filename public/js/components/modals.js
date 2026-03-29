/**
 * This JS component works in tandem with the ejs component "modal.ejs"
 * used for easily re-usable popup modals.
 * 
 * Allows for multiple sizes of modals, depending on if there's a class for it in modal.css
 * - large-modal
 * - medium-modal
 * Feel free to add more
 */
class ModalManager {
    constructor() {
        this.overlay = document.getElementById("global-modal");
        this.content = document.getElementById("global-modal-content");
        this.body = document.getElementById("global-modal-body");
        this.title = document.getElementById("global-modal-title");
        this.closeBtns = this.overlay.querySelectorAll(".close-modal-btn");
        this.footer = document.getElementById("global-modal-footer");
        this.visible = false;
        this.closeCallbacks = new Set();

        // Handle "X" and "Cancel" buttons
        this.closeBtns.forEach(btn => {
            btn.addEventListener("click", () => { this.close() });
        });

        // If they click outside of the modal, close it
        this.overlay.addEventListener("click", (e) => {
            if (e.target === this.overlay && this.visible) this.close();
        });

        // If they press escape, close the modal
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.visible) this.close();
        });

    }

    open(title, contentNode, footerNode, sizeClass = "medium-modal") {
        this.title.innerText = title;
        this.body.replaceChildren(contentNode);
        this.footer.replaceChildren(footerNode);
        this.content.className = `modal-content ${sizeClass}`;
        
        this.appear();
    }

    registerCloseCallback(callback) {
        if (typeof callback === 'function') {
            this.closeCallbacks.add(callback);
        }
    }

    unregisterCloseCallback(callback) {
        if (this.closeCallbacks.has(callback)) {
            this.closeCallbacks.delete(callback);
        }
    }

    close() {
        // Execute cleanup callbacks (e.g. for components with attached listeners)
        this.closeCallbacks.forEach(cb => {
            try { cb(); }
            catch (err) { console.error('Modal cleanup handler failed:', err); }
        });
        this.closeCallbacks.clear();

        this.body.innerHTML = "";
        this.disappear();
    }

    appear() {
        this.visible = true;
        this.overlay.style.display = "flex";
    }

    disappear() {
        this.visible = false;
        this.overlay.style.display = "none";
    }
}

export default ModalManager;