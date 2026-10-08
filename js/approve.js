/*
 * Owner approval for readings and certificates. The approval email links
 * here; the draft can be edited, and one click on "Approve and send" builds
 * the PDF and emails it. Opening the page never sends anything by itself.
 */
(function () {
  'use strict';
  var $ = function (sel) { return document.querySelector(sel); };
  var q = new URLSearchParams(location.search);
  var id = q.get('id');
  var token = q.get('token');
  var endpoint = function () { return window.LyrionHouse.FUNCTIONS + '/delivery-approve'; };

  function say(text) { $('#ap-status').textContent = text; }

  function render(d) {
    $('#ap-title').textContent = d.product;
    $('#ap-meta').textContent = 'For ' + d.to + '. Due by ' + new Date(d.due_at).toLocaleString('en-GB') + '.' + (d.gift_note ? ' Gift note: “' + d.gift_note + '”.' : '');
    var list = $('#ap-details');
    list.innerHTML = '';
    (d.details.people || []).forEach(function (p) {
      var dt = document.createElement('dt'); dt.textContent = p.name;
      var dd = document.createElement('dd');
      dd.textContent = 'Born ' + p.date + (p.time ? ' at ' + p.time : '') + (p.place ? ', ' + p.place : '');
      list.append(dt, dd);
    });
    if (d.details.species) { var a = document.createElement('dt'); a.textContent = 'Species'; var b = document.createElement('dd'); b.textContent = d.details.species; list.append(a, b); }
    if (d.details.question) { var c = document.createElement('dt'); c.textContent = 'Their theme'; var e = document.createElement('dd'); e.textContent = d.details.question; list.append(c, e); }
    if (d.status === 'delivered') {
      $('#ap-form').hidden = true;
      say('Already sent to ' + d.to + ' on ' + new Date(d.delivered_at).toLocaleString('en-GB') + '.');
      return;
    }
    $('#ap-text').value = d.draft || '';
    if (!d.draft) say('The automatic draft is not ready yet. You can write the piece here yourself and send it.');
    $('#ap-form').hidden = false;
  }

  function start() {
    if (!id || !token) { say('This approval link is incomplete. Use the link from the approval email.'); return; }
    fetch(endpoint() + '?id=' + encodeURIComponent(id) + '&token=' + encodeURIComponent(token))
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error); return d; }); })
      .then(render)
      .catch(function (err) { say(err.message || 'This approval link is not valid.'); });
    $('#ap-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('#ap-send');
      btn.disabled = true;
      say('Sending…');
      fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, token: token, text: $('#ap-text').value })
      })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error); return d; }); })
        .then(function (d) { $('#ap-form').hidden = true; say('Approved and sent to ' + d.to + ' as a PDF.'); })
        .catch(function (err) { say('Not sent: ' + err.message); btn.disabled = false; });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
