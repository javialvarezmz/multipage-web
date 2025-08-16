// main.js – tema, nav activo y formulario accesible con envío (Formspree)

(function() {
  const THEME_KEY = 'theme'; // 'light' | 'dark' | 'system'
  const html = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  /**
   * Aplica el tema indicado al documento.
   * @param {string} theme - 'light', 'dark' o 'system'
   */
  function applyTheme(theme) {
    if (theme === 'light') { 
      html.setAttribute('data-theme', 'light'); 
    } else if (theme === 'dark') { 
      html.setAttribute('data-theme', 'dark'); 
    } else { 
      html.removeAttribute('data-theme'); // 'system': deja que @media decida
    }
    updateThemeButton(theme);
  }

  /**
   * Obtiene el tema guardado en localStorage o 'system' por defecto.
   * @returns {string}
   */
  function getSavedTheme() {
    const t = localStorage.getItem(THEME_KEY);
    return (t === 'light' || t === 'dark' || t === 'system') ? t : 'system';
  }

  /**
   * Guarda el tema en localStorage.
   * @param {string} theme
   */
  function saveTheme(theme) { 
    localStorage.setItem(THEME_KEY, theme); 
  }

  /**
   * Obtiene el siguiente tema en el ciclo: system -> dark -> light -> system
   * @param {string} curr
   * @returns {string}
   */
  function nextTheme(curr) { 
    return curr === 'system' ? 'dark' : curr === 'dark' ? 'light' : 'system'; 
  }

  /**
   * Resuelve el tema actual aplicado teniendo en cuenta el sistema.
   * @returns {string}
   */
  function currentResolvedTheme() {
    const t = getSavedTheme();
    if (t === 'system') return prefersDark.matches ? 'dark' : 'light';
    return t;
  }

  /**
   * Actualiza el botón de cambio de tema con icono y etiqueta accesible.
   * @param {string} theme
   */
  function updateThemeButton(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const resolved = theme === 'system' ? (prefersDark.matches ? 'dark' : 'light') : theme;
    // Icono/etiqueta accesibles
    const labels = { light: 'Tema claro', dark: 'Tema oscuro', system: 'Tema del sistema' };
    const emojis = { light: '☀️', dark: '🌙', system: '🖥️' };
    btn.setAttribute('aria-label', labels[theme] + ' (actual: ' + labels[resolved] + ')');
    btn.dataset.theme = theme; // útil para tests
    btn.innerText = emojis[resolved] + ' ' + labels[resolved];
  }

  // Inicializa tema
  let theme = getSavedTheme();
  applyTheme(theme);
  prefersDark.addEventListener('change', () => { 
    if (getSavedTheme() === 'system') applyTheme('system'); 
  });

  // Toggle/cycle de tema
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const t = getSavedTheme();
      const nt = nextTheme(t);
      saveTheme(nt); 
      applyTheme(nt);
    });
  }

  /**
   * Marca el enlace de navegación activo según la URL actual.
   */
  (function markActiveNav() {
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('nav a').forEach(a => {
      const href = a.getAttribute('href')?.toLowerCase() || '';
      if (href.endsWith(path)) {
        a.setAttribute('aria-current', 'page');
        a.classList.add('active');
      }
    });
  })();

  /**
   * Configura la validación accesible del formulario con id 'contact-form' y envío a Formspree.
   */
  (function setupFormValidationAndSubmit() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const status = document.getElementById('form-status');
    const successBox = form.querySelector('[data-success]');
    const honeypot = form.querySelector('#company');

    const fields = Array.from(form.querySelectorAll('input, textarea'));

    /**
     * Obtiene el elemento de error asociado a un campo.
     * @param {HTMLElement} field 
     * @returns {HTMLElement|null}
     */
    function errorEl(field) {
      const id = field.getAttribute('id');
      if (!id) return null;
      return document.getElementById(id + '-error');
    }

    /**
     * Genera el mensaje de error según la validez del campo.
     * @param {HTMLElement} field 
     * @returns {string}
     */
    function messageFor(field) {
      const v = field.validity;
      if (v.valid) return '';
      if (v.valueMissing) return 'Este campo es obligatorio.';
      if (v.typeMismatch && field.type === 'email') return 'Introduce un email válido (ej. nombre@dominio.com).';
      if (v.tooShort) return `Debe tener al menos ${field.minLength} caracteres.`;
      if (v.tooLong) return `Debe tener como máximo ${field.maxLength} caracteres.`;
      return 'Revisa este campo.';
    }

    /**
     * Muestra el mensaje de error en el elemento asociado al campo.
     * @param {HTMLElement} field 
     */
    function showError(field) {
      const el = errorEl(field);
      field.setAttribute('aria-invalid', 'true');
      if (!el) return;
      el.textContent = messageFor(field);
    }

    /**
     * Limpia el mensaje de error del campo.
     * @param {HTMLElement} field 
     */
    function clearError(field) {
      const el = errorEl(field);
      field.setAttribute('aria-invalid', 'false');
      if (!el) return;
      el.textContent = '';
    }

    // Validación en tiempo real y al perder foco
    fields.forEach(f => {
      f.addEventListener('input', () => {
        if (f.checkValidity()) clearError(f); else showError(f);
      });
      f.addEventListener('blur', () => { 
        if (!f.checkValidity()) showError(f); 
      });
    });

    // Validación y envío al servidor (Formspree)
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Honeypot: si viene relleno, abortar silenciosamente
      if (honeypot && honeypot.value.trim() !== '') return;

      // Validación previa
      let ok = true;
      fields.forEach(f => {
        if (!f.checkValidity()) { ok = false; showError(f); } else { clearError(f); }
      });
      if (!ok) {
        if (status) { status.classList.remove('visually-hidden'); status.textContent = 'Revisa los campos marcados.'; }
        return;
      }

      try {
        if (status) { status.classList.remove('visually-hidden'); status.textContent = 'Enviando…'; }

        const endpoint = form.getAttribute('action');
        const formData = new FormData(form);

        const res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          form.reset();
          fields.forEach(clearError);
          if (successBox) {
            successBox.hidden = false;
            successBox.textContent = 'Formulario enviado con éxito. ¡Gracias! Te responderé pronto.';
            successBox.setAttribute('tabindex', '-1');
            successBox.focus();
          }
          if (status) { status.textContent = ''; }
        } else {
          let msg = 'No se pudo enviar el formulario. Inténtalo de nuevo en unos minutos.';
          try {
            const data = await res.json();
            if (data && data.errors && data.errors.length) {
              msg = data.errors.map(e => e.message).join(' ');
            }
          } catch (_) {}
          if (status) { status.classList.remove('visually-hidden'); status.textContent = msg; }
        }
      } catch (err) {
        if (status) {
          status.classList.remove('visually-hidden');
          status.textContent = 'Error de red. Comprueba tu conexión e inténtalo de nuevo.';
        }
      }
    });
  })();

})();