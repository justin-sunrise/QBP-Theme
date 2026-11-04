/**
 * Collection PLP: apply saved QBP quiz customer metafields as Shopify collection filters.
 * Only applies filters that exist as enabled options in this collection's facet UI.
 *
 * Sprint 9: active filter chips, toggle off without clearing metafields, zero-results message.
 */
(function () {
  var DEFAULT_API_BASE = 'https://surly-shp-prod.sunrisedataburst.com';
  var STORAGE_KEY = 'qbp_collection_quiz_filters';

  function normalizeApiBase(raw) {
    var s = String(raw || '').trim().replace(/\/$/, '');
    if (!s || s.indexOf('/') === 0) return '';
    try {
      var u = new URL(s);
      if (u.protocol === 'http:' || u.protocol === 'https:') return s;
    } catch (e) {
      /* ignore */
    }
    return '';
  }

  function apiUsesCrossOrigin(base) {
    if (!base) return false;
    try {
      return new URL(base).origin !== window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function collectionPath() {
    return window.location.pathname;
  }

  function customerQuizFiltersUrls(root) {
    var shop = (root.getAttribute('data-shop') || '').trim();
    var customerId = (root.getAttribute('data-customer-id') || '').trim();
    var remoteBase = normalizeApiBase(root.getAttribute('data-api-base')) || DEFAULT_API_BASE;

    var proxyUrl =
      '/apps/qbp/customer-quiz-filters?customerId=' + encodeURIComponent(customerId);
    if (shop) proxyUrl += '&shop=' + encodeURIComponent(shop);

    var remoteUrl =
      remoteBase +
      '/api/storefront/customer-quiz-filters?customerId=' +
      encodeURIComponent(customerId);
    if (shop) remoteUrl += '&shop=' + encodeURIComponent(shop);

    return { proxyUrl: proxyUrl, remoteUrl: remoteUrl, remoteBase: remoteBase };
  }

  function filterCsvValues(raw) {
    return String(raw || '')
      .split(/[,;]+/)
      .map(function (t) {
        return t.trim();
      })
      .filter(Boolean);
  }

  function usableQuizFilters(filters) {
    if (!Array.isArray(filters)) return [];
    var out = [];
    filters.forEach(function (f) {
      if (!f) return;
      var param = String(f.param || 'filter.p.tag').trim() || 'filter.p.tag';
      var filterValue = String(f.filterValue || f.value || '').trim();
      if (!filterValue) return;
      out.push({
        param: param,
        filterValue: filterValue,
        label: String(f.label || f.key || param).trim(),
      });
    });
    return out;
  }

  function fetchJson(url, useCrossOrigin) {
    return fetch(url, {
      credentials: useCrossOrigin ? 'omit' : 'same-origin',
      headers: { Accept: 'application/json' },
    }).then(function (res) {
      if (!res.ok) throw new Error('Request failed: ' + res.status);
      return res.json();
    });
  }

  function fetchQuizFilters(root) {
    var urls = customerQuizFiltersUrls(root);
    return fetchJson(urls.proxyUrl, false)
      .catch(function (proxyErr) {
        console.warn('[QBP] app proxy filters failed, trying app API:', proxyErr);
        return fetchJson(urls.remoteUrl, apiUsesCrossOrigin(urls.remoteBase));
      })
      .then(function (data) {
        if (data && data.error) throw new Error(data.error);
        return data;
      });
  }

  function valuesMatch(inputValue, targetValue) {
    var a = String(inputValue || '').trim();
    var b = String(targetValue || '').trim();
    if (!a || !b) return false;
    if (a === b) return true;
    try {
      if (decodeURIComponent(a) === b || a === decodeURIComponent(b)) return true;
    } catch (e) {
      /* ignore */
    }
    return a.toLowerCase() === b.toLowerCase();
  }

  function loadStoredState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var state = JSON.parse(raw);
      if (!state || state.path !== collectionPath()) return null;
      return state;
    } catch (e) {
      return null;
    }
  }

  function saveStoredState(state) {
    try {
      var next = Object.assign({ path: collectionPath() }, state);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      /* ignore quota / private mode */
    }
  }

  function clearStoredState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function isQuizFiltersActive() {
    var state = loadStoredState();
    return !!(state && state.active && state.filters && state.filters.length);
  }

  function getActiveQuizFilters() {
    var state = loadStoredState();
    if (!state || !state.active || !Array.isArray(state.filters)) return [];
    return state.filters;
  }

  function quizFilterValueIsChecked(param, value) {
    var forms = [
      document.getElementById('FacetFiltersForm'),
      document.getElementById('FacetFiltersFormMobile'),
    ];
    var escapedName =
      typeof CSS !== 'undefined' && CSS.escape
        ? CSS.escape(param)
        : param.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    for (var i = 0; i < forms.length; i++) {
      var form = forms[i];
      if (!form) continue;
      var inputs = form.querySelectorAll(
        'input[type="checkbox"][name="' + escapedName + '"]',
      );
      for (var j = 0; j < inputs.length; j++) {
        if (inputs[j].checked && valuesMatch(inputs[j].value, value)) return true;
      }
    }
    return false;
  }

  /** Drop quiz filter values that are no longer checked in the facet UI. */
  function pruneFilterToAppliedValues(filter) {
    if (!filter) return null;
    var appliedValues = filterCsvValues(filter.filterValue).filter(function (value) {
      return quizFilterValueIsChecked(filter.param, value);
    });
    if (!appliedValues.length) return null;

    var displayParts = appliedValues.map(function (value) {
      return facetCheckboxDisplayValue(filter.param, value);
    });

    return {
      param: filter.param,
      filterValue: appliedValues.join(','),
      label: filter.label,
      displayValue: displayParts.join(', '),
    };
  }

  var syncFacetDomTimer;

  function scheduleSyncQuizFiltersWithFacetDOM() {
    var state = loadStoredState();
    if (!state || !state.active) return;
    clearTimeout(syncFacetDomTimer);
    syncFacetDomTimer = setTimeout(syncQuizFiltersWithFacetDOM, 80);
  }

  function syncQuizFiltersWithFacetDOM() {
    var state = loadStoredState();
    if (!state || !state.active || !Array.isArray(state.filters)) return;

    var pruned = state.filters.map(pruneFilterToAppliedValues).filter(Boolean);

    if (!pruned.length) {
      markQuizFiltersInactive();
      return;
    }

    var unchanged =
      pruned.length === state.filters.length &&
      pruned.every(function (f, index) {
        var prev = state.filters[index];
        return (
          prev &&
          f.param === prev.param &&
          f.filterValue === prev.filterValue &&
          f.displayValue === prev.displayValue
        );
      });
    if (unchanged) return;

    saveStoredState({ active: true, filters: pruned });
    syncAllRootsUI();
  }

  function allQuizFilterRoots() {
    return document.querySelectorAll('[data-qbp-collection-filters]');
  }

  function rootLabels(root) {
    return {
      apply: (root.getAttribute('data-apply-label') || 'Use my quiz answers').trim(),
      toggleOff: (root.getAttribute('data-toggle-off-label') || 'Turn off quiz answers').trim(),
      customizeUrl: (root.getAttribute('data-customize-url') || '').trim(),
    };
  }

  /**
   * Map of facet param -> Set of values available on this collection (enabled checkboxes only).
   */
  function collectAvailableFacetOptions() {
    var available = new Map();
    var forms = [
      document.getElementById('FacetFiltersForm'),
      document.getElementById('FacetFiltersFormMobile'),
    ];

    forms.forEach(function (form) {
      if (!form) return;
      form.querySelectorAll('input[type="checkbox"][name]').forEach(function (input) {
        if (input.disabled) return;
        var param = String(input.getAttribute('name') || '').trim();
        if (!param) return;
        if (!available.has(param)) available.set(param, new Set());
        available.get(param).add(String(input.value));
      });
    });

    return available;
  }

  function stripFacetProductCount(text) {
    return String(text || '')
      .trim()
      .replace(/\s*\(\d+\)\s*$/, '')
      .trim();
  }

  function facetCheckboxDisplayValue(param, value) {
    var escapedName =
      typeof CSS !== 'undefined' && CSS.escape
        ? CSS.escape(param)
        : param.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    var selector = 'input[type="checkbox"][name="' + escapedName + '"]:not(:disabled)';
    var inputs = document.querySelectorAll(selector);
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      if (!valuesMatch(input.value, value)) continue;
      var label = input.closest('label');
      if (label) {
        var valueLabel = label.querySelector('.facet-checkbox__text-label');
        if (valueLabel) {
          var fromLabel = (valueLabel.textContent || '').trim();
          if (fromLabel) return fromLabel;
        }
        var clone = label.cloneNode(true);
        clone.querySelectorAll('input, .visually-hidden').forEach(function (el) {
          el.remove();
        });
        var text = stripFacetProductCount(clone.textContent);
        if (text) return text;
      }
      return String(input.value);
    }
    return String(value);
  }

  function enrichFiltersWithDisplayValues(filters) {
    return filters.map(function (f) {
      var displayParts = [];
      filterCsvValues(f.filterValue).forEach(function (value) {
        displayParts.push(facetCheckboxDisplayValue(f.param, value));
      });
      return {
        param: f.param,
        filterValue: f.filterValue,
        label: f.label,
        displayValue: displayParts.join(', ') || f.filterValue,
      };
    });
  }

  /**
   * Keep quiz filters that match at least one enabled facet value on this collection.
   */
  function intersectQuizFiltersWithCollection(quizFilters) {
    var available = collectAvailableFacetOptions();
    var applicable = [];
    var skipped = [];

    quizFilters.forEach(function (quizFilter) {
      var param = quizFilter.param;
      var allowedValues = available.get(param);

      if (!allowedValues || !allowedValues.size) {
        skipped.push(quizFilter);
        return;
      }

      var matchedCanonical = [];
      filterCsvValues(quizFilter.filterValue).forEach(function (requested) {
        allowedValues.forEach(function (allowed) {
          if (valuesMatch(allowed, requested) && matchedCanonical.indexOf(allowed) === -1) {
            matchedCanonical.push(allowed);
          }
        });
      });

      if (!matchedCanonical.length) {
        skipped.push(quizFilter);
        return;
      }

      applicable.push({
        param: param,
        filterValue: matchedCanonical.join(','),
        label: quizFilter.label,
      });
    });

    return { applicable: applicable, skipped: skipped };
  }

  function buildSearchParamsFromQuizFilters(quizFilters) {
    var params = new URLSearchParams(window.location.search.slice(1));
    var paramsToReplace = new Set();

    quizFilters.forEach(function (f) {
      paramsToReplace.add(f.param);
    });

    paramsToReplace.forEach(function (key) {
      params.delete(key);
    });

    quizFilters.forEach(function (f) {
      filterCsvValues(f.filterValue).forEach(function (value) {
        params.append(f.param, value);
      });
    });

    return params.toString();
  }

  function buildSearchParamsWithoutQuizFilters(quizFilters) {
    var params = new URLSearchParams(window.location.search.slice(1));

    quizFilters.forEach(function (f) {
      var remaining = params
        .getAll(f.param)
        .filter(function (existing) {
          return !filterCsvValues(f.filterValue).some(function (quizValue) {
            return valuesMatch(existing, quizValue);
          });
        });
      params.delete(f.param);
      remaining.forEach(function (value) {
        params.append(f.param, value);
      });
    });

    return params.toString();
  }

  function applyViaFacetForm(quizFilters) {
    var form = document.getElementById('FacetFiltersForm');
    var mobileForm = document.getElementById('FacetFiltersFormMobile');
    if (!form && !mobileForm) return false;

    var matched = 0;

    [form, mobileForm].forEach(function (targetForm) {
      if (!targetForm) return;

      quizFilters.forEach(function (f) {
        filterCsvValues(f.filterValue).forEach(function (value) {
          var escapedName =
            typeof CSS !== 'undefined' && CSS.escape
              ? CSS.escape(f.param)
              : f.param.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          var inputs = targetForm.querySelectorAll(
            'input[type="checkbox"][name="' + escapedName + '"]:not(:disabled)',
          );
          inputs.forEach(function (input) {
            if (valuesMatch(input.value, value)) {
              input.checked = true;
              matched += 1;
            }
          });
        });
      });
    });

    if (!matched) return false;

    var primaryForm = form || mobileForm;
    var trigger = primaryForm.querySelector('input[type="checkbox"]:checked');
    if (trigger) {
      trigger.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    return false;
  }

  function removeViaFacetForm(quizFilters) {
    var form = document.getElementById('FacetFiltersForm');
    var mobileForm = document.getElementById('FacetFiltersFormMobile');
    if (!form && !mobileForm) return false;

    var changed = false;

    [form, mobileForm].forEach(function (targetForm) {
      if (!targetForm) return;

      quizFilters.forEach(function (f) {
        filterCsvValues(f.filterValue).forEach(function (value) {
          var escapedName =
            typeof CSS !== 'undefined' && CSS.escape
              ? CSS.escape(f.param)
              : f.param.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          var inputs = targetForm.querySelectorAll(
            'input[type="checkbox"][name="' + escapedName + '"]:not(:disabled)',
          );
          inputs.forEach(function (input) {
            if (input.checked && valuesMatch(input.value, value)) {
              input.checked = false;
              changed = true;
            }
          });
        });
      });
    });

    if (!changed) return false;

    var primaryForm = form || mobileForm;
    var trigger = primaryForm.querySelector('input[type="checkbox"]');
    if (trigger) {
      trigger.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    return false;
  }

  function applyViaUrl(quizFilters) {
    var searchParams = buildSearchParamsFromQuizFilters(quizFilters);
    if (typeof FacetFiltersForm !== 'undefined' && FacetFiltersForm.renderPage) {
      FacetFiltersForm.renderPage(searchParams, null, true);
      return true;
    }
    window.location.search = searchParams ? '?' + searchParams : '';
    return true;
  }

  function removeViaUrl(quizFilters) {
    var searchParams = buildSearchParamsWithoutQuizFilters(quizFilters);
    if (typeof FacetFiltersForm !== 'undefined' && FacetFiltersForm.renderPage) {
      FacetFiltersForm.renderPage(searchParams, null, true);
      return true;
    }
    window.location.search = searchParams ? '?' + searchParams : window.location.pathname;
    return true;
  }

  function setStatus(root, message, isError) {
    var el = root.querySelector('[data-qbp-filter-status]');
    if (!el) return;
    if (!message) {
      el.classList.add('hidden');
      el.textContent = '';
      el.removeAttribute('role');
      return;
    }
    el.classList.remove('hidden');
    el.textContent = message;
    if (isError) el.setAttribute('role', 'alert');
    else el.setAttribute('role', 'status');
  }

  function setButtonBusy(btn, busy) {
    if (!btn) return;
    btn.disabled = !!busy;
    btn.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function updateToggleButton(root, btn, active) {
    if (!btn) return;
    var labels = rootLabels(root);
    btn.textContent = active ? labels.toggleOff : labels.apply;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    root.classList.toggle('qbp-collection-filters--active', !!active);
  }

  function renderActiveFilterChips(root, filters) {
    var wrap = root.querySelector('[data-qbp-active-filters-wrap]');
    var list = root.querySelector('[data-qbp-active-filters-list]');
    if (!wrap || !list) return;

    if (!filters || !filters.length) {
      wrap.classList.add('hidden');
      list.innerHTML = '';
      return;
    }

    wrap.classList.remove('hidden');
    list.innerHTML = filters
      .map(function (f) {
        var label = String(f.label || f.param).trim();
        var value = stripFacetProductCount(f.displayValue || f.filterValue || '');
        return (
          '<li class="qbp-collection-filters__chip" role="listitem">' +
          '<span class="qbp-collection-filters__chip-label">' +
          escapeHtml(label) +
          ':</span> ' +
          '<span class="qbp-collection-filters__chip-value">' +
          escapeHtml(value) +
          '</span></li>'
        );
      })
      .join('');
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isTransientQuizStatus(message) {
    var msg = String(message || '');
    return (
      msg.indexOf('Loading your quiz answers') === 0 ||
      msg.indexOf('Applying your quiz answers') === 0
    );
  }

  function syncAllRootsUI() {
    var active = isQuizFiltersActive();
    var filters = getActiveQuizFilters();

    allQuizFilterRoots().forEach(function (root) {
      var btn = root.querySelector('[data-qbp-apply-quiz-filters]');
      updateToggleButton(root, btn, active);
      renderActiveFilterChips(root, active ? filters : []);
      if (!active) {
        setStatus(root, '', false);
      } else {
        var statusEl = root.querySelector('[data-qbp-filter-status]');
        if (statusEl && isTransientQuizStatus(statusEl.textContent)) {
          setStatus(root, '', false);
        }
      }
    });

    updateQuizEmptyState();
  }

  function skippedFiltersMessage(skipped) {
    if (!skipped.length) return '';
    if (skipped.length === 1) {
      return (
        'Note: "' +
        (skipped[0].label || skipped[0].param) +
        '" from your quiz is not available on this collection.'
      );
    }
    return (
      'Note: ' +
      skipped.length +
      ' quiz filters are not available on this collection and were skipped.'
    );
  }

  function markQuizFiltersActive(applicable, skipped) {
    var note = skippedFiltersMessage(skipped);
    var enriched = enrichFiltersWithDisplayValues(applicable);
    saveStoredState({ active: true, filters: enriched });
    syncAllRootsUI();
    allQuizFilterRoots().forEach(function (r) {
      var applyBtn = r.querySelector('[data-qbp-apply-quiz-filters]');
      setButtonBusy(applyBtn, false);
      setStatus(r, note || '', !!note);
    });
    return note;
  }

  function markQuizFiltersInactive() {
    clearStoredState();
    syncAllRootsUI();
    removeQuizEmptyBanner();
  }

  function applyQuizFilters(applicable, skipped, root, btn) {
    var applied = applyViaFacetForm(applicable);
    if (!applied) {
      applyViaUrl(applicable);
    }

    markQuizFiltersActive(applicable, skipped);
    window.setTimeout(updateQuizEmptyState, applied ? 400 : 1200);
  }

  function deactivateQuizFilters(root, btn) {
    var filters = getActiveQuizFilters();
    if (!filters.length) {
      markQuizFiltersInactive();
      setButtonBusy(btn, false);
      return;
    }

    setButtonBusy(btn, true);
    allQuizFilterRoots().forEach(function (r) {
      setStatus(r, 'Turning off quiz filters…', false);
    });

    var removed = removeViaFacetForm(filters);
    if (!removed) {
      removeViaUrl(filters);
    }

    markQuizFiltersInactive();

    window.setTimeout(function () {
      setButtonBusy(btn, false);
      allQuizFilterRoots().forEach(function (r) {
        setStatus(r, 'Quiz filters are off. Your saved answers are unchanged.', false);
      });
      updateQuizEmptyState();
    }, 1200);
  }

  function loadAndApplyQuizFilters(root, btn) {
    if (root._qbpLoading) return;
    root._qbpLoading = true;
    setButtonBusy(btn, true);
    allQuizFilterRoots().forEach(function (r) {
      setStatus(r, 'Loading your quiz answers…', false);
    });

    fetchQuizFilters(root)
      .then(function (data) {
        var raw = usableQuizFilters(data && data.filters);
        if (!raw.length) {
          allQuizFilterRoots().forEach(function (r) {
            setStatus(
              r,
              'No saved quiz answers found. Complete a quiz while logged in, then try again.',
              true,
            );
          });
          setButtonBusy(btn, false);
          return;
        }

        var intersection = intersectQuizFiltersWithCollection(raw);
        if (!intersection.applicable.length) {
          allQuizFilterRoots().forEach(function (r) {
            setStatus(
              r,
              'None of your saved quiz filters apply to this collection. Try another category or update your quiz answers.',
              true,
            );
          });
          setButtonBusy(btn, false);
          return;
        }

        allQuizFilterRoots().forEach(function (r) {
          setStatus(r, 'Applying your quiz answers…', false);
        });
        applyQuizFilters(intersection.applicable, intersection.skipped, root, btn);
      })
      .catch(function (err) {
        console.error('[QBP] collection quiz filters:', err);
        allQuizFilterRoots().forEach(function (r) {
          setStatus(r, 'Could not load your quiz answers. Try again in a moment.', true);
        });
        setButtonBusy(btn, false);
      })
      .finally(function () {
        root._qbpLoading = false;
      });
  }

  function getCustomizeUrl() {
    var root = document.querySelector('[data-qbp-collection-filters]');
    return root ? rootLabels(root).customizeUrl : '';
  }

  function removeQuizEmptyBanner() {
    var existing = document.querySelector('[data-qbp-quiz-empty]');
    if (existing) existing.remove();
    var titleWrapper = document.querySelector('.collection--empty .title-wrapper');
    if (titleWrapper) titleWrapper.classList.remove('title-wrapper--qbp-hidden');
  }

  function updateQuizEmptyState() {
    removeQuizEmptyBanner();

    if (!isQuizFiltersActive()) return;

    var container = document.getElementById('ProductGridContainer');
    if (!container) return;

    var emptyCollection = container.querySelector('.collection--empty');
    if (!emptyCollection) return;

    var titleWrapper = emptyCollection.querySelector('.title-wrapper');
    if (titleWrapper) titleWrapper.classList.add('title-wrapper--qbp-hidden');

    var customizeUrl = getCustomizeUrl();
    var customizeLink = customizeUrl
      ? '<a class="link underlined-link" href="' +
        escapeHtml(customizeUrl) +
        '">Update your quiz answers</a>'
      : '';

    var banner = document.createElement('div');
    banner.className = 'qbp-quiz-empty';
    banner.setAttribute('data-qbp-quiz-empty', '');
    banner.setAttribute('role', 'alert');
    banner.innerHTML =
      '<h2 class="qbp-quiz-empty__title h3">No products match your quiz answers</h2>' +
      '<p class="qbp-quiz-empty__text">' +
      'Your saved quiz answers are filtering this collection, and no products match all of them together. ' +
      'Try turning off quiz filters to see more products, adjust other filters, or update your quiz answers.' +
      '</p>' +
      '<div class="qbp-quiz-empty__actions">' +
      '<button type="button" class="button button--secondary" data-qbp-deactivate-from-empty>Turn off quiz filters</button>' +
      customizeLink +
      '</div>';

    emptyCollection.appendChild(banner);
  }

  function observeProductGrid() {
    var container = document.getElementById('ProductGridContainer');
    if (!container || container._qbpGridObserved) return;
    container._qbpGridObserved = true;

    var observer = new MutationObserver(function () {
      if (isQuizFiltersActive()) {
        scheduleSyncQuizFiltersWithFacetDOM();
      } else {
        removeQuizEmptyBanner();
      }
    });
    observer.observe(container, { childList: true, subtree: true });
  }

  function observeFacetForms() {
    var wrapper = document.getElementById('main-collection-filters');
    if (wrapper && !wrapper._qbpFacetDomObserved) {
      wrapper._qbpFacetDomObserved = true;
      wrapper.addEventListener('input', function (event) {
        if (event.target && event.target.type === 'checkbox') {
          scheduleSyncQuizFiltersWithFacetDOM();
        }
      });
      var wrapperObserver = new MutationObserver(function () {
        scheduleSyncQuizFiltersWithFacetDOM();
      });
      wrapperObserver.observe(wrapper, { childList: true, subtree: true });
    }

    if (!window._qbpPopstateWired) {
      window._qbpPopstateWired = true;
      window.addEventListener('popstate', scheduleSyncQuizFiltersWithFacetDOM);
    }
  }

  function wireButtons() {
    document.querySelectorAll('[data-qbp-apply-quiz-filters]').forEach(function (btn) {
      if (btn._qbpWired) return;
      btn._qbpWired = true;
      btn.addEventListener('click', function () {
        var host = btn.closest('[data-qbp-collection-filters]');
        if (!host) return;
        if (isQuizFiltersActive()) {
          deactivateQuizFilters(host, btn);
        } else {
          loadAndApplyQuizFilters(host, btn);
        }
      });
    });
  }

  function wireDelegatedActions() {
    if (document._qbpDelegatedWired) return;
    document._qbpDelegatedWired = true;

    document.addEventListener('click', function (event) {
      var deactivateBtn = event.target.closest('[data-qbp-deactivate-from-empty]');
      if (!deactivateBtn) return;

      var root = document.querySelector('[data-qbp-collection-filters]');
      var btn = root && root.querySelector('[data-qbp-apply-quiz-filters]');
      if (!root || !btn) return;

      deactivateQuizFilters(root, btn);
    });
  }

  function init() {
    if (!document.querySelectorAll('[data-qbp-collection-filters]').length) return;
    wireButtons();
    wireDelegatedActions();
    observeProductGrid();
    observeFacetForms();
    syncQuizFiltersWithFacetDOM();
    syncAllRootsUI();
  }

  function boot() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  boot();
})();
