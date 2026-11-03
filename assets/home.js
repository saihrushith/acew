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

  // hero enquiry form (home page)
  var form = document.getElementById('home-form'), err = document.getElementById('home-err');
  if (form) {
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
      body: JSON.stringify({ _subject: (form.dataset.subject || 'AARVIKO enquiry') + ' - ' + fd.get('name'), _template: 'table', _captcha: 'false', Name: fd.get('name'), Email: fd.get('email'), Phone: fd.get('phone'), Source: form.dataset.source || 'Home page enquiry form' })
    }).then(function (r) {
      if (!r.ok) throw new Error('send failed');
      form.classList.add('is-done'); form.reset(); track('generate_lead', { form_position: 'home_hero' });
    }).catch(function () {
      err.textContent = 'Something went wrong. Please try again or WhatsApp us at +91 95022 90703.';
    }).then(function () { btn.disabled = false; });
  });
  }

  /* pages v2 */
  function validate(f) {
    var bad = null;
    f.querySelectorAll('[required]').forEach(function (i) {
      var ok = i.type === 'checkbox' ? i.checked : (i.checkValidity() && String(i.value).trim() !== '');
      var w = i.closest('.fld, .check'); if (w) w.classList.toggle('is-invalid', !ok);
      if (!ok && !bad) bad = i;
    });
    return bad;
  }
  function clearOnInput(f) { f.querySelectorAll('input, select, textarea').forEach(function (i) { ['input', 'change'].forEach(function (ev) { i.addEventListener(ev, function () { var w = i.closest('.fld, .check'); if (w) w.classList.remove('is-invalid'); }); }); }); }

  var ef = document.getElementById('employer-form');
  if (ef) {
    clearOnInput(ef); var eerr = ef.querySelector('.hform__err');
    ef.addEventListener('submit', function (ev) {
      ev.preventDefault(); eerr.textContent = '';
      var bad = validate(ef); if (bad) { bad.focus(); eerr.textContent = 'Please complete the highlighted fields.'; return; }
      var fd = new FormData(ef); if (fd.get('website')) { ef.classList.add('is-done'); return; }
      var btn = ef.querySelector('button[type="submit"]'); btn.disabled = true;
      var data = { _subject: 'AARVIKO employer hiring enquiry - ' + fd.get('company'), _template: 'table', _captcha: 'false', Source: 'Recruitment page: employer hiring enquiry' };
      fd.forEach(function (v, k) { if (k !== 'website') data[k] = v || '-'; });
      fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error('send failed'); ef.classList.add('is-done'); ef.reset(); track('generate_lead', { form_position: 'recruitment_employer' }); })
        .catch(function () { eerr.textContent = 'Something went wrong. Please try again or WhatsApp us at +91 95022 90703.'; })
        .then(function () { btn.disabled = false; });
    });
  }

  var sf = document.getElementById('seeker-form');
  if (sf) {
    clearOnInput(sf); var serr = sf.querySelector('.hform__err');
    sf.addEventListener('submit', function (ev) {
      var bad = validate(sf);
      if (bad) { ev.preventDefault(); bad.focus(); serr.textContent = 'Please complete the highlighted fields and accept the consent.'; return; }
      var file = sf.querySelector('input[type="file"]');
      if (file && file.files[0] && file.files[0].size > 5 * 1024 * 1024) { ev.preventDefault(); serr.textContent = 'Please upload a resume smaller than 5 MB.'; return; }
      track('generate_lead', { form_position: 'recruitment_job_seeker' });
      sf.querySelector('button[type="submit"]').disabled = true;
    });
    if (/[?&]registered=1/.test(location.search)) { sf.hidden = true; var ok = document.getElementById('seeker-ok'); if (ok) ok.hidden = false; }
  }
})();
