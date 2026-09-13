(function () {
  'use strict';
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
}());
