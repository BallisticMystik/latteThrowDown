/**
 * Barista Spotlight — Touch-Optimized Scoring UI
 *
 * Features:
 *   - Range slider with large touch targets (min 48px)
 *   - Visual feedback on score selection
 *   - Submit score function stub
 *   - Offline queue integration stub
 */

(function (global) {
  'use strict';

  // ─── Configuration ──────────────────────────────────────────────────────────
  var SCORE_MIN = 0;
  var SCORE_MAX = 10;
  var SCORE_STEP = 0.5;
  var SUBMIT_ENDPOINT = '/api/scores';

  // ─── ScoringUI class ───────────────────────────────────────────────────────

  /**
   * @param {string|HTMLElement} container  Selector or element to mount into
   * @param {object} opts
   * @param {string} opts.contestId
   * @param {string} opts.baristaId
   * @param {string[]} [opts.criteria]  Scoring criteria labels
   */
  function ScoringUI(container, opts) {
    opts = opts || {};

    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!this.container) {
      console.error('[ScoringUI] Container not found');
      return;
    }

    this.contestId = opts.contestId || '';
    this.baristaId = opts.baristaId || '';
    this.criteria = opts.criteria || [
      'Technique',
      'Creativity',
      'Presentation',
      'Taste',
    ];

    this._scores = {};   // criteria -> value
    this._sliders = {};  // criteria -> input element

    this._render();
    this._bindEvents();
  }

  // ─── Rendering ──────────────────────────────────────────────────────────────

  ScoringUI.prototype._render = function () {
    var html = '<div class="scoring-panel">';
    html += '<h3 class="scoring-title">Score This Round</h3>';

    for (var i = 0; i < this.criteria.length; i++) {
      var criterion = this.criteria[i];
      var id = 'score-' + criterion.toLowerCase().replace(/\s+/g, '-');

      html +=
        '<div class="scoring-criterion" data-criterion="' + criterion + '">' +
          '<label class="scoring-label" for="' + id + '">' +
            '<span class="scoring-label-text">' + criterion + '</span>' +
            '<span class="scoring-value" id="' + id + '-value">' + SCORE_MIN + '</span>' +
          '</label>' +
          '<div class="scoring-slider-wrap">' +
            '<input ' +
              'type="range" ' +
              'id="' + id + '" ' +
              'class="scoring-slider" ' +
              'min="' + SCORE_MIN + '" ' +
              'max="' + SCORE_MAX + '" ' +
              'step="' + SCORE_STEP + '" ' +
              'value="' + SCORE_MIN + '" ' +
              'data-criterion="' + criterion + '" ' +
            '/>' +
            '<div class="scoring-ticks">' +
              this._renderTicks() +
            '</div>' +
          '</div>' +
        '</div>';

      this._scores[criterion] = SCORE_MIN;
    }

    html +=
      '<div class="scoring-actions">' +
        '<button class="scoring-submit" id="scoring-submit-btn" disabled>' +
          'Submit Scores' +
        '</button>' +
        '<span class="scoring-status" id="scoring-status"></span>' +
      '</div>';

    html += '</div>';
    this.container.innerHTML = html;
  };

  ScoringUI.prototype._renderTicks = function () {
    var ticks = '';
    for (var v = SCORE_MIN; v <= SCORE_MAX; v += SCORE_MAX / 5) {
      ticks += '<span class="scoring-tick">' + v + '</span>';
    }
    return ticks;
  };

  // ─── Event binding ─────────────────────────────────────────────────────────

  ScoringUI.prototype._bindEvents = function () {
    var self = this;
    var sliders = this.container.querySelectorAll('.scoring-slider');

    for (var i = 0; i < sliders.length; i++) {
      (function (slider) {
        self._sliders[slider.dataset.criterion] = slider;

        // Use 'input' for real-time feedback on touch / drag
        slider.addEventListener('input', function () {
          self._onSliderChange(slider);
        });

        // Also handle 'change' for accessibility / keyboard
        slider.addEventListener('change', function () {
          self._onSliderChange(slider);
        });
      })(sliders[i]);
    }

    var submitBtn = this.container.querySelector('#scoring-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        self.submitScores();
      });
    }
  };

  ScoringUI.prototype._onSliderChange = function (slider) {
    var criterion = slider.dataset.criterion;
    var value = parseFloat(slider.value);
    this._scores[criterion] = value;

    // Update the displayed numeric value
    var valueEl = this.container.querySelector(
      '#' + slider.id + '-value'
    );
    if (valueEl) valueEl.textContent = value;

    // Visual feedback: scale the thumb colour intensity
    var pct = ((value - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;
    slider.style.setProperty('--fill-pct', pct + '%');

    // Add "touched" class for CSS feedback
    slider.closest('.scoring-criterion').classList.add('scoring-criterion--touched');

    this._updateSubmitState();
  };

  ScoringUI.prototype._updateSubmitState = function () {
    // Enable submit only when every criterion has been explicitly touched
    var touched = this.container.querySelectorAll('.scoring-criterion--touched');
    var btn = this.container.querySelector('#scoring-submit-btn');
    if (btn) {
      btn.disabled = touched.length < this.criteria.length;
    }
  };

  // ─── Score submission ───────────────────────────────────────────────────────

  /**
   * Submit the collected scores to the server.
   * Falls back to the offline queue when the network is unavailable.
   */
  ScoringUI.prototype.submitScores = function () {
    var self = this;
    var payload = {
      contestId: this.contestId,
      baristaId: this.baristaId,
      scores: Object.assign({}, this._scores),
      submittedAt: new Date().toISOString(),
    };

    this._setStatus('Submitting\u2026');

    fetch(SUBMIT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Server responded with ' + res.status);
        self._setStatus('Submitted!');
        self._onSubmitSuccess(payload);
      })
      .catch(function () {
        // Offline or server error — enqueue for later sync
        self._enqueueOffline(payload);
        self._setStatus('Saved offline — will sync later');
      });
  };

  ScoringUI.prototype._onSubmitSuccess = function (_payload) {
    // Hook: override or extend for post-submit behaviour (e.g. navigate away)
  };

  // ─── Offline queue integration ──────────────────────────────────────────────

  /**
   * Persist a score payload into the service-worker IndexedDB queue.
   */
  ScoringUI.prototype._enqueueOffline = function (payload) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'ENQUEUE_SCORE',
        payload: payload,
      });

      // Request a background sync when connectivity returns
      navigator.serviceWorker.ready.then(function (reg) {
        if (reg.sync) {
          reg.sync.register('sync-scores');
        }
      });
    } else {
      // Fallback: stash in localStorage
      try {
        var queue = JSON.parse(localStorage.getItem('offline-scores') || '[]');
        queue.push(payload);
        localStorage.setItem('offline-scores', JSON.stringify(queue));
      } catch (e) {
        console.error('[ScoringUI] Could not save score offline:', e);
      }
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  ScoringUI.prototype._setStatus = function (msg) {
    var el = this.container.querySelector('#scoring-status');
    if (el) el.textContent = msg;
  };

  /**
   * Programmatically reset all sliders to their minimum value.
   */
  ScoringUI.prototype.reset = function () {
    var criteria = Object.keys(this._sliders);
    for (var i = 0; i < criteria.length; i++) {
      var slider = this._sliders[criteria[i]];
      slider.value = SCORE_MIN;
      this._scores[criteria[i]] = SCORE_MIN;

      var valueEl = this.container.querySelector('#' + slider.id + '-value');
      if (valueEl) valueEl.textContent = SCORE_MIN;

      slider.closest('.scoring-criterion').classList.remove('scoring-criterion--touched');
      slider.style.removeProperty('--fill-pct');
    }
    this._updateSubmitState();
    this._setStatus('');
  };

  // ─── Export ─────────────────────────────────────────────────────────────────
  global.ScoringUI = ScoringUI;

})(typeof window !== 'undefined' ? window : globalThis);
