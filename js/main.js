(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Título do hero: separa em palavras e faz entrarem em sequência
  var split = document.querySelector('.split');
  if (split) {
    var count = 0;
    var makeWord = function () {
      var s = document.createElement('span');
      s.className = 'w';
      s.style.transitionDelay = (0.12 + count++ * 0.06) + 's';
      return s;
    };
    Array.prototype.slice.call(split.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var s = makeWord();
          s.textContent = part;
          frag.appendChild(s);
        });
        split.replaceChild(frag, node);
      } else {
        var s = makeWord();
        split.replaceChild(s, node);
        s.appendChild(node);
      }
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { split.classList.add('is-in'); });
    });
  }

  // Cabeçalho + barra de leitura + parallax + linha: um único laço por quadro
  var header = document.querySelector('.header');
  var progress = document.querySelector('.progress');
  var parallax = document.querySelector('.parallax');
  var ticking = false;

  function frame() {
    ticking = false;
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 20);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    if (parallax && !reduceMotion) {
      parallax.style.transform = 'translateY(' + Math.min(y, 700) * 0.05 + 'px)';
    }
    drawThread(y, max);
  }
  function requestFrame() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }
  window.addEventListener('scroll', requestFrame, { passive: true });

  // ---- Linha de contorno ----
  // Desce pelas margens, cruza de um lado para o outro entre as seções e termina
  // no monograma da chamada final. No celular fica só na margem direita, sem cruzar.
  var main = document.querySelector('main');
  var thread = document.getElementById('thread');
  var svg = thread.querySelector('svg');
  var path = document.getElementById('threadPath');
  var tip = document.getElementById('threadTip');
  var endMark = document.getElementById('threadEnd');
  var samples = [];
  var total = 0;
  var mainTop = 0;

  function buildThread() {
    var mainRect = main.getBoundingClientRect();
    var w = main.clientWidth;
    var h = main.offsetHeight;
    mainTop = mainRect.top + window.scrollY;
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

    var margin = document.querySelector('.section .container').getBoundingClientRect().left;
    var wide = margin >= 40;
    var base = Math.max(margin * 0.5, 9);
    var amp = wide ? margin * 0.3 : 5;
    var band = 70;
    var left = base;
    var right = w - base;

    var tops = Array.prototype.map.call(main.querySelectorAll('[data-thread]'), function (el) {
      return el.getBoundingClientRect().top - mainRect.top;
    });
    var markRect = endMark.getBoundingClientRect();
    var endX = markRect.left + markRect.width / 2 - mainRect.left;
    var endY = markRect.top - mainRect.top;

    var onLeft = wide;
    var x = onLeft ? left : right;
    var y = tops[0] + 28;
    var d = 'M' + x.toFixed(1) + ' ' + y.toFixed(1);

    function curve(x1, y1, x2, y2, x3, y3) {
      d += 'C' + [x1, y1, x2, y2, x3, y3].map(function (n) { return n.toFixed(1); }).join(' ');
    }
    function bow(toY, dir) {
      var span = toY - y;
      if (span <= 8) return;
      var mid = y + span / 2;
      var q = span / 4;
      curve(x, y + q, x + amp * dir, mid - q, x + amp * dir, mid);
      curve(x + amp * dir, mid + q, x, toY - q, x, toY);
      y = toY;
    }
    function cross(toX, toY) {
      var c = (toY - y) * 0.5;
      curve(x, y + c, toX, toY - c, toX, toY);
      x = toX;
      y = toY;
    }

    for (var i = 1; i < tops.length; i++) {
      var dir = wide ? (onLeft ? 1 : -1) : (i % 2 ? -1 : 1);
      bow(tops[i] - band, dir);
      if (i === tops.length - 1) {
        cross(endX, endY);
      } else if (wide) {
        onLeft = !onLeft;
        cross(onLeft ? left : right, tops[i] + band);
      }
    }

    path.setAttribute('d', d);
    total = path.getTotalLength();
    path.style.strokeDasharray = total + ' ' + total;

    // Tabela altura > comprimento: a linha desce sempre, então a busca é direta
    samples = [];
    var steps = Math.ceil(total / 18);
    for (var s = 0; s <= steps; s++) {
      var len = total * s / steps;
      var p = path.getPointAtLength(len);
      samples.push({ len: len, x: p.x, y: p.y });
    }
    frame();
  }

  function drawThread(scrollY, maxScroll) {
    if (!samples.length) return;
    if (reduceMotion) {
      path.style.strokeDashoffset = 0;
      tip.style.display = 'none';
      endMark.classList.add('is-lit');
      return;
    }
    var target = scrollY + window.innerHeight * 0.62 - mainTop;
    var point;
    if (scrollY >= maxScroll - 4 || target >= samples[samples.length - 1].y) {
      point = samples[samples.length - 1];
    } else {
      var lo = 0;
      var hi = samples.length - 1;
      while (hi - lo > 1) {
        var m = (lo + hi) >> 1;
        if (samples[m].y < target) lo = m; else hi = m;
      }
      point = samples[lo];
    }
    var done = point.len >= total - 1;
    path.style.strokeDashoffset = total - point.len;
    tip.setAttribute('transform', 'translate(' + point.x.toFixed(1) + ' ' + point.y.toFixed(1) + ')');
    tip.style.display = done || point.len === 0 ? 'none' : '';
    endMark.classList.toggle('is-lit', done);
  }

  var rebuildTimer;
  function scheduleBuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(buildThread, 140);
  }
  buildThread();
  window.addEventListener('load', buildThread);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildThread);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleBuild).observe(main);
  else window.addEventListener('resize', scheduleBuild);

  // Menu do celular
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  toggle.addEventListener('click', function () {
    setMenu(!nav.classList.contains('is-open'));
  });
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });
  window.matchMedia('(min-width: 1200px)').addEventListener('change', function () { setMenu(false); });

  // Revelação suave ao rolar
  var items = document.querySelectorAll('.reveal');
  var timeline = document.querySelector('.timeline');
  function show(el) {
    el.classList.add('is-visible');
    // Depois de aparecer, o hover dos cards responde sem o atraso do reveal
    setTimeout(function () { el.classList.add('is-done'); }, 1300);
  }
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });

    new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) {
        timeline.classList.add('is-drawn');
        obs.disconnect();
      }
    }, { threshold: 0.25 }).observe(timeline);
  } else {
    items.forEach(show);
    timeline.classList.add('is-drawn');
  }

  // Uma pergunta aberta por vez
  var details = document.querySelectorAll('.accordion details');
  details.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      details.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  // Cliques no WhatsApp ficam prontos para o rastreamento (GTM ou pixel), com event_id para deduplicação
  window.dataLayer = window.dataLayer || [];
  document.querySelectorAll('a[data-cta]').forEach(function (a) {
    a.addEventListener('click', function () {
      window.dataLayer.push({
        event: 'whatsapp_click',
        cta: a.getAttribute('data-cta'),
        event_id: 'wa-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
      });
    });
  });

  var ano = document.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();
})();
