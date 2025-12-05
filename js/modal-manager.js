// modal-manager.js - Centralized modal show/hide utility

const ModalManager = {
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    },

    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    toggle(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.toggle('hidden');
        }
    },

    isVisible(modalId) {
        const modal = document.getElementById(modalId);
        return modal && !modal.classList.contains('hidden');
    },

    hideAll() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.add('hidden'));
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModalManager };
}
