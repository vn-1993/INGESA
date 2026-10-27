/* INGESA Firestore read meter v4 — stable TV identity plus iframe bridge, client-side estimate only. */
(function (global) {
  'use strict';
  if (global.INGESA_QUOTA_METER?.version === 4) return;

  const PROTOCOL = 1;
  const HELLO = 'INGESA_QUOTA_BRIDGE_HELLO';
  const ACK = 'INGESA_QUOTA_BRIDGE_ACK';
  const REPORT = 'INGESA_QUOTA_BRIDGE_REPORT';
  const chainMethods = new Set(['collection', 'collectionGroup', 'doc', 'where', 'orderBy', 'limit', 'startAt', 'startAfter', 'endAt', 'endBefore', 'select', 'withConverter']);
  const installedDbs = new WeakMap();

  const normalizeAppKey = value => String(value || 'app').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'app';
  const safeUser = () => {
    try {
      const bridge = global.INGESA_TV;
      const deviceId = bridge && typeof bridge.getDeviceId === 'function' ? String(bridge.getDeviceId() || '').trim() : '';
      if (deviceId) { let label = ''; try { label = global.localStorage.getItem(`ingesa_tv_name_${deviceId}`) || ''; } catch (e) {} return { id: `TV_${deviceId}`, name: label || `Pantalla TV ${deviceId.slice(-6)}`, role: 'TELEVISOR', deviceId }; }
      const user = JSON.parse(global.localStorage.getItem('ingesa_logged_user') || 'null');
      const id = String(user?.id || user?.uid || user?.username || user?.name || '').trim();
      return id ? { id, name: String(user?.name || id), role: String(user?.role || '') } : null;
    } catch (e) { return null; }
  };
  const countInitialSnapshot = snap => Array.isArray(snap?.docs) ? Math.max(1, snap.docs.length) : 1;
  const METER_ICON = 'data:image/png;base64,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';

  function install(db, appName) {
    if (!db || typeof db.collection !== 'function') return db;
    if (installedDbs.has(db)) return installedDbs.get(db);

    const rawCollection = db.collection.bind(db);
    const rawDoc = typeof db.doc === 'function' ? db.doc.bind(db) : null;
    const rawCollectionGroup = typeof db.collectionGroup === 'function' ? db.collectionGroup.bind(db) : null;
    const FieldValue = global.firebase?.firestore?.FieldValue;
    const localAppKey = normalizeAppKey(appName || global.document?.title || 'app');
    const pending = new Map();
    const preConfiguration = new Map();
    const proxyCache = new WeakMap();
    const frameApps = new WeakMap();
    const embedded = !!(global.parent && global.parent !== global);
    let enabled = false;
    let configKnown = false;
    let totalReported = 0;
    let totalPersisted = 0;
    let localVisualReads = 0;
    let meterWidget = null;
    function renderMeterWidget() {
      if (!global.document?.body || meterWidget) return;
      const style = global.document.createElement('style');
      style.textContent = '.ingesa-local-meter{position:fixed;right:12px;bottom:12px;z-index:2147483000;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(101,186,255,.38);border-radius:12px;background:rgba(5,20,38,.94);color:#f6faff;box-shadow:0 8px 24px rgba(0,0,0,.24);font:700 11px/1.1 Inter,system-ui,sans-serif;backdrop-filter:blur(8px)}.ingesa-local-meter img{width:24px;height:24px;object-fit:contain;border-radius:6px}.ingesa-local-meter b{display:block;color:#fff;font-size:12px}.ingesa-local-meter small{display:block;color:#9db1c8;font-weight:600;margin-top:2px}.ingesa-local-meter button{border:0;background:transparent;color:#ff8bb6;cursor:pointer;font-weight:900;padding:2px 3px}.ingesa-local-meter button:hover{color:#fff}';
      global.document.head.appendChild(style);
      meterWidget = global.document.createElement('div'); meterWidget.className = 'ingesa-local-meter';
      meterWidget.innerHTML = '<img alt="Medición" src="' + METER_ICON + '"><div><b id="ingesaLocalReads">0 lecturas</b><small id="ingesaLocalReadsMeta">Desde que se abrió este módulo</small></div><button type="button" id="ingesaResetReads" title="Reiniciar contador local">↺</button>';
      global.document.body.appendChild(meterWidget);
      meterWidget.querySelector('#ingesaResetReads').onclick = () => { localVisualReads = 0; totalReported = 0; totalPersisted = 0; updateMeterWidget(); };
      updateMeterWidget();
      if (typeof global.setInterval === 'function') global.setInterval(updateMeterWidget, 1000);
    }
    function updateMeterWidget() {
      if (!meterWidget) return;
      const value = meterWidget.querySelector('#ingesaLocalReads'); const meta = meterWidget.querySelector('#ingesaLocalReadsMeta');
      if (value) value.textContent = `${localVisualReads.toLocaleString('es-MX')} lecturas`;
      if (meta) meta.textContent = `Desde que se abrió · ${Math.round((Date.now() - startedAt) / 1000)} s`;
    }
    const startedAt = Date.now();
    const notify = (units, sourceApp, persisted = false) => {
      const count = Math.max(0, Math.floor(Number(units) || 0));
      if (!persisted) localVisualReads += count;
      totalReported += persisted ? 0 : count;
      totalPersisted += persisted ? count : 0;
      updateMeterWidget();
      try { global.dispatchEvent(new CustomEvent('INGESA_QUOTA_METER_REPORT', { detail: { units: count, app: normalizeAppKey(sourceApp || localAppKey), persisted, totalReported, totalPersisted, localVisualReads } })); } catch (e) {}
    };
    let localStarted = false;
    let bridgeMode = embedded ? 'pending' : 'local';
    let bridgeTimer = null;
    let configUnsub = null;

    if (global.document?.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', renderMeterWidget, { once: true }); else renderMeterWidget();

    const dayKey = () => new Date().toISOString().slice(0, 10);
    const makeDocId = (date, uid) => `${date}__${encodeURIComponent(uid).slice(0, 900)}`;

    function flushOne(key) {
      const bucket = pending.get(key);
      if (!bucket || bucket.busy || !bucket.reads || !FieldValue?.increment) return;
      const appCounts = { ...bucket.readsByApp };
      const reads = Object.values(appCounts).reduce((sum, value) => sum + value, 0);
      if (!reads) return;
      notify(reads, localAppKey, true);
      bucket.reads = 0;
      bucket.readsByApp = Object.create(null);
      bucket.busy = true;
      const ref = rawCollection('firestore_quota_usage').doc(makeDocId(bucket.date, bucket.user.id));
      const readsByApp = Object.fromEntries(Object.entries(appCounts).map(([key, value]) => [key, FieldValue.increment(value)]));
      ref.set({
        date: bucket.date,
        userId: bucket.user.id,
        userName: bucket.user.name,
        role: bucket.user.role,
        estimatedReads: FieldValue.increment(reads),
        meterWrites: FieldValue.increment(1),
        readsByApp,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true }).catch(e => {
        bucket.reads += reads;
        for (const [app, value] of Object.entries(appCounts)) bucket.readsByApp[app] = (bucket.readsByApp[app] || 0) + value;
        console.warn('[quota meter] no se pudo guardar el agregado', e?.code || e?.message || e);
      }).finally(() => {
        bucket.busy = false;
        if (bucket.reads >= 25) flushOne(key);
        else if (!bucket.reads) pending.delete(key);
      });
    }

    function flushAll() { for (const key of pending.keys()) flushOne(key); }

    function addToBucket(units, sourceApp) {
      const count = Math.max(0, Math.floor(Number(units) || 0));
      if (!count) return;
      if (!configKnown) {
        const app = normalizeAppKey(sourceApp || localAppKey);
        preConfiguration.set(app, (preConfiguration.get(app) || 0) + count);
        return;
      }
      if (!enabled) return;
      const user = safeUser();
      if (!user) return;
      const date = dayKey();
      const key = `${date}::${user.id}`;
      const bucket = pending.get(key) || { date, user, reads: 0, readsByApp: Object.create(null), busy: false };
      bucket.user = user;
      const app = normalizeAppKey(sourceApp || localAppKey);
      bucket.reads += count;
      bucket.readsByApp[app] = (bucket.readsByApp[app] || 0) + count;
      pending.set(key, bucket);
      if (bucket.reads >= 25) flushOne(key);
    }

    function sendReport(units, sourceApp) {
      const count = Math.max(0, Math.floor(Number(units) || 0));
      if (!count) return;
      const app = normalizeAppKey(sourceApp || localAppKey);
      notify(count, app, false);
      if (!embedded || bridgeMode === 'local') { addToBucket(count, app); return; }
      if (bridgeMode === 'pending') {
        preConfiguration.set(app, (preConfiguration.get(app) || 0) + count);
        return;
      }
      try { global.parent.postMessage({ type: REPORT, protocol: PROTOCOL, app, units: count }, '*'); }
      catch (e) { /* Do not break the business screen if the host refuses messaging. */ }
    }

    function startLocalMeter() {
      if (localStarted) return;
      localStarted = true;
      try {
        configUnsub = rawCollection('launcher_settings').doc('firestore_quota_monitor').onSnapshot(doc => {
          if (doc?.metadata?.fromCache === true) return;
          const next = !!(doc.exists && doc.data()?.enabled === true);
          const wasEnabled = enabled;
          configKnown = true;
          if (wasEnabled && !next) flushAll();
          enabled = next;
          const queued = Array.from(preConfiguration.entries());
          preConfiguration.clear();
          if (enabled) queued.forEach(([app, count]) => addToBucket(count, app));
        }, e => {
          configKnown = true;
          enabled = false;
          preConfiguration.clear();
          console.warn('[quota meter] no se pudo leer el interruptor', e?.code || e?.message || e);
        });
        if (typeof global.setInterval === 'function') global.setInterval(flushAll, 60000);
        if (typeof global.addEventListener === 'function') global.addEventListener('pagehide', flushAll);
        global.document?.addEventListener?.('visibilitychange', () => {
          if (global.document.visibilityState === 'hidden') flushAll();
        });
      } catch (e) {
        configKnown = true;
        enabled = false;
        console.warn('[quota meter] no se pudo inicializar', e?.code || e?.message || e);
      }
    }

    function isLiveFrame(source) {
      if (!source || !global.document?.querySelectorAll) return false;
      try { return Array.from(global.document.querySelectorAll('iframe')).some(frame => frame.contentWindow === source); }
      catch (e) { return false; }
    }

    function handleParentMessage(event) {
      const data = event?.data;
      const source = event?.source;
      if (!data || data.protocol !== PROTOCOL || !isLiveFrame(source)) return;
      if (data.type === HELLO) {
        frameApps.set(source, normalizeAppKey(data.app || 'iframe'));
        try { source.postMessage({ type: ACK, protocol: PROTOCOL }, '*'); } catch (e) {}
        return;
      }
      if (data.type === REPORT && frameApps.has(source)) {
        sendReport(data.units, frameApps.get(source));
      }
    }

    function activateLocalFallback() {
      if (bridgeMode !== 'pending') return;
      bridgeMode = 'local';
      if (bridgeTimer) global.clearTimeout(bridgeTimer);
      global.removeEventListener?.('message', handleChildAck);
      startLocalMeter();
      const queued = Array.from(preConfiguration.entries());
      preConfiguration.clear();
      queued.forEach(([app, count]) => addToBucket(count, app));
    }

    function handleChildAck(event) {
      if (!embedded || event?.source !== global.parent || event?.data?.type !== ACK || event?.data?.protocol !== PROTOCOL) return;
      if (bridgeMode !== 'pending') return;
      bridgeMode = 'parent';
      if (bridgeTimer) global.clearTimeout(bridgeTimer);
      global.removeEventListener?.('message', handleChildAck);
      const queued = Array.from(preConfiguration.entries());
      preConfiguration.clear();
      for (const [app, count] of queued) {
        try { global.parent.postMessage({ type: REPORT, protocol: PROTOCOL, app, units: count }, '*'); } catch (e) {}
      }
    }

    global.addEventListener?.('message', handleParentMessage);
    if (embedded) {
      global.addEventListener?.('message', handleChildAck);
      try { global.parent.postMessage({ type: HELLO, protocol: PROTOCOL, app: localAppKey }, '*'); }
      catch (e) { activateLocalFallback(); }
      if (bridgeMode === 'pending' && typeof global.setTimeout === 'function') bridgeTimer = global.setTimeout(activateLocalFallback, 700);
      else if (bridgeMode === 'local') startLocalMeter();
    } else {
      startLocalMeter();
    }

    function queryChangeReads(snap) {
      if (Array.isArray(snap?.docs) && typeof snap.docChanges === 'function') {
        try {
          return snap.docChanges().filter(change => change.type === 'removed' || !change.doc?.metadata?.hasPendingWrites).length;
        } catch (e) {}
      }
      return 1;
    }

    function wrapListener(target, original, args) {
      const nextIndex = typeof args[0] === 'function' || typeof args[0]?.next === 'function' ? 0 :
        (typeof args[1] === 'function' || typeof args[1]?.next === 'function' ? 1 : -1);
      if (nextIndex < 0) return original.apply(target, args);
      const wrappedArgs = args.slice();
      const observer = wrappedArgs[nextIndex];
      let hasServerSnapshot = false;
      let lastDocFingerprint = null;
      const meterNext = snap => {
        const fromCache = snap?.metadata?.fromCache === true;
        const pendingWrite = snap?.metadata?.hasPendingWrites === true;
        if (!fromCache && !pendingWrite) {
          if (!hasServerSnapshot) {
            sendReport(countInitialSnapshot(snap), localAppKey);
            hasServerSnapshot = true;
            if (!Array.isArray(snap?.docs)) {
              try { lastDocFingerprint = JSON.stringify({ exists: snap.exists, data: snap.exists ? snap.data() : null }); } catch (e) { lastDocFingerprint = ''; }
            }
          } else if (Array.isArray(snap?.docs) && typeof snap.docChanges === 'function') {
            sendReport(queryChangeReads(snap), localAppKey);
          } else {
            let fingerprint = '';
            try { fingerprint = JSON.stringify({ exists: snap.exists, data: snap.exists ? snap.data() : null }); } catch (e) { fingerprint = String(Date.now()); }
            if (fingerprint !== lastDocFingerprint) sendReport(1, localAppKey);
            lastDocFingerprint = fingerprint;
          }
        }
        if (typeof observer === 'function') observer(snap);
        else if (observer && typeof observer.next === 'function') observer.next(snap);
      };
      if (typeof observer === 'function') wrappedArgs[nextIndex] = meterNext;
      else wrappedArgs[nextIndex] = { ...observer, next: meterNext };
      return original.apply(target, wrappedArgs);
    }

    function wrapRef(ref) {
      if (!ref || (typeof ref !== 'object' && typeof ref !== 'function')) return ref;
      if (proxyCache.has(ref)) return proxyCache.get(ref);
      const proxy = new Proxy(ref, {
        get(target, prop) {
          const value = Reflect.get(target, prop, target);
          if (prop === 'get' && typeof value === 'function') {
            return (...args) => Promise.resolve(value.apply(target, args)).then(snap => {
              if (!(args[0] && args[0].source === 'cache') && snap?.metadata?.fromCache !== true) sendReport(countInitialSnapshot(snap), localAppKey);
              return snap;
            });
          }
          if (prop === 'onSnapshot' && typeof value === 'function') return (...args) => wrapListener(target, value, args);
          if (chainMethods.has(prop) && typeof value === 'function') return (...args) => wrapRef(value.apply(target, args));
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
      proxyCache.set(ref, proxy);
      return proxy;
    }

    const proxyDb = new Proxy(db, {
      get(target, prop) {
        if (prop === 'collection') return (...args) => wrapRef(rawCollection(...args));
        if (prop === 'doc' && rawDoc) return (...args) => wrapRef(rawDoc(...args));
        if (prop === 'collectionGroup' && rawCollectionGroup) return (...args) => wrapRef(rawCollectionGroup(...args));
        if (prop === 'runTransaction' && typeof target.runTransaction === 'function') {
          return (updateFunction, options) => target.runTransaction(transaction => {
            const txProxy = new Proxy(transaction, {
              get(tx, txProp) {
                const method = Reflect.get(tx, txProp, tx);
                if (txProp === 'get' && typeof method === 'function') return (...args) => Promise.resolve(method.apply(tx, args)).then(snap => { sendReport(countInitialSnapshot(snap), localAppKey); return snap; });
                if (txProp === 'getAll' && typeof method === 'function') return (...args) => Promise.resolve(method.apply(tx, args)).then(snaps => { (snaps || []).forEach(snap => sendReport(countInitialSnapshot(snap), localAppKey)); return snaps; });
                return typeof method === 'function' ? method.bind(tx) : method;
              }
            });
            return updateFunction(txProxy);
          }, options);
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });

    try { installedDbs.set(db, proxyDb); } catch (e) {}
    return proxyDb;
  }

  global.INGESA_QUOTA_METER = { version: 4, install, getStatus: () => ({ totalReported, totalPersisted, enabled, configKnown }) };
})(window);
