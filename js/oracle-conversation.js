(function () {
  const MAX_FREE = 3;
  const conversationHistory = [];
  let questionCount = 0;
  let currentTier = 'free';
  let modal;
  let form;
  let input;
  let messages;
  let counter;
  let upgradeBanner;
  let nameInput;
  let emailInput;
  let isSending = false;

  function appendMessage(text, role = 'oracle') {
    if (!messages) return null;
    const bubble = document.createElement('div');
    bubble.className = `oracle-bubble ${role}`;
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  function setCounter(remaining) {
    if (!counter) return;
    if (currentTier !== 'free') {
      counter.textContent = 'Unlimited guidance unlocked';
      return;
    }
    const left = typeof remaining === 'number' ? remaining : Math.max(0, MAX_FREE - questionCount);
    const suffix = left === 1 ? 'question' : 'questions';
    counter.textContent = `${left} free ${suffix} remaining`;
  }

  function toggleUpgrade(show) {
    if (!upgradeBanner) return;
    if (show) {
      upgradeBanner.removeAttribute('hidden');
      counter.textContent = 'Upgrade to keep the channel open';
    } else {
      upgradeBanner.setAttribute('hidden', 'true');
    }
  }

  function closeModal() {
    if (modal) {
      modal.setAttribute('hidden', 'true');
      document.body.classList.remove('oracle-chat-open');
    }
  }

  function openModal() {
    if (modal) {
      modal.removeAttribute('hidden');
      document.body.classList.add('oracle-chat-open');
      input?.focus();
      if (messages && !messages.childElementCount) {
        appendMessage('Speak, seeker. The Oracle is listening.', 'oracle');
      }
    }
  }

  async function sendSubscription(tier) {
    if (!emailInput?.value) {
      alert('Please add an email so the Oracle can keep the channel open.');
      return;
    }
    try {
      const payload = { tier, email: emailInput?.value || undefined };
      const res = await fetch('/.netlify/functions/oracle-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert('Unable to start subscription. Please try again.');
      }
    } catch (err) {
      console.error('Subscription error', err);
      alert('Unable to start subscription at the moment.');
    }
  }

  async function handleSubmit(event) {
    event?.preventDefault();
    if (isSending) return;
    const question = (input?.value || '').trim();
    if (!question) return;
    if (currentTier === 'free' && questionCount >= MAX_FREE) {
      toggleUpgrade(true);
      return;
    }
    isSending = true;
    appendMessage(question, 'user');
    input.value = '';
    const typingBubble = appendMessage('The Oracle focuses...', 'oracle');
    const payload = {
      message: question,
      history: conversationHistory,
      tier: currentTier,
      questionCount,
      name: nameInput?.value,
      email: emailInput?.value
    };

    try {
      const res = await fetch('/.netlify/functions/oracle-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (typingBubble) typingBubble.remove();

      if (data?.upgradeRequired) {
        toggleUpgrade(true);
        return;
      }

      const reply = (data && data.reply) || 'The Oracle is quiet. Please ask again in a moment.';
      conversationHistory.push({ role: 'user', content: question });
      conversationHistory.push({ role: 'assistant', content: reply });
      appendMessage(reply, 'oracle');
      if (currentTier === 'free') {
        questionCount += 1;
        if (questionCount >= MAX_FREE) toggleUpgrade(true);
      }
      setCounter(data?.remaining);
    } catch (err) {
      console.error('Conversation error', err);
      if (typingBubble) typingBubble.remove();
      appendMessage('The celestial channel flickered. Please try once more.', 'oracle');
    } finally {
      isSending = false;
    }
  }

  function attachEvents() {
    if (!modal) return;
    modal.querySelectorAll('[data-oracle-chat-close]').forEach((btn) => {
      btn.addEventListener('click', closeModal);
    });

    modal.querySelectorAll('[data-subscription-tier]').forEach((btn) => {
      btn.addEventListener('click', (evt) => {
        const tier = evt.currentTarget.getAttribute('data-subscription-tier');
        if (tier) {
          currentTier = tier;
          sendSubscription(currentTier);
        }
      });
    });

    form?.addEventListener('submit', handleSubmit);
  }

  function hydrateRefs(root) {
    modal = root.querySelector('[data-oracle-chat-modal]');
    form = root.querySelector('[data-oracle-chat-form]');
    input = root.querySelector('[data-oracle-chat-input]');
    messages = root.querySelector('[data-oracle-chat-messages]');
    counter = root.querySelector('[data-oracle-chat-counter]');
    upgradeBanner = root.querySelector('[data-oracle-chat-upgrade]');
    nameInput = root.querySelector('[data-oracle-chat-name]');
    emailInput = root.querySelector('[data-oracle-chat-email]');
  }

  async function mountModal() {
    if (modal) return;
    try {
      const res = await fetch('/components/oracle-chat-modal.html');
      if (!res.ok) {
        throw new Error(`Failed to load chat modal (${res.status})`);
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new Error('Unexpected modal response type');
      }
      const html = await res.text();
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const node = wrapper.firstElementChild;
      if (!node) return;
      document.body.appendChild(node);
      hydrateRefs(document);
      attachEvents();
      setCounter(MAX_FREE);
    } catch (err) {
      console.error('Failed to load oracle chat modal', err);
    }
  }

  function bindStartButtons() {
    const buttons = document.querySelectorAll('[data-start-oracle-chat]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', async (evt) => {
        evt.preventDefault();
        await mountModal();
        openModal();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindStartButtons();
  });
})();
