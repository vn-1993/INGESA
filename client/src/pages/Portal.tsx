// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import '../portal.css';

const BRAND_LOGO_URL = "https://raw.githubusercontent.com/vn-1993/INGESA/refs/heads/main/BackgroundEraser_20260905_105915967.png";

// =================== PALETAS DE COLOR (basadas en el logo) ===================
const PALETTES = [
  {
    id: 'rosa', name: 'Rosa', swatch: '#e62b70',
    light: { bgBase: '#f9fafb', bgSurface: '#ffffff', bgSurfaceAlt: '#f3f4f6', textMain: '#111827', textMuted: '#6b7280', border: '#e5e7eb', accent: '#e62b70', accentHover: '#c91f5d' },
    dark:  { bgBase: '#111827', bgSurface: '#1f2937', bgSurfaceAlt: '#374151', textMain: '#f9fafb', textMuted: '#9ca3af', border: '#374151', accent: '#e62b70', accentHover: '#f64b89' }
  },
  {
    id: 'negro', name: 'Negro', swatch: '#111111',
    light: { bgBase: '#f7f7f8', bgSurface: '#ffffff', bgSurfaceAlt: '#ececec', textMain: '#0a0a0a', textMuted: '#6b6b6b', border: '#dcdcdc', accent: '#111111', accentHover: '#000000' },
    dark:  { bgBase: '#0a0a0a', bgSurface: '#171717', bgSurfaceAlt: '#262626', textMain: '#fafafa', textMuted: '#a3a3a3', border: '#2e2e2e', accent: '#111111', accentHover: '#000000' }
  },
  {
    id: 'azul', name: 'Azul', swatch: '#1d4ed8',
    light: { bgBase: '#f8fafc', bgSurface: '#ffffff', bgSurfaceAlt: '#e2e8f0', textMain: '#0f172a', textMuted: '#64748b', border: '#cbd5e1', accent: '#1d4ed8', accentHover: '#1e40af' },
    dark:  { bgBase: '#0f172a', bgSurface: '#1e293b', bgSurfaceAlt: '#334155', textMain: '#f8fafc', textMuted: '#94a3b8', border: '#334155', accent: '#1d4ed8', accentHover: '#2563eb' }
  },
  {
    id: 'morado', name: 'Morado', swatch: '#6d28d9',
    light: { bgBase: '#fafafa', bgSurface: '#ffffff', bgSurfaceAlt: '#ede9fe', textMain: '#18181b', textMuted: '#71717a', border: '#ddd6fe', accent: '#6d28d9', accentHover: '#5b21b6' },
    dark:  { bgBase: '#181025', bgSurface: '#26183d', bgSurfaceAlt: '#3b2361', textMain: '#faf5ff', textMuted: '#c4b5fd', border: '#4c1d95', accent: '#6d28d9', accentHover: '#7c3aed' }
  },
  {
    id: 'verde', name: 'Verde', swatch: '#047857',
    light: { bgBase: '#f8faf9', bgSurface: '#ffffff', bgSurfaceAlt: '#d1fae5', textMain: '#10221a', textMuted: '#64748b', border: '#a7f3d0', accent: '#047857', accentHover: '#065f46' },
    dark:  { bgBase: '#071a14', bgSurface: '#0f2b22', bgSurfaceAlt: '#164e3b', textMain: '#ecfdf5', textMuted: '#a7f3d0', border: '#166534', accent: '#047857', accentHover: '#059669' }
  },
  {
    id: 'rojo', name: 'Rojo', swatch: '#b91c1c',
    light: { bgBase: '#fffafa', bgSurface: '#ffffff', bgSurfaceAlt: '#fee2e2', textMain: '#1c1917', textMuted: '#78716c', border: '#fecaca', accent: '#b91c1c', accentHover: '#991b1b' },
    dark:  { bgBase: '#1c0b0b', bgSurface: '#331313', bgSurfaceAlt: '#571b1b', textMain: '#fff7f7', textMuted: '#fecaca', border: '#7f1d1d', accent: '#b91c1c', accentHover: '#dc2626' }
  },
  {
    id: 'vino', name: 'Vino', swatch: '#831843',
    light: { bgBase: '#fff8fb', bgSurface: '#ffffff', bgSurfaceAlt: '#fce7f3', textMain: '#1f1018', textMuted: '#9d174d', border: '#fbcfe8', accent: '#831843', accentHover: '#701a3c' },
    dark:  { bgBase: '#200914', bgSurface: '#3b1024', bgSurfaceAlt: '#5b1537', textMain: '#fff1f7', textMuted: '#f9a8d4', border: '#831843', accent: '#831843', accentHover: '#9d174d' }
  }
];

