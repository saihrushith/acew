(function () {
  'use strict';
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/suma@sprintoverseas.com';
  window.dataLayer = window.dataLayer || [];
  function track(name, extra) { var e = { event: name }; for (var k in (extra || {})) e[k] = extra[k]; window.dataLayer.push(e); }

  // mobile menu
  var burger = document.getElementById('burger'), links = document.getElementById('nav-links');
  function setMenu(open) { links.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); }
  burger.addEventListener('click', function () { setMenu(!links.classList.contains('open')); });
  links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // click tracking
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href');
    if (h.indexOf('tel:') === 0) track('click_call'); else if (h.indexOf('wa.me') > -1) track('click_whatsapp');
  });

  // enquiry form
  var form = document.getElementById('home-form'), err = document.getElementById('home-err');
  form.querySelectorAll('input').forEach(function (i) { i.addEventListener('input', function () { var f = i.closest('.fld'); if (f) f.classList.remove('is-invalid'); }); });
  form.addEventListener('submit', function (ev) {
    ev.preventDefault(); err.textContent = '';
    var bad = null;
    form.querySelectorAll('input[required]').forEach(function (i) {
      var ok = i.checkValidity() && i.value.trim() !== '';
      i.closest('.fld').classList.toggle('is-invalid', !ok);
      if (!ok && !bad) bad = i;
    });
    if (bad) { bad.focus(); err.textContent = 'Please fill in your name, a valid email and your phone number.'; return; }
    var fd = new FormData(form);
    if (fd.get('website')) { form.classList.add('is-done'); return; }   // hidden field: bots fill it
    var btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
    fetch(FORM_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ _subject: 'AARVIKO enquiry - ' + fd.get('name'), _template: 'table', _captcha: 'false', Name: fd.get('name'), Email: fd.get('email'), Phone: fd.get('phone'), Source: 'Home page enquiry form' })
    }).then(function (r) {
      if (!r.ok) throw new Error('send failed');
      form.classList.add('is-done'); form.reset(); track('generate_lead', { form_position: 'home_hero' });
    }).catch(function () {
      err.textContent = 'Something went wrong. Please try again or WhatsApp us at +91 95022 90703.';
    }).then(function () { btn.disabled = false; });
  });
})();
