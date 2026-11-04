class DetailsModal2 extends HTMLElement {
  constructor() {
    super();
    this.detailsContainer = this.querySelector('details');
    this.summaryToggle = this.querySelector('summary');

    this.detailsContainer.addEventListener('keyup', (event) => event.code.toUpperCase() === 'ESCAPE' && this.close());
    this.summaryToggle.addEventListener('click', this.onSummaryClick.bind(this));
    this.querySelector('button[type="button"]').addEventListener('click', this.close.bind(this));

    this.summaryToggle.setAttribute('role', 'button');
  }

  isOpen() {
    return this.detailsContainer.hasAttribute('open');
  }

  onSummaryClick(event) {
    event.preventDefault();
    event.target.closest('details').hasAttribute('open') ? this.close() : this.open(event);
  }

  onBodyClick(event) {
    if (!this.contains(event.target) || event.target.classList.contains('modal-overlay')) this.close(false);
  }

  open(event) {
    this.onBodyClickEvent = this.onBodyClickEvent || this.onBodyClick.bind(this);
    event.target.closest('details').setAttribute('open', true);
    document.body.addEventListener('click', this.onBodyClickEvent);
    document.body.classList.add('overflow-hidden');

    trapFocus(
      this.detailsContainer.querySelector('[tabindex="-1"]'),
      this.detailsContainer.querySelector('input:not([type="hidden"])')
    );
  }

  close(focusToggle = true) {
    removeTrapFocus(focusToggle ? this.summaryToggle : null);
    this.detailsContainer.removeAttribute('open');
    document.body.removeEventListener('click', this.onBodyClickEvent);
    document.body.classList.remove('overflow-hidden');
  }
}

customElements.define('details-modal', DetailsModal2);


class SearchModal extends HTMLElement {
  constructor() {
    super();
    
    this.toggleButton = this.querySelector('.modal__toggle');
    this.modal = this.querySelector('.search-modal');
    this.closeButton = this.querySelector('.search-modal__close-button');
    this.modalOverlay = this.querySelector('.modal-overlay');
    this.searchInput = this.querySelector('.search__input');
    
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', this.open.bind(this));
    }
    
    if (this.closeButton) {
      this.closeButton.addEventListener('click', this.close.bind(this));
    }
    
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', this.close.bind(this));
    }
    
    // Close on Escape key
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE' && this.isOpen()) {
        this.close();
      }
    });
  }
  
  open(event) {
  if (event) event.preventDefault();
  
  this.modal.setAttribute('data-open', 'true');
  this.modal.removeAttribute('aria-hidden');
  this.toggleButton.setAttribute('aria-expanded', 'true');
  this.toggleButton.setAttribute('data-expanded', 'true');
  
  // Store scroll position and fix body
  this.scrollPosition = window.pageYOffset;
  document.body.style.top = `-${this.scrollPosition}px`;
  document.body.classList.add('overflow-hidden');
  
  setTimeout(() => {
    if (this.searchInput) {
      this.searchInput.focus();
    }
  }, 100);
  
  if (typeof trapFocus === 'function') {
    trapFocus(this.modal, this.searchInput || this.closeButton);
  }
}
  
  close(event) {
    if (event) event.preventDefault();
    
    this.modal.setAttribute('data-open', 'false');
    this.modal.setAttribute('aria-hidden', 'true');
    this.toggleButton.setAttribute('aria-expanded', 'false');
    this.toggleButton.setAttribute('data-expanded', 'false');
    
    // Restore scroll position
    document.body.classList.remove('overflow-hidden');
    document.body.style.top = '';
    window.scrollTo(0, this.scrollPosition);
    
    if (typeof removeTrapFocus === 'function') {
      removeTrapFocus(this.toggleButton);
    }
    
    // Return focus to toggle button
    setTimeout(() => {
      if (this.toggleButton) {
        this.toggleButton.focus();
      }
    }, 100);
  }
  
  isOpen() {
    return this.modal && this.modal.getAttribute('data-open') === 'true';
  }
}

customElements.define('search-modal', SearchModal);