// =================== MOTORES DE COMPRESIÓN ===================
const comprimirImagen = (fileOrBase64, isFile = true) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 900;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
            canvas.height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/webp', 0.6);
            resolve(dataUrl);
        };
        img.src = isFile ? URL.createObjectURL(fileOrBase64) : fileOrBase64;
    });
};

// =================== UTILIDADES GENERALES ===================
const useBackBlocker = () => {
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    let lastPopTime = 0;
    const handlePopState = (e) => {
      const now = Date.now();
      if (now - lastPopTime < 800) { window.history.go(-2); } 
      else {
        window.history.pushState(null, "", window.location.href);
        lastPopTime = now;
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  return showToast;
};

const Emoji = ({ symbol, size = 18, className = '' }) => (
  <span className={`inline-flex items-center justify-center ${className}`} style={{ fontSize: size }}>
    {symbol || '📁'}
  </span>
);

const BrandLogo = ({ size = 'normal' }) => (
  <div className={size === 'lg' ? 'brand-logo-flat brand-logo-lg-wrap' : 'brand-logo-flat'}>
    <img src={BRAND_LOGO_URL} alt="INGESA" className={size === 'lg' ? 'brand-logo-lg' : 'brand-logo-box'} />
  </div>
);

const AccentPickerModal = ({ activeIndex, onSelect, onClose }) => (
  <div className="fixed inset-0 z-[300] accent-modal-backdrop flex items-start justify-center p-5 pt-24" onClick={onClose}>
    <div className="bg-surface border border-main rounded-2xl shadow-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="text-lg font-bold text-main">Color de acento</h2><p className="text-xs text-muted mt-1">Se aplicará al logo y a la pestaña activa.</p></div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-alt text-main border border-main">✕</button>
      </div>
      <div className="grid grid-cols-4 gap-5 justify-items-center">
        {PALETTES.map((p, i) => (
          <button key={p.id} title={p.name} aria-label={p.name} onClick={() => { onSelect(i); onClose(); }} className={`accent-swatch ${activeIndex === i ? 'active' : ''}`} style={{ background: p.swatch }} />
        ))}
      </div>
      <div className="mt-5 text-center text-xs text-muted">{PALETTES[activeIndex]?.name || 'Rosa'}</div>
    </div>
  </div>
);

const AccentControls = ({ isDark, onToggleDark, onOpenAccent }) => (
  <div className="control-dock" aria-label="Controles de apariencia">
    <button onClick={onOpenAccent} className="rainbow-button" title="Elegir color de acento" aria-label="Elegir color de acento" />
    <button onClick={onToggleDark} className="rounded-full border border-main bg-surface hover:bg-main hover:text-white transition-colors flex items-center justify-center relative shrink-0" title="Cambiar tema" aria-label="Cambiar tema"><Emoji symbol={isDark ? '☀️' : '🌙'} size={14} /></button>
  </div>
);

// =================== COMPONENTES DE PANTALLA ===================
const WelcomeScreen = ({ user, onComplete }) => {
  useEffect(() => { const timer = setTimeout(onComplete, 2500); return () => clearTimeout(timer); }, [onComplete]);
  const greeting = user.gender === 'F' ? 'Bienvenida' : 'Bienvenido';
  return (
    <div className="fixed inset-0 bg-base z-[999] flex flex-col items-center justify-center">
      <div className="relative mb-6 z-10">
        <svg className="absolute -inset-4 w-[140px] h-[140px] spin-ring text-accent" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="15 10">
          <circle cx="50" cy="50" r="46"/>
        </svg>
        <div className="w-24 h-24 rounded-full border border-main shadow-lg overflow-hidden bg-surface relative z-10 flex items-center justify-center">
          {user.avatar ? ( <img src={user.avatar} className="w-full h-full object-cover block" /> ) : ( <div className="w-full h-full flex items-center justify-center bg-accent text-white font-bold text-4xl">{user.name.charAt(0).toUpperCase()}</div> )}
        </div>
        {user.roleEmoji && (
          <div className="absolute bottom-0 right-0 z-20 bg-surface border border-main rounded-full w-8 h-8 flex items-center justify-center text-lg shadow-sm">
            {user.roleEmoji}
          </div>
        )}
      </div>
      <h1 className="text-3xl font-bold text-main mb-1 tracking-tight">{greeting}</h1>
      <h2 className="text-xl font-medium text-muted">{user.name}</h2>
      {user.role && <p className="text-sm font-semibold text-accent mt-2 uppercase tracking-wide">{user.role}</p>}
    </div>
  );
};

const UserSelection = ({ users, currentUser, onLogin, onLogout, onClose }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const regularUsers = users.filter(user => {
    const role = String(user?.role || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return !role.includes('root') && !role.includes('dev');
  });

  const handleKey = async (num) => {
    if (error) { setError(false); setPin(''); }
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setBusy(true);
        const authenticated = await onLogin(selectedUser.id, newPin);
        setBusy(false);
        if (!authenticated) { setError(true); setTimeout(() => setPin(''), 500); }
      }
    }
  };

  if (selectedUser) {
    return (
      <div className="fixed inset-0 bg-base z-[150] flex flex-col items-center justify-center p-4">
        <div className="card-box w-full max-w-sm p-8 flex flex-col items-center">
          <button onClick={() => { setSelectedUser(null); setPin(''); setError(false); }} className="self-start text-muted hover:text-main mb-6 font-medium flex items-center gap-2 transition-colors">
            <Emoji symbol="⬅️" size={14}/> Volver
          </button>
          
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full border border-main overflow-hidden bg-surface shadow-sm">
               {selectedUser.avatar ? <img src={selectedUser.avatar} className="w-full h-full object-cover block"/> : <div className="w-full h-full bg-accent flex items-center justify-center font-bold text-3xl text-white">{selectedUser.name.charAt(0)}</div>}
            </div>
            {selectedUser.roleEmoji && (
              <div className="absolute -bottom-1 -right-1 bg-surface border border-main rounded-full w-7 h-7 flex items-center justify-center text-sm shadow-sm">
                {selectedUser.roleEmoji}
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-main mb-1 text-center">{selectedUser.name}</h2>
          <p className="text-xs font-semibold text-accent mb-6 uppercase tracking-wider text-center">{selectedUser.role || 'Usuario'}</p>
          
          <div className="flex gap-4 mb-8">
            {[0,1,2,3].map(i => (<div key={i} className={`w-4 h-4 rounded-full transition-colors duration-200 ${i < pin.length ? 'bg-accent' : 'bg-surface-alt border border-main'} ${error ? 'animate-bounce bg-red-500 border-red-500' : ''}`}></div>))}
          </div>
          
          <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
            {['1','2','3','4','5','6','7','8','9'].map(n => (<button key={n} onClick={() => handleKey(n)} disabled={busy} className="btn-base btn-ghost py-4 text-xl">{n}</button>))}
            <button onClick={() => setPin(p => p.slice(0,-1))} disabled={busy} className="btn-base btn-ghost py-4 text-sm font-medium">Borrar</button>
            <button onClick={() => handleKey('0')} disabled={busy} className="btn-base btn-ghost py-4 text-xl">0</button>
            <div></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-base z-[150] flex flex-col items-center p-6 overflow-y-auto">
      <div className="w-full max-w-4xl flex justify-between items-center mb-10 mt-6">
         <BrandLogo size="lg" />
         {currentUser && <button onClick={onClose} className="w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-main shadow-sm hover:bg-surface-alt transition-colors"><Emoji symbol="✖️" size={12}/></button>}
      </div>
      
      <div className="w-full max-w-4xl text-center mb-10">
        <h2 className="text-3xl font-bold text-main">Seleccionar Perfil</h2>
        <p className="text-sm font-medium mt-2 text-muted">Ingresa a tu cuenta para acceder a las herramientas asignadas.</p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-4xl">
        <button onClick={() => { onLogout(); onClose(); }} className="card-box p-6 flex flex-col items-center gap-4 hover:-translate-y-1 hover:border-accent hover:shadow-md cursor-pointer">
           <div className="relative">
             <div className="w-16 h-16 rounded-full border border-main overflow-hidden bg-surface-alt flex items-center justify-center">
               <Emoji symbol="👤" size={24} />
             </div>
             <div className="absolute -bottom-1 -right-1 bg-surface border border-main rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm">
               🚶
             </div>
           </div>
           <div className="text-center w-full">
             <span className="font-semibold text-sm text-main truncate block">Invitado</span>
             <span className="text-[10px] text-muted font-medium block uppercase mt-0.5">Visita</span>
           </div>
        </button>

        {regularUsers.map(u => (
          <button key={u.id} onClick={() => setSelectedUser(u)} className="card-box p-6 flex flex-col items-center gap-4 hover:-translate-y-1 hover:border-accent hover:shadow-md cursor-pointer">
             <div className="relative">
               <div className="w-16 h-16 rounded-full border border-main overflow-hidden bg-surface-alt">
                  {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover block"/> : <div className="w-full h-full bg-accent flex items-center justify-center font-bold text-2xl text-white">{u.name.charAt(0)}</div>}
               </div>
               {u.roleEmoji && (
                  <div className="absolute -bottom-1 -right-1 bg-surface border border-main rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm">
                    {u.roleEmoji}
                  </div>
               )}
             </div>
             <div className="text-center w-full">
               <span className="font-semibold text-sm text-main truncate block">{u.name}</span>
               <span className="text-[10px] text-accent font-medium truncate block uppercase mt-0.5">{u.role || 'Usuario'}</span>
             </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// =================== PUENTE DE SESIÓN HACIA MÓDULOS HTML ===================
const ModuleFrame = ({ tool, currentUser, scannerMode = false }) => {
  const frameRef = useRef(null);
  const sendContext = () => {
    const user = currentUser || {};
    frameRef.current?.contentWindow?.postMessage({
      type: 'INDEX_CONTEXT',
      payload: {
        id: user.id || '',
        name: user.name || '',
        role: user.role || 'operador',
        department: user.department || user.departamento || user.area || '',
        departamento: user.department || user.departamento || user.area || '',
        allowedTools: user.allowedTools || [],
        scannerMode: !!scannerMode,
        scannerToolId: tool?.id || '',
        scannerToolName: tool?.name || ''
      }
    }, '*');
  };
  useEffect(() => { sendContext(); }, [currentUser, tool?.id, scannerMode]);
  return <iframe ref={frameRef} onLoad={sendContext} key={tool.id} srcDoc={tool.rawHtml} className="module-frame" title={tool.name || 'Módulo'}></iframe>;
};

// =================== APP PRINCIPAL ===================
const App = () => {
  const [users, setUsers] = useState([]);
  const [tools, setTools] = useState([]);
  const [tabOrder, setTabOrder] = useState([]);
  const [guestAccess, setGuestAccess] = useState({ allowedTools: [] });
  const [adminTabVisibility, setAdminTabVisibility] = useState(null);
  
  const [currentUser, setCurrentUser] = useState(null); 
  const [showWelcome, setShowWelcome] = useState(false);
  const [tab, setTab] = useState(null);
  const [activeSubTabs, setActiveSubTabs] = useState({});
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [showAccentPicker, setShowAccentPicker] = useState(false);
  const handleAvatarClick = () => { setShowUserSwitcher(true); };

  const showExitToast = useBackBlocker();

  useEffect(() => {
    let active = true;
    fetch('/api/portal/bootstrap', { credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error('No se pudo cargar el portal');
        return response.json();
      })
      .then(data => {
        if (!active) return;
        setUsers(data.users || []);
        setTools(data.tools || []);
        setTabOrder(data.tabOrder || []);
        setGuestAccess(data.guestAccess || { allowedTools: [] });
        setAdminTabVisibility(data.adminTabVisibility || null);
        if (data.currentUser) {
          setCurrentUser(data.currentUser);
          localStorage.setItem('ingesa_logged_user', JSON.stringify(data.currentUser));
        } else {
          localStorage.removeItem('ingesa_logged_user');
        }
        if (data.isReady === false) console.warn('El portal no está configurado');
      })
      .catch(error => {
        console.error('Error cargando el portal', error);
      });
    const savedTheme = localStorage.getItem('ingesa_dark_theme');
    if (savedTheme === 'true') setIsDark(true);
    const savedPalette = localStorage.getItem('ingesa_palette_index');
    if (savedPalette !== null && PALETTES[Number(savedPalette)]) setPaletteIndex(Number(savedPalette));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const palette = PALETTES[paletteIndex] || PALETTES[0];
    const vars = isDark ? palette.dark : palette.light;
    const root = document.documentElement;
    root.style.setProperty('--bg-base', vars.bgBase);
    root.style.setProperty('--bg-surface', vars.bgSurface);
    root.style.setProperty('--bg-surface-alt', vars.bgSurfaceAlt);
    root.style.setProperty('--text-main', vars.textMain);
    root.style.setProperty('--text-muted', vars.textMuted);
    root.style.setProperty('--border-main', vars.border);
    root.style.setProperty('--accent', vars.accent);
    root.style.setProperty('--accent-hover', vars.accentHover);
    document.getElementById('meta-theme-color').setAttribute('content', vars.bgBase);
    if (isDark) document.body.classList.add('dark-theme'); else document.body.classList.remove('dark-theme');
    localStorage.setItem('ingesa_dark_theme', isDark);
    localStorage.setItem('ingesa_palette_index', paletteIndex);
  }, [isDark, paletteIndex]);

  const normalizedRole = String(currentUser?.role || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const rootTool = tools.find(t => String(t.name || '').trim().toLowerCase() === 'root');
  const hasRootTabAccess = !!currentUser && !!rootTool && (currentUser.allowedTools || []).includes(rootTool.id);
  const isRootUser = !!currentUser && (normalizedRole.includes('root') || hasRootTabAccess);
  const isNonRootAdmin = !!currentUser && !isRootUser && (normalizedRole.includes('admin') || normalizedRole.includes('dev'));
  const adminAllowedIds = Array.isArray(adminTabVisibility?.allowedTools) ? adminTabVisibility.allowedTools : null;
  const canAdminSeeTool = (tool) => !isNonRootAdmin || !adminAllowedIds || adminAllowedIds.includes(tool?.id);

  const VISIBLE_TABS = useMemo(() => {
    let allowedIds = [];
    if (!currentUser) allowedIds = guestAccess.allowedTools || [];
    else allowedIds = currentUser.allowedTools || [];
    
    let allowed = tools.filter(t => String(t?.name || '').trim().toLowerCase() !== 'root' && allowedIds.includes(t.id));
    if (isNonRootAdmin && adminAllowedIds) {
      allowed = allowed.filter(t => adminAllowedIds.includes(t.id));
    }
    const individualOrder = currentUser?.tabOrder || [];
    const effectiveOrder = individualOrder.length ? individualOrder : tabOrder;
    
    return allowed.sort((a, b) => {
      const idxA = effectiveOrder.indexOf(a.id);
      const idxB = effectiveOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }, [tools, tabOrder, currentUser, guestAccess, adminTabVisibility, isNonRootAdmin, adminAllowedIds, isRootUser]);

  const activeTopTool = VISIBLE_TABS.find(t => t.id === tab);
  const activeChildTools = activeTopTool?.isGroup ? (activeTopTool.childToolIds || []).map(id => tools.find(t => t.id === id)).filter(Boolean) : [];
  const activeModuleTool = activeTopTool?.isGroup ? (activeChildTools.find(t => t.id === activeSubTabs[activeTopTool.id]) || activeChildTools[0]) : activeTopTool;
  const isScannerTool = /esc[aá]ner|scanner/i.test(String(activeModuleTool?.name || '')) || activeModuleTool?.scanner === true;
  const isPrivileged = normalizedRole.includes('admin') || normalizedRole.includes('root') || normalizedRole.includes('dev');
  const operatorScannerMode = !!currentUser && isScannerTool && !isPrivileged;

  useEffect(() => {
    if (VISIBLE_TABS.length > 0 && !VISIBLE_TABS.find(t => t.id === tab)) {
      setTab(VISIBLE_TABS[0].id);
      setActiveSubTabs({});
    }
    if (VISIBLE_TABS.length === 0 && tab !== null) {
      setTab(null);
      setActiveSubTabs({});
    }
  }, [VISIBLE_TABS, tab]);

  const handleLogin = async (userId, pin) => {
    try {
      const response = await fetch('/api/portal/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin })
      });
      if (!response.ok) return false;
      const latestUser = await response.json();
      setCurrentUser(latestUser);
      localStorage.setItem('ingesa_logged_user', JSON.stringify(latestUser));
      setShowUserSwitcher(false);
      setShowWelcome(true);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  useEffect(() => {
    if (currentUser) {
      const latest = users.find(u => u.id === currentUser.id);
      if (latest && JSON.stringify(latest) !== JSON.stringify(currentUser)) {
        setCurrentUser(latest);
        localStorage.setItem('ingesa_logged_user', JSON.stringify(latest));
      }
    }
  }, [users]);

  const handleLogout = () => {
    fetch('/api/portal/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    localStorage.removeItem('ingesa_logged_user');
    setCurrentUser(null);
    setShowUserSwitcher(false);
  };

  return (
    <div className={`h-full flex flex-col bg-base relative transition-colors duration-300 ${operatorScannerMode ? 'scanner-shell' : ''}`}>
      
      {showExitToast && (
         <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900 text-white rounded-lg shadow-lg px-6 py-3 font-semibold text-center toast-anim whitespace-nowrap text-sm">
           Presiona atrás 2 veces rápido para salir
         </div>
      )}

      {showWelcome && currentUser && ( <WelcomeScreen user={currentUser} onComplete={() => setShowWelcome(false)} /> )}
      
      {showAccentPicker && ( <AccentPickerModal activeIndex={paletteIndex} onSelect={setPaletteIndex} onClose={() => setShowAccentPicker(false)} /> )}
      {showUserSwitcher && ( <UserSelection users={users} currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} onClose={() => setShowUserSwitcher(false)} /> )}

      {/* HEADER PRINCIPAL */}
      <div className="portal-chrome bg-surface border-b border-main shrink-0 z-20 relative">
        <div className="p-4 flex items-center justify-between">
          
          <BrandLogo />
          
          <div className="flex items-center gap-3 sm:gap-5">
             <div className="text-xs text-right hidden sm:block">
                <div className="text-muted font-medium mb-0.5">{currentUser ? (currentUser.role || 'Operador') : 'Modo Invitado'}</div>
                <div className="portal-user-name font-semibold text-main truncate max-w-[150px]">{currentUser ? currentUser.name : 'Invitado'}</div>
             </div>

             <AccentControls isDark={isDark} onToggleDark={() => setIsDark(!isDark)} onOpenAccent={() => setShowAccentPicker(true)} />

             <button onClick={handleAvatarClick} title="Cambiar de usuario" className="relative shrink-0 transition-transform hover:scale-105">
                <div className="w-10 h-10 rounded-full border border-main overflow-hidden bg-surface-alt flex items-center justify-center">
                   {currentUser ? (currentUser.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover block" alt="Avatar"/> : <div className="w-full h-full bg-accent flex items-center justify-center font-bold text-white text-lg">{currentUser.name.charAt(0)}</div> ) : ( <Emoji symbol="👤" size={18} /> )}
                </div>
                {currentUser?.roleEmoji ? (
                   <div className="absolute -bottom-1 -right-1 bg-surface border border-main rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-sm">
                      {currentUser.roleEmoji}
                   </div>
                ) : (!currentUser && (
                   <div className="absolute -bottom-1 -right-1 bg-surface border border-main rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-sm">
                      🚶
                   </div>
                ))}
             </button>
          </div>
        </div>
        
        {/* PESTAÑAS PRINCIPALES */}
        {VISIBLE_TABS.length > 0 && (
          <div className="tab-bar hide-scrollbar px-2">
            {VISIBLE_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn ${tab === t.id ? 'active' : ''}`}>
                <span className="opacity-80"><Emoji symbol={t.emoji || '📁'} size={14}/></span>
                {t.name}
                {t.isGroup && <span className="ml-1 text-[10px] opacity-60">▼</span>}
              </button>
            ))}
          </div>
        )}

        {/* SUB-PESTAÑAS (Visible debajo de la barra principal si es un Grupo) */}
        {(() => {
          const activeTool = VISIBLE_TABS.find(t => t.id === tab);
          if (activeTool?.isGroup && activeTool.childToolIds?.length > 0) {
            const childTools = activeTool.childToolIds.map(id => tools.find(t => t.id === id)).filter(t => t && canAdminSeeTool(t));
            if (childTools.length === 0) return null;
            
            return (
              <div className="bg-surface-alt px-4 py-2 flex items-center gap-2 overflow-x-auto hide-scrollbar">
                <span className="text-[10px] font-bold text-muted tracking-widest mr-2 uppercase">Adjuntos</span>
                {childTools.map(sub => {
                  const isActive = activeSubTabs[activeTool.id] === sub.id || (!activeSubTabs[activeTool.id] && childTools[0].id === sub.id);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setActiveSubTabs(prev => ({...prev, [activeTool.id]: sub.id}))}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${isActive ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-main'}`}
                    >
                      <Emoji symbol={sub.emoji || '📄'} size={12}/>
                      <span>{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            );
          }
          return null;
        })()}
      </div>

      <div className="scanner-content flex-1 overflow-hidden relative bg-base">
        {VISIBLE_TABS.length === 0 ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 bg-surface border border-main rounded-2xl shadow-sm flex items-center justify-center mb-6 text-muted"><Emoji symbol="📭" size={32}/></div>
              <h2 className="text-2xl font-bold text-main mb-2">Sin acceso</h2>
              <p className="text-muted text-sm max-w-sm">Inicia sesión con un perfil autorizado para visualizar las herramientas del sistema.</p>
           </div>
        ) : (
           VISIBLE_TABS.map(t => {
             if (tab !== t.id) return null;

             if (t.isGroup) {
                 const childTools = t.childToolIds?.map(id => tools.find(tool => tool.id === id)).filter(tool => tool && canAdminSeeTool(tool)) || [];
                 if (!childTools.length) {
                    return (
                       <div key={t.id} className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                          <Emoji symbol="⚠️" size={40} className="mb-4 opacity-50 block mx-auto"/>
                          <h2 className="text-xl font-bold text-main mb-2">Grupo Vacío</h2>
                          <p className="text-muted text-sm">Este grupo no tiene herramientas configuradas.</p>
                       </div>
                    );
                 }
                 const activeSubId = activeSubTabs[t.id] || childTools[0].id;
                 const activeSubTool = childTools.find(child => child.id === activeSubId);
                 
                 if (!activeSubTool) return null;
                 if (!activeSubTool.rawHtml) {
                     return (
                        <div key={`${t.id}-${activeSubTool.id}`} className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                           <div className="card-box p-8 max-w-sm w-full">
                              <Emoji symbol="💻" size={40} className="mb-4 opacity-50 mx-auto block"/>
                              <h2 className="text-xl font-bold text-main mb-2 truncate">{activeSubTool.name}</h2>
                              <p className="text-muted text-sm">Esta pestaña adjunta está vacía. Requiere carga de código HTML.</p>
                           </div>
                        </div>
                     );
                 }
                 return <ModuleFrame key={`${t.id}-${activeSubTool.id}`} tool={activeSubTool} currentUser={currentUser} scannerMode={operatorScannerMode} />;
             }

             if (!t.rawHtml) {
                return (
                   <div key={t.id} className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                      <div className="card-box p-8 max-w-sm w-full">
                         <Emoji symbol="💻" size={40} className="mb-4 opacity-50 mx-auto block"/>
                         <h2 className="text-xl font-bold text-main mb-2 truncate">{t.name}</h2>
                         <p className="text-muted text-sm">Esta pestaña está vacía. Requiere carga de código HTML en el panel de administración.</p>
                      </div>
                   </div>
                );
             }
             return <ModuleFrame key={t.id} tool={t} currentUser={currentUser} scannerMode={operatorScannerMode} />;
         })
        )}
      </div>
    </div>
  );
};

export default App;
