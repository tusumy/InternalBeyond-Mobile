import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'index.html',
  'ib-sw.js',
  'manifest.webmanifest',
  'apps/catalog.json',
  'apps/catalog.js',
  'apps/ib-app-cinema.js',
  'custom/my-shell.css',
  'custom/my-shell.js',
  'custom/my-ob-bridge.js',
  'custom/my-gateway.css',
  'custom/my-gateway.js',
  'custom/my-gateway-defaults.js',
  'custom/my-mutual-paw.css',
  'custom/my-paw-align-fix.css',
  'custom/my-mutual-paw.js',
  'custom/my-interaction-lexicon.js',
  'custom/my-interaction-protocol-v2.js',
  'custom/my-paw-stream-fast.js',
  'custom/my-interaction-thread-v2.js',
  'custom/my-interaction-editor.css',
  'custom/my-chat-polish.css',
  'custom/my-chat-polish.js',
  'custom/my-native-avatar.css',
  'gateway/app.py',
  'gateway/codex_bridge.py',
  'gateway/store.py',
  'gateway/requirements.txt',
  'gateway/Dockerfile'
];

await Promise.all(requiredFiles.map((file) => access(file)));

const [indexText, manifestText, catalogText, serviceWorker, mutualPaw, pawAlignFix, lexicon, protocolV2, streamFast, threadV2, chatPolish, editorCss, nativeAvatarCss, gatewayUi, gatewayDefaults, codexBridge, requirements, gatewayApp] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('manifest.webmanifest', 'utf8'),
  readFile('apps/catalog.json', 'utf8'),
  readFile('ib-sw.js', 'utf8'),
  readFile('custom/my-mutual-paw.js', 'utf8'),
  readFile('custom/my-paw-align-fix.css', 'utf8'),
  readFile('custom/my-interaction-lexicon.js', 'utf8'),
  readFile('custom/my-interaction-protocol-v2.js', 'utf8'),
  readFile('custom/my-paw-stream-fast.js', 'utf8'),
  readFile('custom/my-interaction-thread-v2.js', 'utf8'),
  readFile('custom/my-chat-polish.js', 'utf8'),
  readFile('custom/my-interaction-editor.css', 'utf8'),
  readFile('custom/my-native-avatar.css', 'utf8'),
  readFile('custom/my-gateway.js', 'utf8'),
  readFile('custom/my-gateway-defaults.js', 'utf8'),
  readFile('gateway/codex_bridge.py', 'utf8'),
  readFile('gateway/requirements.txt', 'utf8'),
  readFile('gateway/app.py', 'utf8')
]);

for (const asset of [
  './custom/my-shell.css',
  './custom/my-shell.js',
  './custom/my-ob-bridge.js',
  './custom/my-gateway-defaults.js',
  './custom/my-mutual-paw.css',
  './custom/my-paw-align-fix.css',
  './custom/my-mutual-paw.js',
  './custom/my-interaction-lexicon.js',
  './custom/my-interaction-protocol-v2.js',
  './custom/my-paw-stream-fast.js',
  './custom/my-interaction-thread-v2.js',
  './custom/my-interaction-editor.css',
  './custom/my-chat-polish.css',
  './custom/my-chat-polish.js',
  './custom/my-native-avatar.css'
]) {
  if (!serviceWorker.includes(asset)) throw new Error(`ib-sw.js is not wiring ${asset}`);
}
if (serviceWorker.includes('./custom/my-identity.js') || serviceWorker.includes('./custom/my-identity.css')) {
  throw new Error('legacy MY identity avatar layer is still being loaded');
}
if (!serviceWorker.includes('data-ibmy-loader')) throw new Error('ib-sw.js is missing the MY HTML injection marker');
if (!indexText.includes('function _msgAva(m)') || !indexText.includes('_sameSender(m,prev)') || !indexText.includes('function buildMsgEl(m,prev')) {
  throw new Error('upstream native avatar/message grouping support is missing');
}
if (!nativeAvatarCss.includes('.my-chat-avatar') || !nativeAvatarCss.includes('.m-body') || !nativeAvatarCss.includes('row-reverse')) {
  throw new Error('native avatar compatibility layer is incomplete');
}
if (!pawAlignFix.includes('width: 100% !important') || !pawAlignFix.includes('my-paw-from-yingying .m-body') || !pawAlignFix.includes('row-reverse') || !pawAlignFix.includes('my-paw-from-chen .m-body')) {
  throw new Error('paw side alignment fix is incomplete');
}
if (!mutualPaw.includes('MY_MUTUAL_PAW') || !mutualPaw.includes('shell.paw.receive')) {
  throw new Error('mutual paw protocol is incomplete');
}
if (!lexicon.includes('ibmy.interaction.lexicon.v1') || !lexicon.includes('sendInteraction') || !lexicon.includes('receiveInteraction') || !lexicon.includes('body_target')) {
  throw new Error('shared interaction lexicon is incomplete');
}
if (!protocolV2.includes('MY_INTERACTION_RUNTIME') || !protocolV2.includes('body_target') || !protocolV2.includes('receiveInteraction') || !protocolV2.includes('interaction-lexicon-change')) {
  throw new Error('dynamic interaction protocol v2 is incomplete');
}
if (!streamFast.includes('requestAnimationFrame') || !streamFast.includes('ibmy.paw.v2.processed.v1') || !streamFast.includes('receiveInteraction') || !streamFast.includes('removeMarkerTail')) {
  throw new Error('streamed paw acceleration layer is incomplete');
}
if (!threadV2.includes('MY_SHARED_INTERACTION_IDENTITY_V2') || !threadV2.includes('systemPrompt') || !threadV2.includes('interaction-lexicon-change')) {
  throw new Error('Codex interaction thread sync v2 is incomplete');
}
if (!chatPolish.includes('my-compose-confirm') || !chatPolish.includes('my-model-pill')) {
  throw new Error('chat polish layer is incomplete');
}
if (!chatPolish.includes('my-compose-edit') || !chatPolish.includes('saveLexicon') || !editorCss.includes('my-compose-editor-row')) {
  throw new Error('editable interaction composer is incomplete');
}
if (!gatewayUi.includes('/v1/codex/login/device') || !gatewayUi.includes('登录 ChatGPT')) {
  throw new Error('Codex device-login UI is incomplete');
}
if (!gatewayDefaults.includes('codex-gateway-v2-production.up.railway.app')) {
  throw new Error('MY gateway defaults are not pointing at Railway v2');
}
if (!codexBridge.includes('AsyncCodex') || !codexBridge.includes('login_chatgpt_device_code')) {
  throw new Error('gateway is not using the official Codex SDK login flow');
}
if (!gatewayApp.includes('/v1/codex/login/device') || !gatewayApp.includes('logged_in')) {
  throw new Error('gateway API is missing Codex login/status wiring');
}
if (!requirements.includes('openai-codex')) {
  throw new Error('gateway requirements are missing openai-codex');
}

const manifest = JSON.parse(manifestText);
const catalog = JSON.parse(catalogText);
if (!manifest.name || !manifest.short_name || !manifest.start_url) throw new Error('PWA manifest is incomplete');
if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) throw new Error('PWA icons are incomplete');
if (!Array.isArray(catalog.apps)) throw new Error('apps/catalog.json has no apps array');

console.log(`IB MY synced baseline OK: ${requiredFiles.length} files, ${catalog.apps.length} app(s), native-sided paw alignment + fast streamed paw actions + upstream native avatars + dynamic interaction protocol/thread v2 + editable shared interactions + chat polish + mutual paw + official Codex login enabled`);
