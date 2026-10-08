/*
 * Birthday Book: save the birthdays of the people you buy for and get a
 * reminder 21 days before each one. Double opt-in by email, one-click
 * unsubscribe, and deletion of the whole book on request.
 */
(function () {
  'use strict';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  function api(body) {
    return fetch(window.LyrionHouse.FUNCTIONS + '/birthday-book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
        return data;
      });
    });
  }

  var rowCount = 0;
  function addRow() {
    rowCount += 1;
    var i = rowCount;
    var tpl = document.createElement('fieldset');
    tpl.className = 'cart-details__person bb-row';
    tpl.innerHTML =
      '<legend>Person ' + i + '</legend>' +
      '<div class="cart-details__field"><label for="bb-name-' + i + '">Name</label><input id="bb-name-' + i + '" data-key="name" type="text" maxlength="60" autocomplete="off" required></div>' +
      '<div class="bb-date">' +
      '<div class="cart-details__field"><label for="bb-day-' + i + '">Day</label><select id="bb-day-' + i + '" data-key="day" required><option value="">Day</option></select></div>' +
      '<div class="cart-details__field"><label for="bb-month-' + i + '">Month</label><select id="bb-month-' + i + '" data-key="month" required><option value="">Month</option></select></div>' +
      '<div class="cart-details__field"><label for="bb-year-' + i + '">Year (optional)</label><input id="bb-year-' + i + '" data-key="year" type="number" inputmode="numeric" min="1900" max="' + new Date().getFullYear() + '"></div>' +
      '</div>' +
      '<div class="cart-details__field"><label for="bb-rel-' + i + '">Who they are to you (optional)</label><input id="bb-rel-' + i + '" data-key="relationship" type="text" maxlength="40" placeholder="Sister, colleague, godson…"></div>';
    var day = $('[data-key="day"]', tpl);
    var month = $('[data-key="month"]', tpl);
    for (var d = 1; d <= 31; d += 1) day.append(new Option(String(d), String(d)));
    MONTHS.forEach(function (m, k) { month.append(new Option(m, String(k + 1))); });
    $('#bb-rows').append(tpl);
  }

  function show(id, text) {
    var n = document.getElementById(id);
    n.textContent = text;
    n.hidden = !text;
  }

  function submit(e) {
    e.preventDefault();
    show('bb-error', '');
    var entries = Array.prototype.map.call(document.querySelectorAll('.bb-row'), function (row) {
      var o = {};
      row.querySelectorAll('[data-key]').forEach(function (input) { if (input.value) o[input.dataset.key] = input.value.trim(); });
      return o;
    }).filter(function (o) { return o.name || o.day || o.month; });
    if (!entries.length) { show('bb-error', 'Add at least one name and birthday.'); return; }
    var bad = entries.find(function (o) { return !o.name || !o.day || !o.month; });
    if (bad) { show('bb-error', 'Each person needs a name, a day and a month.'); return; }
    if (!$('#bb-consent').checked) { show('bb-error', 'Please tick the box to agree to birthday reminders.'); return; }
    var btn = $('#bb-submit');
    btn.disabled = true;
    api({ action: 'add', email: $('#bb-email').value, name: $('#bb-owner').value, consent: true, entries: entries })
      .then(function () {
        $('#bb-form').hidden = true;
        show('bb-done', 'Thank you. Please open the email we have just sent to ' + $('#bb-email').value + ' and confirm. No reminders are sent until you do.');
      })
      .catch(function (err) { show('bb-error', err.message); })
      .then(function () { btn.disabled = false; });
  }

  function handleLink() {
    var q = new URLSearchParams(location.search);
    var email = q.get('email');
    var token = q.get('token');
    if (!email || !token) return false;
    $('#bb-form').hidden = true;
    if (q.get('confirm')) {
      api({ action: 'confirm', email: email, token: token })
        .then(function () { show('bb-done', 'Your Birthday Book is confirmed. We will email ' + email + ' 21 days before each birthday.'); })
        .catch(function (err) { show('bb-error', err.message); });
      return true;
    }
    if (q.get('unsubscribe')) {
      // One click from the email is enough to stop every reminder.
      api({ action: 'unsubscribe', email: email, token: token })
        .then(function () {
          show('bb-done', 'Done. ' + email + ' will receive no more birthday reminders.');
          var del = $('#bb-delete');
          del.hidden = false;
          del.addEventListener('click', function () {
            del.disabled = true;
            api({ action: 'delete', email: email, token: token })
              .then(function (r) { show('bb-done', 'Your Birthday Book has been deleted (' + (r.deleted || 0) + ' entries).'); del.hidden = true; })
              .catch(function (err) { show('bb-error', err.message); del.disabled = false; });
          });
        })
        .catch(function (err) { show('bb-error', err.message); });
      return true;
    }
    return false;
  }

  function start() {
    if (handleLink()) return;
    addRow();
    $('#bb-add').addEventListener('click', function () { if (rowCount < 20) addRow(); });
    $('#bb-form').addEventListener('submit', submit);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
