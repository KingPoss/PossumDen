/*
 *   - No Flash.
 *   - No telemetry, no cookies
 *   - No remote script loading.
 *   - Plain HTML5 <audio>, event-driven (no 500ms polling).

 *   - Hand-written HTML/CSS skins also supported — pass a {html, css} object
 *     as the `skin` option, or call KPR.dumpSkinAsHtml(url) in the console
 *     to generate CSS/HTML from an existing XML skin so you can migrate.
 *   - Scrolling marquee for "now playing" metadata (Icecast / Shoutcast).
 *
 * Public API (drop-in compatible with the legacy KPR):
 *   KPR.insert(opts)            — create a player instance
 *   KPR.play() / KPR.stop()
 *   KPR.setVolume(0..100)
 *   KPR.setUrl(url)             — swap stream URL
 *   KPR.setFallbackUrl(url)     — used if the primary URL errors past retry
 *   KPR.setTitle(str)           — static title shown when no metadata
 *   KPR.showInfo(str)           — push an arbitrary string to the display
 *   KPR.setCallbackFunction(fn) — fn(objectId, event, data); events: play,
 *                                 stop, metadata, error
 *   KPR.setObjectId(id) / KPR.setElementId(id)
 *   KPR.dumpSkinAsHtml(xmlUrl)  — logs equivalent standalone HTML+CSS
 *
 * insert() options:
 *   url, codec, volume, autoplay, title, width, height, elementId, id,
 *   skin                 — '/path/to/skin.xml'  or  {html, css}
 *   metadataMode         — 'azuracast' | 'icecast' (default) | 'icecast-csv' |
 *                          'shoutcast-v1' | 'shoutcast-v2' | 'none'
 *   metadataStation      — AzuraCast station shortcode, e.g. 'kpradio'.
 *                          If set and metadataMode is unspecified, mode
 *                          defaults to 'azuracast'.
 *   metadataUrl          — explicit full URL to poll, overriding the
 *                          auto-built one (still uses the extractor chosen
 *                          by metadataMode).
 *   metadataFetcher      — escape hatch: a function returning a Promise
 *                          that resolves to the title string. Bypasses
 *                          ALL of the built-in URL building / extraction.
 *                          Use this if you already have a working metadata
 *                          fetcher elsewhere on your page and just want to
 *                          drop it into the player verbatim. Example:
 *
 *                          metadataFetcher: function () {
 *                            return fetch('https://radio.kingposs.com/api/nowplaying/kpradio')
 *                              .then(function (r) { return r.json(); })
 *                              .then(function (j) {
 *                                var s = j.now_playing.song;
 *                                return s.artist + ' - ' + s.title;
 *                              });
 *                          }
 *   metadataInterval     — seconds between polls (default 10, min 3)
 *   metadataProxy        — optional CORS proxy. Either a template with {url}
 *                          or a base URL that accepts ?url=
 *   metadataMount        — for multi-mount Icecast servers, the mount to
 *                          match against /status-json.xsl
 *   onNowPlaying         — callback(np) fired with the full AzuraCast
 *                          nowplaying object on every update.
 *   nowPlayingUI         — optional object to auto-bind external UI
 *                          elements by ID. All keys are optional:
 *                            songTitle:  '#np-title'   — song title
 *                            songArtist: '#np-artist'  — song artist
 *                            liveImage:  '#onair'       — swaps src
 *                            liveImageSrc:  '/assets/kplive.gif'
 *                            offlineImageSrc: '/assets/autodj.gif'
 *                            liveText:   '#status'     — sets text content
 *                            liveTextOn: 'KP LIVE!'    — text when live
 *                            liveTextOff:'Auto-DJ'     — text when offline
 *                            chatWindow: '#chat'       — shown when live
 *                            chatCooldown: 300         — seconds to keep
 *                              chat open after broadcast ends (client-side
 *                              only, new page loads won't see it)
 *   callbackFunction     — same as setCallbackFunction
 *
 * AzuraCast example:
 *   KPR.insert({
 *     url: 'https://radio.kingposs.com/radio.mp3',
 *     codec: 'mp3', autoplay: false, volume: 40,
 *     title: 'KPradio.net',
 *     skin: '/radioThemes/oldradio/oldradio.xml',
 *     width: 205, height: 132,
 *     metadataMode: 'azuracast',
 *     metadataStation: 'kpradio'   // from /api/nowplaying/<shortcode>
 *   });
 *
 * NOTE on metadata + CORS: AzuraCast's /api/nowplaying endpoints ship with
 * Access-Control-Allow-Origin: * out of the box, so no proxy is needed.
 * Vanilla Icecast's /status-json.xsl usually does NOT send CORS headers; if
 * you're on plain Icecast, either enable CORS on the server or run a small
 * server-side proxy and pass it as `metadataProxy`.
 */

