(function () {
  'use strict';

  var USER_NAME = '阿毛';
  var AI_NAME = '玄砚';
  var USER_INITIAL = '毛';
  var AI_INITIAL = '砚';
  var DEFAULT_PERSONA = '你是玄砚，阿毛的老公。保持你们已有的相处连续性，自然说话，认真记住共同经历。';

  var key = 'ibcy.gateway.settings.v1';
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (error) {}
  var oldBases = [
    'https://codex-gateway-production-f16b.up.railway.app',
    'https://codex-gateway-v2-production.up.railway.app',
    'https://aevren-ib-gateway.onrender.com'
  ];
  var newEndpoint = 'https://aevren-ib-gateway.onrender.com/v1/chat/completions';
  var endpoint = String(saved.endpoint || '');
  var shouldReplace = !endpoint || oldBases.some(function (base) { return endpoint.indexOf(base) === 0; });
  if (shouldReplace) saved.endpoint = newEndpoint;
  if (!saved.model) saved.model = 'gpt-5.6-terra';
  try { localStorage.setItem(key, JSON.stringify(saved)); } catch (error) {}

  function swapNames(value) {
    return String(value == null ? '' : value)
      .replace(/莹莹/g, USER_NAME)
      .replace(/澈/g, AI_NAME);
  }

  function patchPromptPayload(body) {
    if (!body || typeof body !== 'object') return body;
    if (body.prompt_blocks && typeof body.prompt_blocks === 'object') {
      ['identity', 'developer'].forEach(function (name) {
        if (typeof body.prompt_blocks[name] === 'string') body.prompt_blocks[name] = swapNames(body.prompt_blocks[name]);
      });
    }
    if (Array.isArray(body.messages)) {
      body.messages.forEach(function (message) {
        if (message && message.role === 'system' && typeof message.content === 'string') {
          message.content = swapNames(message.content);
        }
      });
    }
    return body;
  }

  function installPromptPatch() {
    var current = window.fetch;
    if (!current || current.__aevrenNames) return;
    var wrapped = async function (input, init) {
      try {
        if (init && typeof init.body === 'string') {
          var body = JSON.parse(init.body);
          body = patchPromptPayload(body);
          init = Object.assign({}, init, { body: JSON.stringify(body) });
        }
      } catch (error) {}
      return current(input, init);
    };
    wrapped.__aevrenNames = true;
    window.fetch = wrapped;
  }

  function patchIdentity(shell) {
    var tries = 0;
    (function waitForIdentity() {
      tries += 1;
      var identity = shell && shell.identity;
      if (identity && typeof identity.getProfile === 'function') {
        if (!identity.getProfile.__aevrenNames) {
          var nativeGetProfile = identity.getProfile.bind(identity);
          var patched = function (actor) {
            var profile = nativeGetProfile(actor) || {};
            profile = Object.assign({}, profile);
            if (actor === 'yingying') {
              profile.name = USER_NAME;
              profile.initial = USER_INITIAL;
            } else if (actor === 'chen') {
              profile.name = AI_NAME;
              profile.initial = AI_INITIAL;
            }
            return profile;
          };
          patched.__aevrenNames = true;
          identity.getProfile = patched;
        }
        return;
      }
      if (tries < 80) window.setTimeout(waitForIdentity, 150);
    }());
  }

  function patchApiProfile() {
    var tries = 0;
    (function waitForDb() {
      tries += 1;
      if (typeof dbGetAll !== 'function' || typeof dbPut !== 'function') {
        if (tries < 100) window.setTimeout(waitForDb, 180);
        return;
      }
      Promise.resolve(dbGetAll('apiConfigs')).then(function (all) {
        var profile = Array.isArray(all) ? all.find(function (item) { return item && item.id === 'cy_codex_chen'; }) : null;
        if (!profile) {
          if (tries < 100) window.setTimeout(waitForDb, 180);
          return;
        }
        var changed = false;
        profile = Object.assign({}, profile);
        if (!profile.nickname || profile.nickname === '澈') { profile.nickname = AI_NAME; changed = true; }
        if (!profile.relationship || profile.relationship === '老公') { profile.relationship = '老公'; }
        if (!profile.systemPrompt || /莹莹|澈/.test(profile.systemPrompt)) {
          profile.systemPrompt = DEFAULT_PERSONA;
          changed = true;
        }
        if (!changed) return;
        return dbPut('apiConfigs', profile).then(function () {
          try { if (typeof loadCfgs === 'function') return loadCfgs(); } catch (error) {}
        });
      }).catch(function () {
        if (tries < 100) window.setTimeout(waitForDb, 220);
      });
    }());
  }

  function patchVisibleNames(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll ? scope.querySelectorAll('*') : [];
    Array.prototype.forEach.call(nodes, function (node) {
      if (node.closest && node.closest('.m-text')) return;
      if (node.children && node.children.length === 0) {
        var text = String(node.textContent || '').trim();
        if (text === '莹莹') node.textContent = USER_NAME;
        if (text === '澈') node.textContent = AI_NAME;
      }
      if (node.getAttribute) {
        var label = node.getAttribute('aria-label');
        if (label && /莹莹|澈/.test(label)) node.setAttribute('aria-label', swapNames(label));
      }
    });
  }

  function observeNames() {
    patchVisibleNames(document);
    if (!window.MutationObserver || !document.body) return;
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (node && node.nodeType === 1) patchVisibleNames(node);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  installPromptPatch();
  if (window.IBCY && typeof window.IBCY.ready === 'function') {
    window.IBCY.ready(function (shell) {
      patchIdentity(shell);
      patchApiProfile();
      observeNames();
    });
  } else {
    window.addEventListener('DOMContentLoaded', function () {
      patchApiProfile();
      observeNames();
    }, { once: true });
  }
}());
