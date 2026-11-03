(function () {
  'use strict';
  var FORM_ENDPOINT = (function () { var s = document.currentScript; return s && s.src ? new URL('../send.php', s.src).href : '/send.php'; })();
  window.dataLayer = window.dataLayer || [];
  function track(name, extra) { if (window.gtag) window.gtag('event', name, extra || {}); }
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

  /* contact form */
  var cf = document.getElementById('contact-form');
  if (cf) {
    clearOnInput(cf); var cerr = cf.querySelector('.hform__err');
    cf.addEventListener('submit', function (ev) {
      ev.preventDefault(); cerr.textContent = '';
      var bad = validate(cf); if (bad) { bad.focus(); cerr.textContent = 'Please complete the highlighted fields.'; return; }
      var fd = new FormData(cf); if (fd.get('website')) { cf.classList.add('is-done'); return; }
      var btn = cf.querySelector('button[type="submit"]'); btn.disabled = true;
      var data = { _subject: 'AARVIKO contact message - ' + fd.get('name'), _template: 'table', _captcha: 'false', Source: 'Contact Us page' };
      fd.forEach(function (v, k) { if (k !== 'website') data[k] = v || '-'; });
      fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error('send failed'); cf.classList.add('is-done'); cf.reset(); track('generate_lead', { form_position: 'contact_page' }); })
        .catch(function () { cerr.textContent = 'Something went wrong. Please try again or call us on +91 95022 90703.'; })
        .then(function () { btn.disabled = false; });
    });
  }

  /* careers: search, filters and the apply popup */
  var table = document.getElementById('job-table');
  if (table) {
    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr')), q = document.getElementById('job-q'), loc = document.getElementById('job-loc'), ind = document.getElementById('job-ind');
    var count = document.getElementById('job-count'), none = document.getElementById('job-none');
    function filter() {
      var term = q.value.trim().toLowerCase(), shown = 0;
      rows.forEach(function (r) {
        var ok = (!term || r.dataset.title.indexOf(term) > -1) && (!loc.value || r.dataset.location === loc.value) && (!ind.value || r.dataset.industry === ind.value);
        r.hidden = !ok; if (ok) { shown++; r.cells[0].textContent = shown; }
      });
      count.textContent = shown + (shown === 1 ? ' Job Found' : ' Jobs Found'); none.hidden = shown > 0;
    }
    document.getElementById('job-search').addEventListener('submit', function (e) { e.preventDefault(); filter(); });
    document.getElementById('job-go').addEventListener('click', filter);
    q.addEventListener('input', filter);
    document.getElementById('job-clear').addEventListener('click', function () { q.value = ''; loc.value = ''; ind.value = ''; filter(); });

    var modal = document.getElementById('apply-modal'), af = document.getElementById('apply-form'), last = null;
    function open(job) {
      last = document.activeElement;
      document.getElementById('ap-title').textContent = job; document.getElementById('ap-position').value = job; document.getElementById('ap-subject').value = 'AARVIKO job application - ' + job;
      modal.hidden = false; document.body.classList.add('modal-open'); var f = af.querySelector('input:not([type=hidden])'); if (f) f.focus();
    }
    function close() { modal.hidden = true; document.body.classList.remove('modal-open'); if (last && last.focus) last.focus(); }
    table.addEventListener('click', function (e) { var b = e.target.closest('.apply'); if (b) open(b.dataset.job); });
    modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
    clearOnInput(af); var aerr = af.querySelector('.hform__err');
    af.addEventListener('submit', function (e) {
      var bad = validate(af);
      if (bad) { e.preventDefault(); bad.focus(); aerr.textContent = 'Please complete the highlighted fields and accept the consent.'; return; }
      var file = af.querySelector('input[type="file"]');
      if (file && file.files[0] && file.files[0].size > 5 * 1024 * 1024) { e.preventDefault(); aerr.textContent = 'Please upload a resume smaller than 5 MB.'; return; }
      track('generate_lead', { form_position: 'careers_application' }); af.querySelector('button[type="submit"]').disabled = true;
    });
    if (/[?&]applied=1/.test(location.search)) { document.getElementById('job-thanks').hidden = false; }
  }
})();
