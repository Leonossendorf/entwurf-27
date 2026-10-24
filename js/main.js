/* Menzel – Entwurf. Kein Tracking, keine externen Dienste. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Menü */
  var btn = $('.menu-btn'), nav = $('.nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var offen = nav.classList.toggle('offen');
      btn.setAttribute('aria-expanded', offen ? 'true' : 'false');
    });
  }

  /* Förder-Uhr: Tage bis zur nächsten Absenkung des Klimageschwindigkeitsbonus */
  var STICHTAG = new Date('2027-02-01T00:00:00+01:00');
  var tage = Math.max(0, Math.ceil((STICHTAG - new Date()) / 86400000));
  $$('[data-tage]').forEach(function (el) { el.textContent = tage; });
  $$('.manometer [data-zeiger]').forEach(function (z) {
    // Skala: 0 Tage = rechts (ablaufend), 200 Tage = links
    var anteil = Math.min(1, tage / 200);
    var winkel = 120 - anteil * 240;
    z.setAttribute('transform', 'rotate(' + winkel + ' 100 100)');
  });

  /* Fachmarkt: geöffnet? Mo–Fr 7:30–12 und 13–17, Sa 8–12 */
  $$('[data-offen]').forEach(function (el) {
    var n = new Date(), t = n.getDay(), m = n.getHours() * 60 + n.getMinutes(), auf = false;
    if (t >= 1 && t <= 5) auf = (m >= 450 && m < 720) || (m >= 780 && m < 1020);
    if (t === 6) auf = m >= 480 && m < 720;
    el.classList.toggle('ja', auf);
    el.textContent = auf ? 'Jetzt geöffnet' : 'Gerade geschlossen';
  });

  /* Förderrechner (KfW 458, Stand 21.07.2026, Einfamilienhaus) */
  var r = $('#rechner');
  if (r) {
    var KOSTEN = 28000;
    var euro = function (x) { return x.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €'; };
    var wert = function (name) { var e = $('input[name="' + name + '"]:checked', r); return e ? e.value : ''; };
    var rechne = function () {
      var selbst = wert('nutzung') === 'selbst';
      var alt = wert('altheizung');
      var ek = wert('einkommen');
      var kind = $('input[name="kind"]', r).checked;
      var kgbOk = selbst && ['oel', 'gas20', 'etage', 'nacht', 'kohle', 'bio20'].indexOf(alt) > -1;
      var grenzen = kind ? [40000, 50000, 60000] : [30000, 40000, 50000];
      var ekb = 0, ekWert = { a: 30000, b: 40000, c: 50000, d: 60000, e: 999999 }[ek];
      if (selbst && ekWert) {
        if (ekWert <= grenzen[0]) ekb = 40; else if (ekWert <= grenzen[1]) ekb = 30; else if (ekWert <= grenzen[2]) ekb = 10;
      }
      var deckel = (selbst && ekWert && ekWert <= grenzen[0]) ? 80 : 70;
      var quote = Math.min(deckel, 30 + (kgbOk ? 16 : 0) + ekb);
      var quoteSpaeter = Math.min(deckel, 30 + (kgbOk ? 12 : 0) + ekb);
      var kostenSpaeter = KOSTEN - 750;
      $('#q-gross', r).innerHTML = quote + '<small>%</small>';
      $('#q-grund', r).textContent = '30 %';
      $('#q-kgb', r).textContent = kgbOk ? '16 %' : (selbst ? 'nicht bei dieser Heizung' : 'nur bei Selbstnutzung');
      $('#q-ek', r).textContent = !selbst ? 'nur bei Selbstnutzung' : (ek === '' ? 'nicht angegeben' : ekb + ' %');
      $('#q-max', r).textContent = euro(KOSTEN * quote / 100);
      var diff = KOSTEN * quote / 100 - kostenSpaeter * quoteSpaeter / 100;
      var w = $('#q-warn', r);
      if (diff > 0) {
        w.innerHTML = 'Wer den Antrag erst ab dem <b>1. Februar 2027</b> stellt, bekommt in diesem Fall bis zu <b>' + euro(diff) + '</b> weniger.';
        w.hidden = false;
      } else { w.hidden = true; }
      var feld = $('#rechner-uebernahme');
      if (feld) feld.value = 'Förderrechner: ' + quote + ' %, bis ' + euro(KOSTEN * quote / 100);
    };
    r.addEventListener('change', rechne);
    rechne();
  }

  /* Formulare: Pflicht ist nur ein Rückweg (Telefon oder E-Mail) */
  $$('form.anfrage').forEach(function (f) {
    var weichen = $$('input[name="anliegen"]', f);
    var zeigeWeiche = function () {
      var w = (weichen.filter(function (x) { return x.checked; })[0] || {}).value;
      $$('[data-weiche]', f).forEach(function (b) {
        b.hidden = w ? b.getAttribute('data-weiche').split(' ').indexOf(w) === -1 : true;
      });
    };
    weichen.forEach(function (x) { x.addEventListener('change', zeigeWeiche); });
    zeigeWeiche();

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var tel = $('input[type=tel]', f), mail = $('input[type=email]', f), fehler = $('.fehler', f);
      var ok = (tel && tel.value.replace(/\D/g, '').length >= 6) || (mail && /.+@.+\..+/.test(mail.value));
      if (!ok) {
        fehler.textContent = 'Bitte eine Telefonnummer oder eine E-Mail-Adresse angeben, damit wir antworten können.';
        (tel || mail).focus();
        return;
      }
      fehler.textContent = '';
      f.hidden = true;
      var d = f.nextElementSibling;
      if (d && d.classList.contains('danke')) { d.classList.add('zeigen'); d.setAttribute('tabindex', '-1'); d.focus(); }
    });
  });

  /* Stellenkarten: "Für diese Stelle bewerben" wählt die Stelle im Formular aus */
  $$('[data-stelle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var c = $('input[name="stelle"][value="' + b.getAttribute('data-stelle') + '"]');
      if (c) { c.checked = true; }
      var z = $('#bewerbung');
      if (z) z.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* Thema aus Link übernehmen (?thema=waermepumpe) */
  var thema = new URLSearchParams(location.search).get('thema');
  if (thema) {
    var t = $('input[name="anliegen"][value="' + thema + '"]');
    if (t) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
  }

  /* Wärmepumpen-Schnellcheck */
  var sc = $('#schnellcheck');
  if (sc) {
    var aus = $('#sc-ergebnis');
    var auswerten = function () {
      var w = function (n) { var e = $('input[name="' + n + '"]:checked', sc); return e ? e.value : ''; };
      var fl = w('flaechen'), bj = w('baujahr'), san = w('saniert');
      if (!fl || !bj) { aus.innerHTML = '<b>Zwei Klicks fehlen noch.</b> Wählen Sie Baujahr und Heizflächen.'; return; }
      var punkte = 0;
      if (fl === 'fbh') punkte += 2; else if (fl === 'beides') punkte += 1;
      if (bj === 'neu') punkte += 2; else if (bj === 'mittel') punkte += 1;
      if (san === 'ja') punkte += 1;
      var titel, text;
      if (punkte >= 3) {
        titel = 'Sehr gute Voraussetzungen.';
        text = 'Ihr Haus bringt viel von dem mit, was eine Wärmepumpe effizient macht. Wir kommen vorbei, prüfen den Aufstellort und rechnen Ihnen Angebot und Förderung aus.';
      } else if (punkte >= 1) {
        titel = 'Gut möglich.';
        text = 'Viele Häuser dieser Art heizen heute mit Wärmepumpe. Wir sehen uns die Heizkörper an: Die tecalor-Geräte der TTL-Reihe arbeiten laut Hersteller mit Vorlauftemperaturen bis 55 °C, auch mit bestehenden Heizkörpern.';
      } else {
        titel = 'Wir schauen es uns an.';
        text = 'Auch ältere Häuser lassen sich oft umstellen, manchmal mit einzelnen größeren Heizkörpern oder als Hybrid mit dem vorhandenen Kessel. Das klären wir bei einem Termin vor Ort.';
      }
      aus.innerHTML = '<b>' + titel + '</b> ' + text;
    };
    sc.addEventListener('change', auswerten);
  }
})();
