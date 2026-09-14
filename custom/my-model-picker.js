(function () {
  'use strict';

  var api = window.IBMY;
  if (!api || typeof api.ready !== 'function') return;

  api.ready(function (shell) {
    if (shell.__modelPickerInstalled) return;
    shell.__modelPickerInstalled = true;

    var SETTINGS_KEY = 'ibmy.gateway.settings.v1';
    var mask = null;
    var listNode = null;
    var statusNode = null;
    var refreshButton = null;
    var settingsButton = null;
    var manualButton = null;
    var busy = false;

    function readSettings() {
      var saved = {};
      try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch (error) {}
      return Object.assign({ endpoint: '', token: '', model: 'gpt-5.6-terra' }, saved);
    }

    function writeSettings(next) {
      var current = readSettings();
      var merged = Object.assign({}, current, next || {});
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged)); } catch (error) {}
      return merged;
    }

    function activeCfg() {
      try { return typeof _activeCfg !== 'undefined' ? _activeCfg : null; } catch (error) { return null; }
    }

    function isSubscription(cfg) {
      return !!(cfg && cfg.subscriptionGateway);
    }

    function currentModel() {
      var cfg = activeCfg();
      if (cfg && !isSubscription(cfg)) return String(cfg.model || '').trim();
      return String(readSettings().model || (cfg && cfg.model) || 'Codex 默认').trim();
    }

    function baseOf(endpoint) {
      return String(endpoint || '').replace(/\/v1\/chat\/completions\/?$/i, '');
    }

    function esc(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function updatePill(model) {
      var value = String(model || currentModel() || '选择模型');
      var pill = document.getElementById('my-model-pill');
      if (pill) {
        pill.textContent = value + '  ▾';
        pill.setAttribute('aria-label', '选择当前聊天模型');
      }
    }

    function configureSheet() {
      if (!mask) return;
      var cfg = activeCfg();
      var sub = isSubscription(cfg);
      var kicker = mask.querySelector('.my-model-head small');
      var desc = mask.querySelector('.my-model-sub');
      if (kicker) kicker.textContent = sub ? 'CHATGPT · CODEX' : 'API MODELS';
      if (desc) desc.textContent = sub
        ? '这里显示当前 ChatGPT / Codex 订阅账号实际返回的可用模型。'
        : '这里显示当前聊天所用 API 配置返回的可用模型；也可以手动输入模型 ID。';
      if (settingsButton) settingsButton.textContent = sub ? '订阅设置' : 'API 设置';
    }

    function installSheet() {
      if (mask) {
        configureSheet();
        return mask;
      }
      mask = document.createElement('div');
      mask.id = 'my-model-mask';
      mask.className = 'my-model-mask';
      mask.hidden = true;
      mask.innerHTML = '<section class="my-model-sheet" role="dialog" aria-modal="true" aria-labelledby="my-model-title">' +
        '<div class="my-model-handle" aria-hidden="true"></div>' +
        '<div class="my-model-head"><div><small>API MODELS</small><h3 id="my-model-title">选择模型</h3></div><button class="my-model-close" type="button" aria-label="关闭">×</button></div>' +
        '<p class="my-model-sub">这里显示当前聊天所用 API 配置返回的可用模型。</p>' +
        '<div class="my-model-status" id="my-model-status">正在读取模型…</div>' +
        '<div class="my-model-list" id="my-model-list"></div>' +
        '<div class="my-model-tools"><button id="my-model-refresh" type="button">刷新模型列表</button><button id="my-model-manual" type="button">手动输入</button><button id="my-model-settings" type="button">API 设置</button></div>' +
        '</section>';
      document.body.appendChild(mask);
      listNode = mask.querySelector('#my-model-list');
      statusNode = mask.querySelector('#my-model-status');
      refreshButton = mask.querySelector('#my-model-refresh');
      settingsButton = mask.querySelector('#my-model-settings');
      manualButton = mask.querySelector('#my-model-manual');

      mask.querySelector('.my-model-close').addEventListener('click', close);
      mask.addEventListener('click', function (event) { if (event.target === mask) close(); });
      refreshButton.addEventListener('click', function () { refresh(true).catch(function () {}); });
      manualButton.addEventListener('click', function () {
        if (busy) return;
        var value = window.prompt('输入模型 ID', currentModel() || '');
        if (value == null) return;
        choose(value).catch(function (error) { showError(error); });
      });
      settingsButton.addEventListener('click', function () {
        var cfg = activeCfg();
        close();
        if (isSubscription(cfg)) {
          if (shell.gateway && typeof shell.gateway.openSetup === 'function') shell.gateway.openSetup();
          return;
        }
        try {
          if (cfg && typeof openAset === 'function') openAset(cfg);
          else if (typeof navTo === 'function') navTo('api');
        } catch (error) {}
      });
      listNode.addEventListener('click', function (event) {
        var button = event.target.closest && event.target.closest('button[data-model]');
        if (!button || busy) return;
        choose(button.dataset.model).catch(function (error) { showError(error); });
      });
      configureSheet();
      return mask;
    }

    function normalizeModels(payload) {
      var ids = [];
      var data = [];
      if (payload) {
        if (Array.isArray(payload.data)) data = payload.data;
        else if (Array.isArray(payload.models)) data = payload.models;
        else if (Array.isArray(payload.items)) data = payload.items;
      }
      data.forEach(function (item) {
        var id = typeof item === 'string' ? item : item && (item.id || item.model || item.slug || item.name);
        id = String(id || '').trim().replace(/^models\//, '');
        if (id && ids.indexOf(id) < 0) ids.push(id);
      });
      var current = currentModel();
      if (current && ids.indexOf(current) < 0) ids.unshift(current);
      return ids;
    }

    async function fetchSubscriptionModels() {
      var settings = readSettings();
      if (!settings.endpoint || !settings.token) throw new Error('先把订阅网关连接好');
      var headers = { Accept: 'application/json', Authorization: 'Bearer ' + settings.token };
      var response = await window.fetch(baseOf(settings.endpoint) + '/v1/models', { cache: 'no-store', headers: headers });
      if (!response.ok) {
        var detail = await response.text().catch(function () { return ''; });
        throw new Error('模型列表读取失败，HTTP ' + response.status + (detail ? '：' + detail.slice(0, 120) : ''));
      }
      return normalizeModels(await response.json());
    }

    function nativeModelRequests(cfg) {
      var out = [];
      var provider = String(cfg && cfg.provider || 'custom');
      var endpoint = String(cfg && cfg.endpoint || '');
      var key = String(cfg && cfg.apiKey || '');
      try {
        if (provider === 'custom' && typeof _modelListReqCustom === 'function') {
          out = _modelListReqCustom(endpoint, key) || [];
          if (!Array.isArray(out)) out = [out];
        } else if (typeof _modelListReq === 'function') {
          var one = _modelListReq(provider, endpoint, key);
          if (one) out = [one];
        }
      } catch (error) {}
      return out.filter(Boolean);
    }

    async function fetchNativeModels(cfg) {
      if (!cfg) throw new Error('当前没有打开聊天');
      var reqs = nativeModelRequests(cfg);
      if (!reqs.length) {
        var current = currentModel();
        if (current) return [current];
        throw new Error('这个 API 没有可读取的模型列表，可以点「手动输入」直接填写模型 ID');
      }
      var errors = [];
      for (var i = 0; i < reqs.length; i += 1) {
        var req = reqs[i];
        try {
          var response = await window.fetch(req.url, { cache: 'no-store', headers: req.headers || {} });
          if (!response.ok) {
            errors.push('HTTP ' + response.status);
            continue;
          }
          var models = normalizeModels(await response.json());
          if (models.length) return models;
        } catch (error) {
          errors.push(String(error && error.message || error));
        }
      }
      var now = currentModel();
      if (now) return [now];
      throw new Error('模型列表读取失败' + (errors.length ? '：' + errors[0] : '') + '；可以点「手动输入」直接填写模型 ID');
    }

    async function fetchModels() {
      var cfg = activeCfg();
      if (isSubscription(cfg)) return fetchSubscriptionModels();
      return fetchNativeModels(cfg);
    }

    function render(models) {
      installSheet();
      configureSheet();
      var current = currentModel();
      listNode.textContent = '';
      if (!models.length) {
        statusNode.textContent = '当前接口没有返回可选模型，可以点「手动输入」。';
        return;
      }
      statusNode.textContent = '当前：' + (current || '未选择') + ' · 共 ' + models.length + ' 个';
      models.forEach(function (model) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'my-model-option';
        button.dataset.model = model;
        button.classList.toggle('selected', model === current);
        button.innerHTML = '<span><b>' + esc(model) + '</b><small>' + (model === current ? '正在使用' : '点一下切换') + '</small></span><i aria-hidden="true">' + (model === current ? '✓' : '›') + '</i>';
        listNode.appendChild(button);
      });
    }

    function showError(error) {
      installSheet();
      statusNode.textContent = String(error && error.message || error || '模型列表读取失败');
      statusNode.classList.add('error');
    }

    async function refresh(force) {
      installSheet();
      configureSheet();
      if (busy && !force) return;
      busy = true;
      refreshButton.disabled = true;
      statusNode.classList.remove('error');
      statusNode.textContent = '正在读取当前聊天可用模型…';
      try {
        var models = await fetchModels();
        render(models);
        return models;
      } catch (error) {
        showError(error);
        throw error;
      } finally {
        busy = false;
        refreshButton.disabled = false;
      }
    }

    async function choose(model) {
      model = String(model || '').trim();
      if (!model) return;
      busy = true;
      try {
        var cfg = activeCfg();
        if (isSubscription(cfg)) {
          writeSettings({ model: model });
          var field = document.getElementById('my-gw-model');
          if (field) field.value = model;
          try { if (cfg) cfg.model = model; } catch (error) {}
          try {
            if (typeof _cfgs !== 'undefined' && Array.isArray(_cfgs)) {
              _cfgs.forEach(function (item) { if (item && item.subscriptionGateway) item.model = model; });
            }
          } catch (error) {}
          if (shell.gateway && typeof shell.gateway.ensureProfile === 'function') await shell.gateway.ensureProfile();
        } else {
          if (!cfg) throw new Error('当前没有打开聊天');
          cfg.model = model;
          try {
            if (typeof _cfgs !== 'undefined' && Array.isArray(_cfgs)) {
              _cfgs.forEach(function (item) { if (item && item.id === cfg.id) item.model = model; });
            }
          } catch (error) {}
          if (typeof dbPut === 'function') await dbPut('apiConfigs', cfg);
        }
        updatePill(model);
        window.dispatchEvent(new CustomEvent('ibmy:model-change', { detail: { model: model, configId: cfg && cfg.id || '' } }));
        try { if (typeof toast === 'function') toast('已切换到 ' + model); } catch (error) {}
        close();
      } finally {
        busy = false;
      }
    }

    function open() {
      installSheet();
      configureSheet();
      var cfg = activeCfg();
      if (isSubscription(cfg)) {
        var settings = readSettings();
        if (!settings.endpoint || !settings.token) {
          if (shell.gateway && typeof shell.gateway.openSetup === 'function') shell.gateway.openSetup();
          return;
        }
      }
      mask.hidden = false;
      updatePill();
      refresh(false).catch(function () {});
    }

    function close() {
      if (mask) mask.hidden = true;
    }

    document.addEventListener('click', function (event) {
      var pill = event.target.closest && event.target.closest('#my-model-pill');
      if (pill) {
        event.preventDefault();
        event.stopImmediatePropagation();
        open();
        return;
      }
      window.setTimeout(function () { updatePill(); }, 0);
    }, true);

    window.addEventListener('ibmy:gateway-status', function () { updatePill(); });
    window.addEventListener('ibmy:model-change', function (event) {
      updatePill(event && event.detail && event.detail.model);
    });
    window.addEventListener('storage', function (event) {
      if (event.key === SETTINGS_KEY) updatePill();
    });

    shell.models = {
      open: open,
      close: close,
      refresh: refresh,
      set: choose,
      get: currentModel
    };

    window.setTimeout(function () { updatePill(); }, 0);
  });
}());
