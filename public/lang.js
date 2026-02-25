(function(){
  const KEY = 'pingcomp_lang';
  function getCurrentLang() {
    const params = new URLSearchParams(window.location.search);
    return params.get('lang') || 'zh';
  }
  function saveLang(lang){ localStorage.setItem(KEY, lang); }
  function readLang(){ return localStorage.getItem(KEY); }

  // if current URL has lang, persist it
  const current = getCurrentLang();
  if (current) saveLang(current);

  // if URL has no lang but local has, redirect once with lang
  const params = new URLSearchParams(window.location.search);
  if (!params.get('lang')) {
    const pref = readLang();
    if (pref && (pref === 'zh' || pref === 'en')) {
      params.set('lang', pref);
      const next = window.location.pathname + '?' + params.toString();
      window.location.replace(next);
      return;
    }
  }

  window.setLang = function(lang){
    saveLang(lang);
    const params = new URLSearchParams(window.location.search);
    params.set('lang', lang);
    window.location.href = window.location.pathname + '?' + params.toString();
  };
})();
