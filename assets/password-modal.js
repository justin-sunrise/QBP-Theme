class PasswordModal extends DetailsModal2 {
  constructor() {
    super();

    if (this.querySelector('input[aria-invalid="true"]')) this.open({ target: this.querySelector('details') });
  }
}

customElements.define('password-modal', PasswordModal);
