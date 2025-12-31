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

  function showGatewayMessage(message) {
    const existing = document.getElementById('gateway-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'gateway-toast';
    toast.className = 'gateway-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => toast.classList.remove('visible'), 3200);
    setTimeout(() => toast.remove(), 3600);
  }

  if (typeof window.bookOracleReading !== 'function') {
    window.bookOracleReading = function(event = null) {
      event?.preventDefault?.();
      showGatewayMessage('Payment system is temporarily unavailable. Please try again soon.');
    };
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
        const dateRegex = /^(0[1-9]|1[0-2])\/([0-2][0-9]|3[01])\/\d{4}$/;
        if (!birthDate || !dateRegex.test(birthDate)) {
          showGatewayMessage('Enter birth date as MM/DD/YYYY (e.g., 03/15/1990)');
          return;
        }
        const [month, day, year] = birthDate.split('/').map(Number);
        const parsed = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        const isValidDate = !Number.isNaN(parsed.getTime()) &&
          parsed.getUTCFullYear() === year &&
          parsed.getUTCMonth() + 1 === month &&
          parsed.getUTCDate() === day;
        if (!isValidDate) {
          showGatewayMessage('Please enter a valid calendar date (MM/DD/YYYY).');
          return;
        }

        try {
          if (typeof openOracleWidget === 'function') {
            openOracleWidget();
          }

          const widgetInput = document.getElementById('birth-date');
          if (widgetInput) {
            widgetInput.value = birthDate;
          }

          closeModal('freeReadingModal');

          if (typeof getOracleReading === 'function') {
            await new Promise(resolve => requestAnimationFrame(resolve));
            await getOracleReading();
          }
        } catch (err) {
          console.error('Gateway reading error', err);
          showGatewayMessage('Unable to start your reading. Please try again.');
        }
      });
    }
  });
})();
