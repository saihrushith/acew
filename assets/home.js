(function () {
  'use strict';
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/suma@aarviko.com';
  window.dataLayer = window.dataLayer || [];
  function track(name, extra) { var e = { event: name }; for (var k in (extra || {})) e[k] = extra[k]; window.dataLayer.push(e); if (window.gtag) window.gtag('event', name, extra || {}); }

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

/* mobile enquiry sheet */
(function () {
  var wrap = document.querySelector('.hero__form');
  if (!wrap) return;
  var mq = window.matchMedia('(max-width: 767px)'), ov = document.createElement('div'), last = null;
  ov.className = 'sheet-overlay'; document.body.appendChild(ov);
  function open() { last = document.activeElement; wrap.classList.add('is-open'); document.body.classList.add('sheet-open'); var f = wrap.querySelector('input'); if (f) setTimeout(function () { f.focus(); }, 380); }
  function close() { wrap.classList.remove('is-open'); document.body.classList.remove('sheet-open'); if (last && last.focus) last.focus(); }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-sheet], a[href="#enquire"]');
    if (t && mq.matches) { e.preventDefault(); open(); return; }
    if (e.target === ov || e.target.closest('.hform__close')) close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  var onChange = function () { if (!mq.matches) close(); };
  if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
})();

/* animations */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var root = document.documentElement;
  root.classList.add('anim');

  // split the hero headline into words so they can rise one by one
  var h1 = document.querySelector('.hero h1'), n = 0;
  if (h1) {
    (function split(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', n++); s.textContent = part; frag.appendChild(s);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1) split(c);
      });
    })(h1);
  }

  // scroll reveal, staggered inside each group
  var sel = '.sec .head > *, .sec > .wrap > h2, .sec > .wrap > .tag, .narrow > *, .card, .svc2__card, .service > *, .chips li, .faq details, .two > *, .cta .wrap > *, .form-card, .center, .note';
  var els = Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (el) { return !el.closest('.hero') && !el.closest('.foot') && !el.closest('.hero__form'); });
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
  els.forEach(function (el) {
    var idx = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
    el.style.setProperty('--d', Math.min(idx, 7) * 0.07 + 's');
    el.classList.add('rv');
    if (io) io.observe(el); else el.classList.add('is-in');
  });
})();
