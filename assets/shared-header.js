(function () {
  var b = document.getElementById('ah-burger'), l = document.getElementById('ah-links');
  if (!b || !l) return;
  function set(o) { l.classList.toggle('open', o); b.setAttribute('aria-expanded', String(o)); b.setAttribute('aria-label', o ? 'Close menu' : 'Open menu'); }
  b.addEventListener('click', function () { set(!l.classList.contains('open')); });
  l.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
})();
