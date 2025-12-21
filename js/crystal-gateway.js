// Crystal Gateway interactions
(function() {
  function openFreeReading() {
    const modal = document.getElementById('freeReadingModal');
    if (modal) modal.classList.add('active');
  }

  function openOracleStudio() {
    const modal = document.getElementById('oracleStudioModal');
    if (modal) modal.classList.add('active');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  window.openFreeReading = openFreeReading;
  window.openOracleStudio = openOracleStudio;
  window.closeModal = closeModal;

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.cosmic-modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    const birthDateForm = document.getElementById('birthDateForm');
    if (birthDateForm) {
      birthDateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const birthDate = document.getElementById('birthDateInput')?.value?.trim();
        if (!birthDate) return;

        if (typeof openOracleWidget === 'function') {
          openOracleWidget();
        }

        const widgetInput = document.getElementById('birth-date');
        if (widgetInput) {
          widgetInput.value = birthDate;
        }

        closeModal('freeReadingModal');

        if (typeof getOracleReading === 'function') {
          await getOracleReading();
        }
      });
    }
  });
})();