(function (global) {
  'use strict';

  // ---------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------

  function resolveUrl(base, rel) {
    return new URL(rel, base).href;
  }

  function cacheBust(url) {
    return url + (url.indexOf('?') === -1 ? '?' : '&') + '_t=' + Date.now();
  }

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
      }
    }
    return target;
  }

  // Normalize a "now playing" string from a stream source. Trims
  // whitespace, collapses runs of spaces, and strips dangling dashes that
  // appear when an "artist - title" template is rendered with a missing
  // artist (or title) — e.g. " - Song Name" becomes "Song Name".
  function cleanTitleText(s) {
    if (s == null) return '';
    s = String(s).replace(/\s+/g, ' ').trim();
    // Leading dash with optional spacing: "- song", "-song", "– song".
    s = s.replace(/^[-–—]+\s*/, '');
    // Trailing dash with optional spacing: "song -", "song –".
    s = s.replace(/\s*[-–—]+$/, '');
    return s.trim();
  }

  // Skin loader
  //
  // Example input (oldradio.xml):
  //   <ffmp3-skin folder="ffmp3-oldradio">
  //     <bg image="mono.png" x="0" y="0" />
  //     <play image="play.png" x="21" y="89" clickimage="playclick.png" />
  //     <stop image="stop.png" x="69" y="90" clickimage="stopclick.png" />
  //     <text x="20" y="41" width="170" height="25"
  //           color="#000000" font="Verdana" size="16" />
  //     <volume mode="holder" x="18" y="65" width="110" height="17"
  //             holderImage="holder.png" />
  //     <status imagePlay="statusplay.png" imageStop="statusstop.png"
  //             x="12" y="32" />
  //   </ffmp3-skin>
  //
  // All `image` attributes resolve against   <xmlBase>/<folder>/
  // where xmlBase is the directory containing the XML file.

  function parseSkinXml(xmlText, xmlUrl) {
    var doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    var err = doc.querySelector('parsererror');
    if (err) throw new Error('Skin XML parse error in ' + xmlUrl);
    var root = doc.querySelector('ffmp3-skin');
    if (!root) throw new Error('Not an <ffmp3-skin> document: ' + xmlUrl);

    var folder = root.getAttribute('folder') || '';
    var baseUrl = xmlUrl.replace(/[^/]*$/, '');
    var imageBase = resolveUrl(
      baseUrl,
      folder ? (folder.charAt(folder.length - 1) === '/' ? folder : folder + '/') : ''
    );

    // Attribute names in the wild are inconsistent (clickimage vs clickImage,
    // holderImage vs holderimage). Look them up case-insensitively.
    function attr(el, name) {
      if (!el) return null;
      var v = el.getAttribute(name);
      if (v !== null) return v;
      var lower = name.toLowerCase();
      for (var i = 0; i < el.attributes.length; i++) {
        if (el.attributes[i].name.toLowerCase() === lower) return el.attributes[i].value;
      }
      return null;
    }
    function num(el, name, def) {
      var v = attr(el, name);
      return v === null ? def : parseFloat(v);
    }
    function img(el, name) {
      var v = attr(el, name);
      return v ? resolveUrl(imageBase, v) : null;
    }

    var bg     = root.querySelector('bg');
    var play   = root.querySelector('play');
    var stopEl = root.querySelector('stop');
    var text   = root.querySelector('text');
    var vol    = root.querySelector('volume');
    var stat   = root.querySelector('status');

    return {
      type: 'xml',
      sourceUrl: xmlUrl,
      baseUrl: baseUrl,
      imageBase: imageBase,
      bg: bg && {
        image: img(bg, 'image'),
        x: num(bg, 'x', 0),
        y: num(bg, 'y', 0)
      },
      //   bgimage    → rest state (often absent — button is invisible
      //                until hovered, and the player's main <bg> shows
      //                through where the cutout would be)
      //   image      → hover state
      //   clickimage → pressed state
      play: play && {
        bgImage:    img(play, 'bgimage'),
        image:      img(play, 'image'),
        clickImage: img(play, 'clickimage'),
        x: num(play, 'x', 0),
        y: num(play, 'y', 0)
      },
      stop: stopEl && {
        bgImage:    img(stopEl, 'bgimage'),
        image:      img(stopEl, 'image'),
        clickImage: img(stopEl, 'clickimage'),
        x: num(stopEl, 'x', 0),
        y: num(stopEl, 'y', 0)
      },
      text: text && {
        x: num(text, 'x', 0),
        y: num(text, 'y', 0),
        width: num(text, 'width', 100),
        height: num(text, 'height', 20),
        color: attr(text, 'color') || '#000000',
        font: attr(text, 'font') || 'sans-serif',
        size: num(text, 'size', 12)
      },
      volume: vol && {
        mode: attr(vol, 'mode') || 'holder',
        x: num(vol, 'x', 0),
        y: num(vol, 'y', 0),
        width: num(vol, 'width', 100),
        height: num(vol, 'height', 10),
        holderImage: img(vol, 'holderImage')
      },
      status: stat && {
        imagePlay: img(stat, 'imagePlay'),
        imageStop: img(stat, 'imageStop'),
        x: num(stat, 'x', 0),
        y: num(stat, 'y', 0)
      }
    };
  }

  function loadSkinXml(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('Skin fetch failed: ' + r.status + ' ' + url);
      return r.text();
    }).then(function (xml) {
      return parseSkinXml(xml, new URL(url, location.href).href);
    });
  }

  // Accepts either a URL string or an already-prepared object.
  function resolveSkin(skin) {
    if (!skin) return Promise.reject(new Error('No skin specified'));
    if (typeof skin === 'string') return loadSkinXml(skin);
    if (typeof skin === 'object') {
      // Pre-built skin object — either an XML descriptor we produced, or a
      // user-supplied {html, css} bundle.
      if (skin.html || skin.css) {
        return Promise.resolve(assign({ type: 'html' }, skin));
      }
      if (skin.type === 'xml') return Promise.resolve(skin);
    }
    return Promise.reject(new Error('Unrecognized skin: ' + skin));
  }

  // ---------------------------------------------------------------------
  // Skin renderer — builds DOM from a parsed skin descriptor
  // ---------------------------------------------------------------------

  var marqueeStyleInjected = false;
  function ensureMarqueeStyles() {
    if (marqueeStyleInjected) return;
    var style = document.createElement('style');
    style.setAttribute('data-KPR-clean', 'marquee');
    // translate3d() forces a GPU layer so the scroll stays smooth even when
    // the rest of the page is doing layout work. The keyframe distance is
    // driven by a CSS variable that setText() updates per-string.
    style.textContent =
      '@keyframes KPRCleanMarquee {' +
      '  from { transform: translate3d(0, 0, 0); }' +
      '  to   { transform: translate3d(calc(-1 * var(--KPR-scroll-dist, 0px)), 0, 0); }' +
      '}';
    document.head.appendChild(style);
    marqueeStyleInjected = true;
  }

  // Promise that resolves once webfonts have loaded, so the marquee never
  // measures content with the wrong font and then jumps when the real font
  // arrives a tick later. Falls back to immediate-resolve when unsupported.
  var fontsReadyPromise = null;
  function fontsReady() {
    if (fontsReadyPromise) return fontsReadyPromise;
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      fontsReadyPromise = document.fonts.ready.catch(function () {});
    } else {
      fontsReadyPromise = Promise.resolve();
    }
    return fontsReadyPromise;
  }

  // Shared marquee setup. Given a host element and the inline track that
  // already lives inside it, install `str` and (if it overflows) start a
  // smooth scrolling animation. Centralised so the XML and HTML skin
  // renderers behave identically.
  var MARQUEE_GAP = 40;        // px of empty space between the two copies
  var MARQUEE_PX_PER_SEC = 20; // scroll speed
  var MARQUEE_FADE_MS = 160;   // opacity crossfade on text swap

  // Wipe the track and reinstall `str`, measuring on the next frame so
  // the animation starts from an accurate width. Called by applyMarquee
  // once the fade-out (if any) has finished.
  function installMarqueeContent(host, track, str) {
    track.style.animation = 'none';
    track.style.transform = 'translate3d(0, 0, 0)';
    track.innerHTML = '';
    if (!str) return;

    var first = document.createElement('span');
    first.textContent = str;
    first.style.display = 'inline-block';
    first.style.paddingRight = MARQUEE_GAP + 'px';
    track.appendChild(first);

    // Wait for fonts so width measurements are stable, then schedule the
    // actual measurement on the next animation frame. This avoids the
    // "first frame is wrong, then jumps" effect entirely.
    fontsReady().then(function () {
      requestAnimationFrame(function () {
        // Bail out if setText was called again in the meantime — track will
        // have been wiped and `first` will no longer be its child.
        if (first.parentNode !== track) return;

        // Sub-pixel widths keep the two copies lined up exactly so the
        // CSS animation's end/start seam has no per-loop jitter.
        var contentWidth = first.getBoundingClientRect().width;
        var hostWidth    = host.getBoundingClientRect().width;
        // contentWidth includes MARQUEE_GAP; the visible glyphs are
        // contentWidth - MARQUEE_GAP wide. Only scroll if those overflow.
        if (contentWidth - MARQUEE_GAP <= hostWidth) return;

        var second = document.createElement('span');
        second.textContent = str;
        second.style.display = 'inline-block';
        second.style.paddingRight = MARQUEE_GAP + 'px';
        track.appendChild(second);

        ensureMarqueeStyles();
        var distance = contentWidth; // one full copy + its gap
        var duration = Math.max(6, distance / MARQUEE_PX_PER_SEC);
        track.style.setProperty('--KPR-scroll-dist', distance + 'px');
        // Start on the *next* frame so the new layout commits cleanly
        // before the animation kicks in.
        requestAnimationFrame(function () {
          if (first.parentNode !== track) return;
          track.style.animation =
            'KPRCleanMarquee ' + duration.toFixed(2) + 's linear infinite';
        });
      });
    });
  }

  // Install `str` into the marquee track, crossfading against whatever was
  // there before so that a metadata change doesn't visually snap the text
  // back to the left edge mid-scroll. Normalises whitespace before the
  // equality check so a stray trailing space in a polled title won't force
  // a pointless restart.
  function applyMarquee(host, track, str) {
    var normalized = (str == null ? '' : String(str))
      .replace(/\s+/g, ' ')
      .trim();
    if (track._KPRCurrent === normalized) return;
    var wasEmpty = !track._KPRCurrent;
    track._KPRCurrent = normalized;

    if (track._KPRFadeTimer) {
      clearTimeout(track._KPRFadeTimer);
      track._KPRFadeTimer = null;
    }

    // Lazily wire up the fade transition on the host.
    if (!host._KPRFadeWired) {
      host.style.transition = 'opacity ' + MARQUEE_FADE_MS + 'ms linear';
      host.style.opacity = '1';
      host._KPRFadeWired = true;
    }

    if (wasEmpty) {
      // First render — skip the fade-out so the marquee shows immediately.
      installMarqueeContent(host, track, normalized);
      host.style.opacity = '1';
      return;
    }

    host.style.opacity = '0';
    track._KPRFadeTimer = setTimeout(function () {
      track._KPRFadeTimer = null;
      installMarqueeContent(host, track, normalized);
      host.style.opacity = '1';
    }, MARQUEE_FADE_MS);
  }

  function renderXmlSkin(skin, width, height) {
    var root = document.createElement('div');
    root.className = 'KPR-clean KPR-clean-xml';
    root.style.cssText = [
      'position:relative',
      'display:inline-block',
      'width:' + width + 'px',
      'height:' + height + 'px',
      'overflow:hidden',
      'user-select:none',
      '-webkit-user-select:none',
      '-ms-user-select:none',
      'font-family:sans-serif',
      'line-height:normal',
      'box-sizing:content-box'
    ].join(';');

    function positioned(el, x, y) {
      el.style.position = 'absolute';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      return el;
    }

    // --- background -----------------------------------------------------
    if (skin.bg && skin.bg.image) {
      var bgImg = document.createElement('img');
      bgImg.src = skin.bg.image;
      bgImg.draggable = false;
      bgImg.alt = '';
      bgImg.style.pointerEvents = 'none';
      positioned(bgImg, skin.bg.x, skin.bg.y);
      root.appendChild(bgImg);
    }

    // --- three-state pressable-image button factory ---------------------
    //
    // images that get cross-faded via opacity:
    //
    //   bgImage    → rest        (often missing — invisible at rest)
    //   image      → hover       (also: rest fallback, click release)
    //   clickImage → pressed
    //
    // Implementation: stack up to three <img> layers in a wrapper <div>.
    // The first defined layer is in normal flow and acts as the sizer for
    // the wrapper; the other layers are absolutely positioned overlays.
    // We toggle opacity (not display) so layout dimensions are preserved
    // even when the rest state has no image to show.
    //
    // Pointer Events + setPointerCapture mean mouse / touch / pen all run
    // the same code path, and pointerup fires on the wrapper even if the
    // user drags off the button mid-press.
    function buildButton(cfg, label) {
      if (!cfg) return null;
      var rest  = cfg.bgImage    || null;
      var hover = cfg.image      || null;
      var click = cfg.clickImage || null;
      if (!rest && !hover && !click) return null;

      var wrap = document.createElement('div');
      wrap.setAttribute('role', 'button');
      wrap.setAttribute('tabindex', '0');
      wrap.setAttribute('aria-label', label);
      wrap.style.cssText = [
        'position:absolute',
        'left:' + cfg.x + 'px',
        'top:'  + cfg.y + 'px',
        'cursor:pointer',
        'touch-action:manipulation',
        'display:inline-block',
        'line-height:0' // strip baseline gap under inline imgs
      ].join(';');

      // Pick the first defined layer as the in-flow sizer.
      var sizerKey = rest ? 'rest' : (hover ? 'hover' : 'click');
      var layers = {};
      function makeLayer(state, src, isSizer) {
        if (!src) return null;
        var im = document.createElement('img');
        im.src = src;
        im.draggable = false;
        im.alt = '';
        im.style.display = 'block';
        im.style.pointerEvents = 'none';
        im.style.transition = 'opacity 60ms linear';
        im.style.opacity = '0';
        if (!isSizer) {
          im.style.position = 'absolute';
          im.style.top  = '0';
          im.style.left = '0';
        }
        layers[state] = im;
        return im;
      }

      // Sizer first (in normal flow), then overlays.
      wrap.appendChild(makeLayer(
        sizerKey,
        sizerKey === 'rest' ? rest : sizerKey === 'hover' ? hover : click,
        true
      ));
      if (sizerKey !== 'rest'  && rest)  wrap.appendChild(makeLayer('rest',  rest,  false));
      if (sizerKey !== 'hover' && hover) wrap.appendChild(makeLayer('hover', hover, false));
      if (sizerKey !== 'click' && click) wrap.appendChild(makeLayer('click', click, false));

      // State management. The reason this used to break: mobile browsers
      // fire synthetic mouse events after touch events, and the old code
      // wasn't using Pointer Events with setPointerCapture, so a touch tap
      // could leave the button stuck in the "pressed" state.
      var hovering = false, pressed = false;
      function show(state) {
        if (layers.rest)  layers.rest.style.opacity  = (state === 'rest')  ? '1' : '0';
        if (layers.hover) layers.hover.style.opacity = (state === 'hover') ? '1' : '0';
        if (layers.click) layers.click.style.opacity = (state === 'click') ? '1' : '0';
      }
      function refresh() {
        if (pressed && layers.click)       show('click');
        else if (hovering && layers.hover) show('hover');
        else if (layers.rest)              show('rest');
        else                               show('NONE'); // all opacity 0
      }
      refresh();

      wrap.addEventListener('pointerenter', function () {
        hovering = true; refresh();
      });
      wrap.addEventListener('pointerleave', function () {
        hovering = false; pressed = false; refresh();
      });
      wrap.addEventListener('pointerdown', function (e) {
        pressed = true; refresh();
        if (e.pointerId != null && wrap.setPointerCapture) {
          try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
        }
      });
      wrap.addEventListener('pointerup',     function () { pressed = false; refresh(); });
      wrap.addEventListener('pointercancel', function () { pressed = false; refresh(); });
      // Belt-and-braces: if focus leaves the window mid-press, reset.
      wrap.addEventListener('blur',          function () { pressed = false; refresh(); });

      root.appendChild(wrap);
      return wrap;
    }
    var playBtn = buildButton(skin.play, 'Play');
    var stopBtn = buildButton(skin.stop, 'Stop');

    // --- status indicator ----------------------------------------------
    var statusImg = null;
    if (skin.status && (skin.status.imagePlay || skin.status.imageStop)) {
      statusImg = document.createElement('img');
      statusImg.src = skin.status.imageStop || skin.status.imagePlay;
      statusImg.draggable = false;
      statusImg.alt = '';
      statusImg.style.pointerEvents = 'none';
      positioned(statusImg, skin.status.x, skin.status.y);
      root.appendChild(statusImg);
    }

    // --- marquee text ---------------------------------------------------
    var textHost = null, textTrack = null;
    if (skin.text) {
      textHost = document.createElement('div');
      textHost.className = 'KPR-clean-text';
      textHost.style.cssText = [
        'position:absolute',
        'left:' + skin.text.x + 'px',
        'top:'  + skin.text.y + 'px',
        'width:'  + skin.text.width  + 'px',
        'height:' + skin.text.height + 'px',
        'color:' + skin.text.color,
        'font-family:"' + skin.text.font + '",sans-serif',
        'font-size:' + skin.text.size + 'px',
        'line-height:' + skin.text.height + 'px',
        'overflow:hidden',
        'white-space:nowrap',
        'pointer-events:none'
      ].join(';');
      textTrack = document.createElement('div');
      textTrack.style.cssText = 'display:inline-block;white-space:nowrap;will-change:transform;backface-visibility:hidden;';
      textHost.appendChild(textTrack);
      root.appendChild(textHost);
    }

    // --- volume bar -----------------------------------------------------
    var volTrack = null, volHolder = null;
    if (skin.volume) {
      volTrack = document.createElement('div');
      volTrack.className = 'KPR-clean-vol';
      volTrack.style.cssText = [
        'position:absolute',
        'left:' + skin.volume.x + 'px',
        'top:'  + skin.volume.y + 'px',
        'width:'  + skin.volume.width  + 'px',
        'height:' + skin.volume.height + 'px',
        'cursor:pointer'
      ].join(';');
      if (skin.volume.holderImage) {
        volHolder = document.createElement('img');
        volHolder.src = skin.volume.holderImage;
        volHolder.draggable = false;
        volHolder.alt = '';
        volHolder.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
        volTrack.appendChild(volHolder);
      }
      root.appendChild(volTrack);
    }

    // --- setText: scrolling marquee ------------------------------------
    var currentText = '';
    function setText(str) {
      str = str == null ? '' : String(str);
      if (!textHost) return;
      if (str === currentText) return;
      currentText = str;
      applyMarquee(textHost, textTrack, str);
    }

    // --- setVolumeVisual ------------------------------------------------
    function positionHolder() {
      if (!volHolder || !skin.volume) return;
      var trackW = skin.volume.width;
      var holderW = volHolder.naturalWidth || volHolder.offsetWidth || 0;
      var maxLeft = Math.max(0, trackW - holderW);
      var pct = typeof volHolder._pct === 'number' ? volHolder._pct : 100;
      volHolder.style.left = Math.round(maxLeft * (pct / 100)) + 'px';
    }
    function setVolumeVisual(pct) {
      if (!volHolder) return;
      volHolder._pct = pct;
      if (!volHolder.complete) {
        volHolder.addEventListener('load', positionHolder, { once: true });
      }
      positionHolder();
    }

    // --- setStatus ------------------------------------------------------
    function setStatus(state) {
      if (!statusImg || !skin.status) return;
      var src;
      if (state === 'playing' || state === true) {
        src = skin.status.imagePlay;
      } else {
        src = skin.status.imageStop;
      }
      if (src) statusImg.src = src;
    }

    return {
      root: root,
      playBtn: playBtn,
      stopBtn: stopBtn,
      volTrack: volTrack,
      setText: setText,
      setVolumeVisual: setVolumeVisual,
      setStatus: setStatus
    };
  }

  // ---------------------------------------------------------------------
  // HTML/CSS skin support
  // ---------------------------------------------------------------------
  // A user can pass `skin: { html: '...', css: '...', hooks?: {...} }`
  // where `hooks` is an object of CSS selectors (or element IDs):
  //   { play: '.my-play', stop: '.my-stop', volume: '.my-vol',
  //     text: '.my-text', status: '.my-status' }
  // The renderer will mount the HTML into the container, inject the CSS
  // (scoped to the container via a generated id), and wire up the hooks.

  var htmlSkinCounter = 0;
  function renderHtmlSkin(skin, width, height) {
    var root = document.createElement('div');
    root.className = 'KPR-clean KPR-clean-html';
    var scopeId = 'KPR-clean-html-' + (++htmlSkinCounter);
    root.id = scopeId;
    root.style.cssText = [
      'position:relative',
      'display:inline-block',
      'width:' + width + 'px',
      'height:' + height + 'px',
      'overflow:hidden',
      'user-select:none',
      '-webkit-user-select:none'
    ].join(';');

    if (skin.css) {
      var style = document.createElement('style');
      // Very lightweight scoping: prepend the container id to each selector.
      // This is intentional-best-effort; if you need complex CSS you can
      // opt out by including '/* no-scope */' in your CSS string.
      var css = skin.css;
      if (css.indexOf('/* no-scope */') === -1) {
        css = css.replace(/(^|\})\s*([^{}]+)\{/g, function (_m, brace, sel) {
          var scoped = sel.split(',').map(function (s) {
            s = s.trim();
            if (!s) return s;
            if (s.charAt(0) === '@') return s;
            return '#' + scopeId + ' ' + s;
          }).join(', ');
          return (brace || '') + scoped + '{';
        });
      }
      style.textContent = css;
      document.head.appendChild(style);
    }

    root.innerHTML = skin.html || '';

    var hooks = skin.hooks || {};
    function pick(sel) { return sel ? root.querySelector(sel) : null; }

    var playBtn  = pick(hooks.play)   || root.querySelector('[data-KPR="play"]');
    var stopBtn  = pick(hooks.stop)   || root.querySelector('[data-KPR="stop"]');
    var volTrack = pick(hooks.volume) || root.querySelector('[data-KPR="volume"]');
    var volHolder = volTrack ? (volTrack.querySelector('[data-KPR="volume-holder"]') || volTrack.firstElementChild) : null;
    var textEl  = pick(hooks.text)    || root.querySelector('[data-KPR="text"]');
    var statusEl = pick(hooks.status) || root.querySelector('[data-KPR="status"]');

    // Set up a marquee wrapper inside textEl if present.
    var textTrack = null;
    var currentText = '';
    if (textEl) {
      textEl.style.overflow = 'hidden';
      textEl.style.whiteSpace = 'nowrap';
      textTrack = document.createElement('div');
      textTrack.style.cssText = 'display:inline-block;white-space:nowrap;will-change:transform;';
      textEl.innerHTML = '';
      textEl.appendChild(textTrack);
    }

    function setText(str) {
      if (!textEl) return;
      str = str == null ? '' : String(str);
      if (str === currentText) return;
      currentText = str;
      applyMarquee(textEl, textTrack, str);
    }

    function setVolumeVisual(pct) {
      if (!volTrack) return;
      volTrack.setAttribute('data-KPR-pct', String(Math.round(pct)));
      if (volHolder && volHolder !== volTrack) {
        var trackW = volTrack.clientWidth;
        var holderW = volHolder.offsetWidth || 0;
        var maxLeft = Math.max(0, trackW - holderW);
        volHolder.style.position = 'absolute';
        volHolder.style.left = Math.round(maxLeft * (pct / 100)) + 'px';
      }
    }

    function setStatus(state) {
      if (!statusEl) return;
      var on = state === 'playing' || state === true;
      statusEl.setAttribute('data-KPR-state', on ? 'playing' : 'stopped');
      statusEl.classList.toggle('KPR-playing', !!on);
      statusEl.classList.toggle('KPR-stopped', !on);
    }

    return {
      root: root,
      playBtn: playBtn,
      stopBtn: stopBtn,
      volTrack: volTrack,
      setText: setText,
      setVolumeVisual: setVolumeVisual,
      setStatus: setStatus
    };
  }

  // ---------------------------------------------------------------------
  // Metadata polling (Icecast / Shoutcast)
  // ---------------------------------------------------------------------

  function buildMetadataUrl(streamUrl, mode, station) {
    var u;
    try { u = new URL(streamUrl, location.href); }
    catch (e) { return null; }
    var origin = u.origin;
    switch (mode) {
      case 'icecast':      return origin + '/status-json.xsl';
      case 'icecast-csv':  return origin + '/7.html';
      case 'shoutcast-v1': return origin + '/7.html';
      case 'shoutcast-v2': return origin + '/stats?sid=1&json=1';
      case 'azuracast':
        // AzuraCast public nowplaying API. station is the shortcode
        // (e.g. 'kpradio' for https://radio.kingposs.com/api/nowplaying/kpradio).
        // If no shortcode is given, /api/nowplaying returns an array of all
        // stations and we'll pick the first one in the extractor.
        return station
          ? origin + '/api/nowplaying/' + encodeURIComponent(station)
          : origin + '/api/nowplaying';
      default:             return origin + '/status-json.xsl';
    }
  }

  function applyProxy(proxyTemplate, target) {
    if (!proxyTemplate) return target;
    if (proxyTemplate.indexOf('{url}') !== -1) {
      return proxyTemplate.replace('{url}', encodeURIComponent(target));
    }
    var sep = proxyTemplate.indexOf('?') === -1 ? '?' : '&';
    return proxyTemplate + sep + 'url=' + encodeURIComponent(target);
  }

  function extractIcecastTitle(json, mount) {
    try {
      var src = json && json.icestats && json.icestats.source;
      if (!src) return null;
      var list = Array.isArray(src) ? src : [src];
      if (mount) {
        for (var i = 0; i < list.length; i++) {
          var s = list[i];
          if (s.listenurl && s.listenurl.indexOf(mount) !== -1) {
            return cleanTitleText(
              s.title || s.yp_currently_playing || s.server_name
            ) || null;
          }
        }
      }
      // Fall back to the first source with a title.
      for (var j = 0; j < list.length; j++) {
        var t = cleanTitleText(list[j].title || list[j].yp_currently_playing);
        if (t) return t;
      }
      return null;
    } catch (e) { return null; }
  }

  function extract7HtmlTitle(html) {
    // Shoutcast/Icecast 7.html: body is "listeners,status,peak,max,unique,
    //                                    bitrate,title" — title may contain commas.
    var m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    var body = (m ? m[1] : html).replace(/<[^>]*>/g, '').trim();
    var parts = body.split(',');
    if (parts.length < 7) return null;
    return cleanTitleText(parts.slice(6).join(',')) || null;
  }

  function extractShoutcastV2Title(json) {
    if (!json) return null;
    if (json.songtitle) return cleanTitleText(json.songtitle) || null;
    if (json.streams && json.streams[0]) {
      return cleanTitleText(json.streams[0].songtitle) || null;
    }
    return null;
  }

  // AzuraCast /api/nowplaying/<station> returns either a single station
  // object or (for /api/nowplaying with no shortcode) an array of them.
  // Relevant fields:
  //   now_playing.song.title
  //   now_playing.song.artist
  //   now_playing.song.text   ← already formatted as "artist - title"
  //   live.is_live
  //   live.streamer_name
  function extractAzuraCastTitle(json, station) {
    if (!json) return null;
    var entry = json;
    if (Array.isArray(json)) {
      if (station) {
        for (var i = 0; i < json.length; i++) {
          var st = json[i].station;
          if (st && (st.shortcode === station || st.name === station)) {
            entry = json[i]; break;
          }
        }
      }
      if (Array.isArray(entry)) entry = json[0];
    }
    if (!entry) return null;
    var np = entry.now_playing;
    var song = np && np.song;
    if (!song) return null;

    var title = (song.title || '').trim();
    var artist = (song.artist || '').trim();
    var text = (song.text || '').trim();

    // Build the display string. Many user-uploaded files already have
    // "Artist - Title" baked into the title field, in which case prepending
    // the artist again would produce "Artist - Artist - Title". Detect that
    // and just use the title as-is. Same goes for any other separator
    // already present in the title.
    var display;
    if (title && artist) {
      var lcTitle = title.toLowerCase();
      var lcArtist = artist.toLowerCase();
      var alreadyHasSeparator = / [-–—] /.test(title);
      var alreadyHasArtist = lcTitle.indexOf(lcArtist) !== -1;
      if (alreadyHasArtist || alreadyHasSeparator) {
        display = title;
      } else {
        display = artist + ' - ' + title;
      }
    } else {
      // Only one (or neither) of title/artist is present. Fall back to the
      // pre-formatted `text` field but strip any stray leading/trailing
      // dashes that show up when it's a bare "- Song" template.
      display = title || artist || cleanTitleText(text);
    }

    display = cleanTitleText(display);

    // If this is a live DJ broadcast, prefix the streamer name.
    var live = entry.live;
    if (live && live.is_live && live.streamer_name) {
      display = '[LIVE] ' + live.streamer_name +
                (display ? ' — ' + display : '');
    }
    return display || null;
  }

  // ---------------------------------------------------------------------
  // AzuraCast SSE (Centrifugo) — real-time now-playing updates
  // ---------------------------------------------------------------------

  function AzuraCastSSE(streamUrl, station, callbacks) {
    this.station = station;
    this.callbacks = callbacks; // { onTitle, onNowPlaying }
    this.lastTitle = null;
    this.source = null;

    var u;
    try { u = new URL(streamUrl, location.href); } catch (e) { u = null; }
    this.origin = u ? u.origin : null;
  }

  AzuraCastSSE.prototype.start = function () {
    if (!this.origin || typeof EventSource === 'undefined') {
      this._fail(); return;
    }
    var self = this;
    var sseBaseUri = this.origin + '/api/live/nowplaying/sse';
    var subs = {};
    subs['station:' + this.station] = { 'recover': true };
    var sseUriParams = new URLSearchParams({
      'cf_connect': JSON.stringify({ 'subs': subs })
    });
    this.source = new EventSource(sseBaseUri + '?' + sseUriParams.toString());

    this.source.onmessage = function (e) {
      var jsonData = JSON.parse(e.data);
      if ('connect' in jsonData) {
        var connectData = jsonData.connect;
        if ('data' in connectData) {
          connectData.data.forEach(function (row) { self._handleData(row); });
        } else {
          for (var subName in connectData.subs) {
            var sub = connectData.subs[subName];
            if ('publications' in sub && sub.publications.length > 0) {
              sub.publications.forEach(function (row) { self._handleData(row); });
            }
          }
        }
      } else if ('pub' in jsonData) {
        self._handleData(jsonData.pub);
      }
    };

    this.source.onerror = function () {
      self.stop();
      self._fail();
    };

    // initial fetch so the display isn't blank while waiting for first SSE push
    var apiUrl = this.origin + '/api/nowplaying/' + encodeURIComponent(this.station);
    fetch(apiUrl, { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (np) { if (np) self._processNowPlaying(np); })
      .catch(function () { /* SSE will handle it */ });
  };

  AzuraCastSSE.prototype.stop = function () {
    if (this.source) { this.source.close(); this.source = null; }
  };

  AzuraCastSSE.prototype._handleData = function (ssePayload) {
    var np = ssePayload && ssePayload.data && ssePayload.data.np;
    if (np) this._processNowPlaying(np);
  };

  AzuraCastSSE.prototype._processNowPlaying = function (np) {
    var title = extractAzuraCastTitle(np, this.station);
    if (title && title !== this.lastTitle) {
      this.lastTitle = title;
      try { this.callbacks.onTitle(title); } catch (e) { /* user code */ }
    }
    try { this.callbacks.onNowPlaying(np); } catch (e) { /* user code */ }
  };

  AzuraCastSSE.prototype._fail = function () {
    console.warn('[KPR] SSE connection failed, falling back to polling');
    if (this.callbacks.onFallback) {
      try { this.callbacks.onFallback(); } catch (e) { /* */ }
    }
  };

  // ---------------------------------------------------------------------
  // Metadata polling (Icecast / Shoutcast / AzuraCast fallback)
  // ---------------------------------------------------------------------

  function MetadataPoller(streamUrl, opts, onTitle, onNowPlaying) {
    this.streamUrl = streamUrl;
    this.mode = opts.mode || 'icecast';
    this.proxy = opts.proxy || null;
    this.interval = Math.max(3, opts.interval || 10) * 1000;
    this.mount = opts.mount || null;
    this.station = opts.station || null;
    this.explicitUrl = opts.url || null;
    this.customFetcher = typeof opts.fetcher === 'function' ? opts.fetcher : null;
    this.onTitle = onTitle;
    this.onNowPlaying = onNowPlaying || function () {};
    this.timer = null;
    this.lastTitle = null;
    this.running = false;
    this.corsWarned = false;
  }
  MetadataPoller.prototype.start = function () {
    if (this.running || this.mode === 'none') return;
    this.running = true;
    this._tick();
  };
  MetadataPoller.prototype.stop = function () {
    this.running = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  };
  MetadataPoller.prototype._schedule = function () {
    if (!this.running) return;
    var self = this;
    this.timer = setTimeout(function () { self._tick(); }, this.interval);
  };
  MetadataPoller.prototype._tick = function () {
    var self = this;
    this.fetchOnce()
      .then(function (result) {
        if (result.title && result.title !== self.lastTitle) {
          self.lastTitle = result.title;
          try { self.onTitle(result.title); } catch (e) { /* user code */ }
        }
        if (result.np) {
          try { self.onNowPlaying(result.np); } catch (e) { /* user code */ }
        }
      })
      .catch(function (err) {
        if (!self.corsWarned) {
          self.corsWarned = true;
          console.warn(
            '[KPR] metadata fetch failed (this is usually CORS). ' +
            'Either enable Access-Control-Allow-Origin on your stream server, ' +
            'or set metadataProxy to a small server-side proxy. Error:',
            err && err.message ? err.message : err
          );
        }
      })
      .then(function () { self._schedule(); });
  };
  MetadataPoller.prototype.fetchOnce = function () {
    if (this.customFetcher) {
      try {
        return Promise.resolve(this.customFetcher()).then(function (t) {
          return { title: t, np: null };
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }
    var target = this.explicitUrl ||
                 buildMetadataUrl(this.streamUrl, this.mode, this.station);
    if (!target) return Promise.reject(new Error('bad stream url'));
    var url = applyProxy(this.proxy, target);
    var mode = this.mode;
    var mount = this.mount;
    var station = this.station;
    var isJson = mode === 'icecast' || mode === 'shoutcast-v2' || mode === 'azuracast';
    return fetch(url, { cache: 'no-store', credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('metadata http ' + r.status + ' from ' + url);
      return isJson
        ? r.json().then(function (j) {
            if (mode === 'icecast')   return { title: extractIcecastTitle(j, mount), np: null };
            if (mode === 'azuracast') return { title: extractAzuraCastTitle(j, station), np: j };
            return { title: extractShoutcastV2Title(j), np: null };
          })
        : r.text().then(function (t) { return { title: extract7HtmlTitle(t), np: null }; });
    });
  };

  // ---------------------------------------------------------------------
  // Player core
  // ---------------------------------------------------------------------

  var _callbackRef = null;
  function emit(inst, event, data) {
    if (!_callbackRef) return;
    try { _callbackRef(inst.id, event, data); }
    catch (e) { /* swallow user errors */ }
  }

  function KPRadioPlayer(opts, ui) {
    this.id = opts.id;
    this.opts = opts;
    this.ui = ui;
    this.url = opts.url;
    this.fallbackUrl = opts.fallbackUrl || null;
    this.customTitle = opts.title || '';
    this.currentMetadata = '';
    this.desired = 'stop';
    this.retryCount = 0;
    this.retryMax = 5;

    this.audio = new Audio();
    this.audio.preload = 'none';
    this.audio.crossOrigin = opts.crossOrigin || null;
    this._volumePct = opts.volume != null ? opts.volume : 100;
    this.audio.volume = this._volumePct / 100;

    // starts (or restarts on reconnect) we mute the audio element, let the
    // browser actually decode `bufferSeconds` worth of audio, then restore
    // the listener's volume. Gives the player a real warm-up cushion before
    // any sound is heard, so a momentary network hiccup at startup doesn't
    // become an audible glitch.
    this.bufferSeconds = opts.buffering != null
      ? Math.max(0, Number(opts.buffering))
      : 1;
    this._bufferActive = false;
    this._bufferSafetyTimer = null;

    this._bindAudio();
    this._bindUi();

    this.ui.setVolumeVisual(this._volumePct);
    this.ui.setStatus('stopped');
    this._updateDisplay();

    this.poller = null;
    this.sse = null;
    this._onNowPlayingFn = typeof opts.onNowPlaying === 'function'
      ? opts.onNowPlaying : null;
    this._nowPlayingUI = opts.nowPlayingUI || null;

    if (opts.metadataMode !== 'none' && opts.metadataMode !== false) {
      var self = this;
      var mode = opts.metadataMode;
      if (!mode && (opts.metadataStation || opts.metadataUrl)) mode = 'azuracast';
      if (!mode) mode = 'icecast';

      var station = opts.metadataStation || null;

      function onTitle(title) {
        self.currentMetadata = title;
        self._updateDisplay();
        emit(self, 'metadata', title);
      }

      function onNowPlaying(np) {
        if (self._onNowPlayingFn) self._onNowPlayingFn(np);
        if (self._nowPlayingUI) self._applyNowPlayingUI(np);
      }

      // Use SSE for azuracast when we have a station shortcode and no
      // custom fetcher — it's real-time and avoids polling entirely.
      if (mode === 'azuracast' && station && !opts.metadataFetcher) {
        this.sse = new AzuraCastSSE(this.url, station, {
          onTitle: onTitle,
          onNowPlaying: onNowPlaying,
          onFallback: function () {
            // SSE failed, fall back to polling
            self.sse = null;
            self.poller = self._createPoller(opts, mode, onTitle, onNowPlaying);
            self.poller.start();
          }
        });
        console.info('[KPR] metadata source: SSE (station:' + station + ')');
        this.sse.start();
      } else {
        this.poller = this._createPoller(opts, mode, onTitle, onNowPlaying);
        try {
          var diagUrl = opts.metadataFetcher
            ? '(custom metadataFetcher function)'
            : (opts.metadataUrl ||
               buildMetadataUrl(this.url, mode, station));
          console.info(
            '[KPR] metadata source:', diagUrl,
            '(mode=' + mode + ', every ' + (opts.metadataInterval || 10) + 's)'
          );
        } catch (e) { /* noop */ }
        this.poller.start();
      }
    }

    if (opts.autoplay) this.play();
  }

  KPRadioPlayer.prototype._createPoller = function (opts, mode, onTitle, onNowPlaying) {
    return new MetadataPoller(this.url, {
      mode: mode,
      proxy: opts.metadataProxy || null,
      interval: opts.metadataInterval || 10,
      mount: opts.metadataMount || null,
      station: opts.metadataStation || null,
      url: opts.metadataUrl || null,
      fetcher: opts.metadataFetcher || null
    }, onTitle, onNowPlaying);
  };

  KPRadioPlayer.prototype._bindAudio = function () {
    var self = this;
    this.audio.addEventListener('playing', function () {
      self.retryCount = 0;
      self.ui.setStatus('playing');
      emit(self, 'play', null);
    });
    this.audio.addEventListener('pause', function () {
      if (self.desired === 'stop') self.ui.setStatus('stopped');
    });
    this.audio.addEventListener('waiting', function () {
      // buffering — leave visual alone or set a buffering state if the skin
    });
    this.audio.addEventListener('timeupdate', function () {
      self._maybeReleaseBufferGate();
    });
    this.audio.addEventListener('ended', function () {
      if (self.desired === 'play') self._reconnect();
      else self.ui.setStatus('stopped');
    });
    this.audio.addEventListener('stalled', function () {
      if (self.desired === 'play') self._reconnect();
    });
    this.audio.addEventListener('error', function () {
      self.ui.setStatus('stopped');
      emit(self, 'error', self.audio.error && self.audio.error.code);
      if (self.desired === 'play') self._reconnect();
    });
  };

  // Buffer gate helpers ---------------------------------------------------
  KPRadioPlayer.prototype._beginBufferGate = function () {
    if (this.bufferSeconds <= 0) return;
    this._bufferActive = true;
    this.audio.volume = 0;
    // Safety net: if currentTime never advances (server hung mid-handshake,
    // browser quirk, etc.) we don't want the listener stuck in silence
    // forever. After (bufferSeconds * 4 + 5)s of wall-clock time, give up
    // on the gate and unmute. The reconnect logic on stalled/error will
    // still handle a truly dead stream.
    var self = this;
    if (this._bufferSafetyTimer) clearTimeout(this._bufferSafetyTimer);
    this._bufferSafetyTimer = setTimeout(function () {
      self._releaseBufferGate();
    }, (this.bufferSeconds * 4 + 5) * 1000);
  };
  KPRadioPlayer.prototype._maybeReleaseBufferGate = function () {
    if (!this._bufferActive) return;
    if (this.audio.currentTime >= this.bufferSeconds) {
      this._releaseBufferGate();
    }
  };
  KPRadioPlayer.prototype._releaseBufferGate = function () {
    if (!this._bufferActive) return;
    this._bufferActive = false;
    if (this._bufferSafetyTimer) {
      clearTimeout(this._bufferSafetyTimer);
      this._bufferSafetyTimer = null;
    }
    this.audio.volume = this._volumePct / 100;
  };
  KPRadioPlayer.prototype._cancelBufferGate = function () {
    if (this._bufferSafetyTimer) {
      clearTimeout(this._bufferSafetyTimer);
      this._bufferSafetyTimer = null;
    }
    this._bufferActive = false;
  };

  KPRadioPlayer.prototype._bindUi = function () {
    var self = this;
    if (this.ui.playBtn) {
      this.ui.playBtn.addEventListener('click', function () { self.play(); });
      this.ui.playBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.play(); }
      });
    }
    if (this.ui.stopBtn) {
      this.ui.stopBtn.addEventListener('click', function () { self.stop(); });
      this.ui.stopBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.stop(); }
      });
    }
    if (this.ui.volTrack) {
      var dragging = false;
      var applyFromEvent = function (ev) {
        var rect = self.ui.volTrack.getBoundingClientRect();
        var clientX = ev.touches && ev.touches[0]
          ? ev.touches[0].clientX : ev.clientX;
        var pct = ((clientX - rect.left) / rect.width) * 100;
        if (pct < 0) pct = 0;
        if (pct > 100) pct = 100;
        self.setVolume(pct);
      };
      this.ui.volTrack.addEventListener('mousedown', function (ev) {
        dragging = true; applyFromEvent(ev); ev.preventDefault();
      });
      window.addEventListener('mousemove', function (ev) {
        if (dragging) applyFromEvent(ev);
      });
      window.addEventListener('mouseup', function () { dragging = false; });
      this.ui.volTrack.addEventListener('touchstart', function (ev) {
        dragging = true; applyFromEvent(ev);
      }, { passive: true });
      this.ui.volTrack.addEventListener('touchmove', function (ev) {
        if (dragging) applyFromEvent(ev);
      }, { passive: true });
      this.ui.volTrack.addEventListener('touchend', function () { dragging = false; });
    }
  };

  KPRadioPlayer.prototype.play = function () {
    this.desired = 'play';
    this.retryCount = 0;
    try { this.audio.src = cacheBust(this.url); } catch (e) {}
    this._beginBufferGate();
    this._updateDisplay(); // switch from static title to metadata
    var p = this.audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        // Autoplay blocked. User will have to click play. That's fine.
      });
    }
  };

  KPRadioPlayer.prototype.stop = function () {
    this.desired = 'stop';
    this._cancelBufferGate();
    try { this.audio.pause(); } catch (e) {}
    try { this.audio.removeAttribute('src'); this.audio.load(); } catch (e) {}
    // Restore the listener's volume so the next play() starts from the
    // right level (the gate may have left audio.volume at 0).
    this.audio.volume = this._volumePct / 100;
    this.ui.setStatus('stopped');
    this._updateDisplay(); // switch from metadata back to static title
    emit(this, 'stop', null);
  };

  KPRadioPlayer.prototype._reconnect = function () {
    if (this.desired !== 'play') return;
    if (this.retryCount >= this.retryMax) {
      if (this.fallbackUrl) {
        this.url = this.fallbackUrl;
        this.fallbackUrl = null;
        this.retryCount = 0;
      } else {
        this.stop();
        return;
      }
    }
    var delay = Math.min(30000, 1000 * Math.pow(2, this.retryCount));
    this.retryCount++;
    var self = this;
    setTimeout(function () {
      if (self.desired !== 'play') return;
      try { self.audio.src = cacheBust(self.url); } catch (e) {}
      self._beginBufferGate();
      var p = self.audio.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    }, delay);
  };

  KPRadioPlayer.prototype.setVolume = function (pct) {
    if (pct < 0) pct = 0; if (pct > 100) pct = 100;
    this._volumePct = pct;
    // While the buffer gate is active the audio element stays muted; only
    // remember the new target. The gate will apply it on release.
    if (!this._bufferActive) {
      this.audio.volume = pct / 100;
    }
    this.ui.setVolumeVisual(pct);
  };

  KPRadioPlayer.prototype.setUrl = function (url) {
    this.url = url;
    if (this.poller) {
      this.poller.stop();
      this.poller.streamUrl = url;
      this.poller.lastTitle = null;
      this.poller.start();
    }
    if (this.desired === 'play') this.play();
  };

  KPRadioPlayer.prototype.setFallbackUrl = function (url) {
    this.fallbackUrl = url;
  };

  KPRadioPlayer.prototype.setTitle = function (t) {
    this.customTitle = t || '';
    this._updateDisplay();
  };

  KPRadioPlayer.prototype.showInfo = function (str) {
    this.ui.setText(str == null ? '' : String(str));
  };

  KPRadioPlayer.prototype._updateDisplay = function () {
    // While the user wants the stream playing, show "now playing" metadata.
    // When stopped/paused, show the static station title instead so the
    // marquee falls back to "KPradio.net" (or whatever opts.title is) until
    // playback resumes.
    var line;
    if (this.desired === 'play' && this.currentMetadata) {
      line = this.currentMetadata;
    } else {
      line = this.customTitle || '';
    }
    this.ui.setText(line);
  };

  KPRadioPlayer.prototype._applyNowPlayingUI = function (np) {
    var ui = this._nowPlayingUI;
    if (!ui) return;
    var song = np.now_playing && np.now_playing.song;
    var isLive = np.live && np.live.is_live;

    if (ui.songTitle && song) {
      var el = document.querySelector(ui.songTitle);
      if (el) el.textContent = song.title || '';
    }
    if (ui.songArtist && song) {
      var el = document.querySelector(ui.songArtist);
      if (el) el.textContent = song.artist || '';
    }
    if (ui.liveImage) {
      var el = document.querySelector(ui.liveImage);
      if (el) el.src = isLive
        ? (ui.liveImageSrc || '/assets/kplive.gif')
        : (ui.offlineImageSrc || '/assets/autodj.gif');
    }
    if (ui.liveText) {
      var el = document.querySelector(ui.liveText);
      if (el) el.textContent = isLive
        ? (ui.liveTextOn || 'KP LIVE!')
        : (ui.liveTextOff || 'Auto-DJ');
    }
    if (ui.chatWindow) {
      var el = document.querySelector(ui.chatWindow);
      if (el) this._applyChatWindow(el, ui, isLive);
    }
  };

  KPRadioPlayer.prototype._applyChatWindow = function (el, ui, isLive) {
    var cooldown = (ui.chatCooldown || 0) * 1000;

    if (isLive) {
      // going live — show chat, cancel any pending cooldown
      this._chatWasLive = true;
      if (this._chatCooldownTimer) {
        clearInterval(this._chatCooldownTimer);
        this._chatCooldownTimer = null;
      }
      var banner = document.getElementById('KPR-chat-cooldown');
      if (banner) banner.remove();
      el.style.display = '';
      return;
    }

    // not live — only run cooldown if we were live during this page session
    if (!this._chatWasLive) {
      el.style.display = 'none';
      return;
    }

    // already cooling down, let the existing timer finish
    if (this._chatCooldownTimer) return;

    // no cooldown configured, hide immediately
    if (!cooldown) {
      el.style.display = 'none';
      this._chatWasLive = false;
      return;
    }

    // start cooldown
    var deadline = Date.now() + cooldown;
    var wrapper = el.parentElement;

    // wrap chat in a positioned container if not already
    if (!wrapper || !wrapper.classList.contains('KPR-chat-wrap')) {
      wrapper = document.createElement('div');
      wrapper.className = 'KPR-chat-wrap';
      wrapper.style.position = 'relative';
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);
    }

    var banner = document.createElement('div');
    banner.id = 'KPR-chat-cooldown';
    banner.style.cssText =
      'position:absolute;top:0;left:0;right:0;' +
      'background:var(--def-element-background);color:#fff;' +
      'text-align:center;padding:8px;font-size:14px;' +
      'z-index:10;border-radius:18px 18px 0 0;';
    wrapper.insertBefore(banner, el);

    var self = this;
    function tick() {
      var remaining = Math.max(0, deadline - Date.now());
      var min = Math.floor(remaining / 60000);
      var sec = Math.floor((remaining % 60000) / 1000);
      banner.textContent = 'Broadcast over, chat closing in: ' +
        min + ':' + (sec < 10 ? '0' : '') + sec + '...';

      if (remaining <= 0) {
        clearInterval(self._chatCooldownTimer);
        self._chatCooldownTimer = null;
        self._chatWasLive = false;
        banner.remove();
        el.style.display = 'none';
      }
    }

    tick();
    this._chatCooldownTimer = setInterval(tick, 1000);
  };

  // ---------------------------------------------------------------------
  // XML → HTML/CSS dump helper
  // ---------------------------------------------------------------------
  //
  // Loads an XML skin and prints an equivalent standalone HTML+CSS block
  // to the console. This is a one-shot migration helper for users who want
  // to move from the XML format to hand-written skins.

  function dumpSkinAsHtml(xmlUrl) {
    return loadSkinXml(xmlUrl).then(function (skin) {
      var lines = [];
      var css = [];
      var id = 'my-radio';
      lines.push('<div id="' + id + '" class="KPR-skin">');
      css.push('#' + id + ' {');
      css.push('  position:relative; display:inline-block; overflow:hidden;');
      css.push('  user-select:none; font-family:sans-serif;');
      css.push('}');

      if (skin.bg && skin.bg.image) {
        lines.push('  <img class="bg" src="' + skin.bg.image + '" alt="">');
        css.push('#' + id + ' .bg { position:absolute; left:' +
          skin.bg.x + 'px; top:' + skin.bg.y + 'px; pointer-events:none; }');
      }
      if (skin.play && skin.play.image) {
        lines.push('  <img class="play" data-KPR="play" src="' +
          skin.play.image + '" alt="Play">');
        css.push('#' + id + ' .play { position:absolute; left:' +
          skin.play.x + 'px; top:' + skin.play.y + 'px; cursor:pointer; }');
        if (skin.play.clickImage) {
          css.push('#' + id + ' .play:active { content: url("' +
            skin.play.clickImage + '"); }');
        }
      }
      if (skin.stop && skin.stop.image) {
        lines.push('  <img class="stop" data-KPR="stop" src="' +
          skin.stop.image + '" alt="Stop">');
        css.push('#' + id + ' .stop { position:absolute; left:' +
          skin.stop.x + 'px; top:' + skin.stop.y + 'px; cursor:pointer; }');
        if (skin.stop.clickImage) {
          css.push('#' + id + ' .stop:active { content: url("' +
            skin.stop.clickImage + '"); }');
        }
      }
      if (skin.status && (skin.status.imagePlay || skin.status.imageStop)) {
        lines.push('  <img class="status" data-KPR="status" src="' +
          (skin.status.imageStop || skin.status.imagePlay) + '" alt="">');
        css.push('#' + id + ' .status { position:absolute; left:' +
          skin.status.x + 'px; top:' + skin.status.y +
          'px; pointer-events:none; }');
      }
      if (skin.text) {
        lines.push('  <div class="text" data-KPR="text"></div>');
        css.push('#' + id + ' .text {');
        css.push('  position:absolute;');
        css.push('  left:' + skin.text.x + 'px; top:' + skin.text.y + 'px;');
        css.push('  width:' + skin.text.width + 'px; height:' +
          skin.text.height + 'px;');
        css.push('  color:' + skin.text.color + ';');
        css.push('  font-family:"' + skin.text.font + '",sans-serif;');
        css.push('  font-size:' + skin.text.size + 'px;');
        css.push('  line-height:' + skin.text.height + 'px;');
        css.push('  overflow:hidden; white-space:nowrap;');
        css.push('  pointer-events:none;');
        css.push('}');
      }
      if (skin.volume) {
        lines.push('  <div class="volume" data-KPR="volume">');
        if (skin.volume.holderImage) {
          lines.push('    <img class="volume-holder" data-KPR="volume-holder" src="' +
            skin.volume.holderImage + '" alt="">');
        }
        lines.push('  </div>');
        css.push('#' + id + ' .volume { position:absolute; left:' +
          skin.volume.x + 'px; top:' + skin.volume.y +
          'px; width:' + skin.volume.width + 'px; height:' +
          skin.volume.height + 'px; cursor:pointer; }');
        if (skin.volume.holderImage) {
          css.push('#' + id + ' .volume-holder { position:absolute; top:0; left:0; pointer-events:none; }');
        }
      }
      lines.push('</div>');

      var out = 'HTML:\n' + lines.join('\n') + '\n\nCSS:\n' + css.join('\n');
      console.log(out);
      return { html: lines.join('\n'), css: css.join('\n') };
    });
  }

  // ---------------------------------------------------------------------
  // Public KPR API (drop-in compatible)
  // ---------------------------------------------------------------------

  var instances = {};
  var containerCounter = 0;

  var KPR = {
    elementId: null,
    objectId: 'KPRObject',

    setElementId: function (id) { this.elementId = id; },
    setObjectId:  function (id) { this.objectId  = id; },

    setCallbackFunction: function (fn) { _callbackRef = fn; },

    insert: function (opts) {
      opts = assign({}, opts);
      if (!opts.elementId && this.elementId) opts.elementId = this.elementId;
      if (!opts.id) opts.id = this.objectId;

      if (opts.callbackFunction) this.setCallbackFunction(opts.callbackFunction);

      var containerId = 'KPR-clean-container-' + (++containerCounter);
      var mountHtml = '<div id="' + containerId + '" style="display:inline-block;"></div>';

      if (opts.elementId) {
        var host = document.getElementById(opts.elementId);
        if (!host) {
          console.error('[KPR] insert: elementId not found:', opts.elementId);
          return;
        }
        host.innerHTML = mountHtml;
      } else {
        // Matches the legacy behavior — inline document.write during parse.
        document.write(mountHtml);
      }

      var id = opts.id;
      resolveSkin(opts.skin).then(function (skin) {
        var ui = skin.type === 'html'
          ? renderHtmlSkin(skin, opts.width, opts.height)
          : renderXmlSkin(skin, opts.width, opts.height);
        var mountPoint = document.getElementById(containerId);
        if (!mountPoint) return;
        mountPoint.appendChild(ui.root);
        instances[id] = new KPRadioPlayer(opts, ui);
      }).catch(function (err) {
        console.error('[KPR] skin load failed:', err);
        var mountPoint = document.getElementById(containerId);
        if (mountPoint) {
          mountPoint.textContent = '[player skin failed to load: ' +
            (err && err.message ? err.message : err) + ']';
        }
      });
    },

    _get: function () { return instances[this.objectId]; },

    play:        function ()  { var p = this._get(); if (p) p.play(); },
    stop:        function ()  { var p = this._get(); if (p) p.stop(); },
    setVolume:   function (v) { var p = this._get(); if (p) p.setVolume(v); },
    setUrl:      function (u) { var p = this._get(); if (p) p.setUrl(u); },
    setFallbackUrl: function (u) { var p = this._get(); if (p) p.setFallbackUrl(u); },
    setTitle:    function (t) { var p = this._get(); if (p) p.setTitle(t); },
    showInfo:    function (s) { var p = this._get(); if (p) p.showInfo(s); },

    dumpSkinAsHtml: dumpSkinAsHtml,

    // Expose internals for debugging / advanced use.
    _instances: instances,
    _parseSkinXml: parseSkinXml
  };

  global.KPR = KPR;

  // Preserve the legacy global `kprCallback` binding. Pages that assign
  // `window.kprCallback = function(...)` keep working without needing
  // KPR.setCallbackFunction.
  if (typeof global.kprCallback === 'function') {
    _callbackRef = global.kprCallback;
  }
  try {
    Object.defineProperty(global, 'kprCallback', {
      configurable: true,
      get: function () { return _callbackRef; },
      set: function (v) { _callbackRef = v; }
    });
  } catch (e) { /* some environments disallow redefining globals */ }

})(typeof window !== 'undefined' ? window : this);
