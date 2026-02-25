(function(){
  const saved = localStorage.getItem('pingcomp_theme') || 'system';
  document.documentElement.setAttribute('data-theme', saved);
  const apply = () => {
    const t = document.documentElement.getAttribute('data-theme') || 'system';
    if (t === 'system') {
      const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('light', !dark);
    } else {
      document.documentElement.classList.toggle('light', t === 'light');
    }
  };
  apply();
  window.setTheme = function(t){
    localStorage.setItem('pingcomp_theme', t);
    document.documentElement.setAttribute('data-theme', t);
    apply();
  }
})();
