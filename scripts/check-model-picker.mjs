import { readFile } from 'node:fs/promises';

const [picker, pickerCss, sw, gateway, app, bridge] = await Promise.all([
  readFile('custom/my-model-picker.js', 'utf8'),
  readFile('custom/my-model-picker.css', 'utf8'),
  readFile('ib-sw.js', 'utf8'),
  readFile('custom/my-gateway.js', 'utf8'),
  readFile('gateway/app.py', 'utf8'),
  readFile('gateway/codex_bridge.py', 'utf8')
]);

for (const asset of ['./custom/my-model-picker.js', './custom/my-model-picker.css']) {
  if (!sw.includes(asset)) throw new Error(`service worker is not wiring ${asset}`);
}
if (!picker.includes('/v1/models') || !picker.includes('ibmy:model-change') || !picker.includes('ensureProfile')) {
  throw new Error('model picker does not fetch, persist, and announce model changes');
}
if (!picker.includes('#my-model-pill') || !picker.includes('stopImmediatePropagation')) {
  throw new Error('model picker is not intercepting the composer model pill');
}
if (!pickerCss.includes('.my-model-sheet') || !pickerCss.includes('.my-model-option.selected')) {
  throw new Error('model picker styles are incomplete');
}
if (!gateway.includes("SETTINGS_KEY = 'ibmy.gateway.settings.v1'") || !gateway.includes('profile.model = settings.model')) {
  throw new Error('gateway settings/profile model persistence is missing');
}
if (!app.includes('@app.get("/v1/models"') || !app.includes('await bridge.account_status()')) {
  throw new Error('gateway /v1/models endpoint is missing');
}
if (!bridge.includes('await self.client.models()')) {
  throw new Error('gateway is not reading the official Codex model list');
}

console.log('MY dynamic Codex model picker wiring OK');
