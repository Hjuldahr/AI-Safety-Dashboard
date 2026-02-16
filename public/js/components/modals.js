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

    open(title, contentHTML, footerHTML, sizeClass = "medium-modal", addModalListeners) {
        this.title.innerText = title;
        this.body.innerHTML = contentHTML;
        this.footer.innerHTML = footerHTML;
        this.content.className = `modal-content ${sizeClass}`;
        
        this.appear();

        if (typeof addModalListeners === "function") {
            addModalListeners(this);
        }
    }

    close() {
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