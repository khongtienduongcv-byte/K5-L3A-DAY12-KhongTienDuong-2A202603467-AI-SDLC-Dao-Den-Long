import * as THREE from 'three';
import { GameEngine, round1 } from '../core/engine.js';
import { DEFAULT_TUNING } from '../core/constants.js';
import { getBrowserLeaderboard, addEntryToBrowser } from '../core/leaderboard.js';

// DOM Elements
const container = document.getElementById('game-container');
const flamesVal = document.getElementById('flames-val');
const nightTitle = document.getElementById('night-title');
const timeVal = document.getElementById('time-val');
const lanternsVal = document.getElementById('lanterns-val');
const scoreVal = document.getElementById('score-val');
const motesCount = document.getElementById('motes-count');
const moteSlotsContainer = document.getElementById('mote-slots');
const dashCdUi = document.getElementById('dash-cd-ui');
const pulseCdUi = document.getElementById('pulse-cd-ui');
const charmBadge = document.getElementById('charm-badge');
const charmCdUi = document.getElementById('charm-cd-ui');
const interactHint = document.getElementById('interact-hint');
const interactCount = document.getElementById('interact-count');
const notification = document.getElementById('notification');
const pauseOverlay = document.getElementById('pause-overlay');
const resumeBtn = document.getElementById('resume-btn');
const restartNightBtn = document.getElementById('restart-night-btn');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const overlayStats = document.getElementById('overlay-stats');
const restartBtn = document.getElementById('restart-btn');
const nextNightBtn = document.getElementById('next-night-btn');

// Phase 4 Accessibility & Leaderboard DOM
const hudSettingsBtn = document.getElementById('hud-settings-btn');
const subtitlesBanner = document.getElementById('subtitles-banner');
const edgePointerContainer = document.getElementById('edge-pointer-container');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const resetKeysBtn = document.getElementById('reset-keys-btn');
const keybindList = document.getElementById('keybind-list');
const keybindError = document.getElementById('keybind-error');
const reducedMotionCb = document.getElementById('reduced-motion-cb');
const largeFontCb = document.getElementById('large-font-cb');
const leaderboardModal = document.getElementById('leaderboard-modal');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const leaderboardBody = document.getElementById('leaderboard-body');
const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const saveScoreMsg = document.getElementById('save-score-msg');

let currentNight = 1;
let colorblindMode = false;
let reducedMotion = false;
let largeFont = false;

// Subtitles Banner Manager
let subtitleTimeout = null;
function showSubtitle(text, durationMs = 2800) {
  if (!subtitlesBanner) return;
  subtitlesBanner.innerText = text;
  subtitlesBanner.style.display = 'block';
  clearTimeout(subtitleTimeout);
  subtitleTimeout = setTimeout(() => {
    subtitlesBanner.style.display = 'none';
  }, durationMs);
}

// Keybindings Manager
const DEFAULT_KEYBINDS = {
  moveUp: { label: 'Di chuyển Lên', keys: ['KeyW', 'ArrowUp'] },
  moveDown: { label: 'Di chuyển Xuống', keys: ['KeyS', 'ArrowDown'] },
  moveLeft: { label: 'Di chuyển Trái', keys: ['KeyA', 'ArrowLeft'] },
  moveRight: { label: 'Di chuyển Phải', keys: ['KeyD', 'ArrowRight'] },
  jump: { label: 'Nhảy', keys: ['Space'] },
  dash: { label: 'Lướt', keys: ['ShiftLeft', 'KeyJ'] },
  interact: { label: 'Nạp / Châm đèn', keys: ['KeyE'] },
  pulse: { label: 'Tỏa sáng', keys: ['KeyQ'] },
  pause: { label: 'Tạm dừng', keys: ['Escape', 'KeyP'] }
};

let currentKeybinds = JSON.parse(JSON.stringify(DEFAULT_KEYBINDS));

function loadSettings() {
  try {
    const savedKeys = localStorage.getItem('dao_den_long_keybinds');
    if (savedKeys) {
      const parsed = JSON.parse(savedKeys);
      for (const k in parsed) {
        if (currentKeybinds[k]) currentKeybinds[k].keys = parsed[k].keys;
      }
    }
    reducedMotion = localStorage.getItem('dao_den_long_reduced_motion') === 'true';
    if (reducedMotionCb) reducedMotionCb.checked = reducedMotion;

    largeFont = localStorage.getItem('dao_den_long_large_font') === 'true';
    if (largeFontCb) largeFontCb.checked = largeFont;
    if (largeFont) document.body.classList.add('large-font');
  } catch {
    // fallback
  }
}

function saveKeybinds() {
  try {
    localStorage.setItem('dao_den_long_keybinds', JSON.stringify(currentKeybinds));
  } catch {}
}

let listeningAction = null;
function renderKeybindUI() {
  if (!keybindList) return;
  keybindList.innerHTML = '';
  for (const [action, data] of Object.entries(currentKeybinds)) {
    const row = document.createElement('div');
    row.className = 'keybind-row';
    const label = document.createElement('span');
    label.innerText = data.label;

    const btn = document.createElement('button');
    btn.className = `keybind-btn ${listeningAction === action ? 'listening' : ''}`;
    btn.innerText = listeningAction === action ? 'Nhấn phím...' : data.keys.map(k => k.replace(/^Key/, '')).join(' / ');
    btn.onclick = () => {
      listeningAction = listeningAction === action ? null : action;
      keybindError.innerText = '';
      renderKeybindUI();
    };

    row.appendChild(label);
    row.appendChild(btn);
    keybindList.appendChild(row);
  }
}

function checkKeyConflict(newKey, targetAction) {
  for (const [action, data] of Object.entries(currentKeybinds)) {
    if (action !== targetAction && data.keys.includes(newKey)) {
      return data.label;
    }
  }
  return null;
}

let notifTimeout = null;
function showNotif(text, isDanger = false) {
  notification.innerText = text;
  notification.style.background = isDanger ? (colorblindMode ? '#FFFFFF' : '#FF5A5F') : '#F2C14E';
  notification.style.color = isDanger && colorblindMode ? '#120A1A' : (isDanger ? '#F5F1E6' : '#120A1A');
  notification.style.opacity = '1';
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => {
    notification.style.opacity = '0';
  }, 1800);
}

// 1. Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1430);
scene.fog = new THREE.FogExp2(0x1b2350, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x8fa3b8, 0.8);
moonLight.position.set(30, 50, 30);
moonLight.castShadow = true;
scene.add(moonLight);

// Island group
const islandGroup = new THREE.Group();
scene.add(islandGroup);

function buildIsland(night) {
  while (islandGroup.children.length > 0) {
    islandGroup.remove(islandGroup.children[0]);
  }

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x2f5d50, roughness: 0.8 });
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5b5f6e, roughness: 0.7 });

  if (night === 1) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(40, 42, 3, 64), grassMat);
    mesh.position.y = -1.5;
    mesh.receiveShadow = true;
    islandGroup.add(mesh);
  } else if (night === 2) {
    const islandA = new THREE.Mesh(new THREE.CylinderGeometry(28, 30, 3, 64), grassMat);
    islandA.position.set(0, -1.5, 0);
    islandA.receiveShadow = true;
    islandGroup.add(islandA);

    const islandB = new THREE.Mesh(new THREE.CylinderGeometry(28, 30, 3, 64), grassMat);
    islandB.position.set(70, -1.5, 0);
    islandB.receiveShadow = true;
    islandGroup.add(islandB);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 4), bridgeMat);
    bridge.position.set(35, -0.3, 0);
    bridge.receiveShadow = true;
    islandGroup.add(bridge);

    for (const pos of [[20, 0.05, 18], [50, 0.05, -18]]) {
      const pad = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 1.0, 32),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(...pos);
      islandGroup.add(pad);
    }
  } else if (night === 3) {
    const t0 = new THREE.Mesh(new THREE.CylinderGeometry(45, 47, 2, 64), grassMat);
    t0.position.y = -1;
    t0.receiveShadow = true;
    islandGroup.add(t0);

    const t1 = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 3, 48, 1, false, 0, Math.PI), stoneMat);
    t1.position.set(0, 1.5, 0);
    t1.receiveShadow = true;
    islandGroup.add(t1);

    const t2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 3, 32), stoneMat);
    t2.position.set(0, 4.5, 0);
    t2.receiveShadow = true;
    islandGroup.add(t2);

    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 8, 24), stoneMat);
    tower.position.set(0, 10, 0);
    tower.castShadow = true;
    islandGroup.add(tower);

    const pad = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 1.0, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 3.05, 13);
    islandGroup.add(pad);
  }
}

// Upgraded Mây Character Model (Vietnamese Traditional Style)
const playerGroup = new THREE.Group();

// 1. Chân & Quần lụa đen
const legMat = new THREE.MeshStandardMaterial({ color: 0x181824, roughness: 0.8 });
const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 8), legMat);
leftLeg.position.set(-0.16, 0.22, 0);
playerGroup.add(leftLeg);

const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 8), legMat);
rightLeg.position.set(0.16, 0.22, 0);
playerGroup.add(rightLeg);

// Guốc mộc nhỏ
const shoeMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6 });
const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), shoeMat);
leftShoe.position.set(-0.16, 0.04, 0.03);
playerGroup.add(leftShoe);

const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), shoeMat);
rightShoe.position.set(0.16, 0.04, 0.03);
playerGroup.add(rightShoe);

// 2. Thân Áo Tứ Thân / Bà Ba ngọc bích rực rỡ với đai thắt lưng vàng kim
const robeMat = new THREE.MeshStandardMaterial({
  color: 0x0d9488, // Xanh ngọc bích tươi tắn
  roughness: 0.45,
  metalness: 0.1
});
const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 0.75, 16), robeMat);
bodyMesh.position.y = 0.72;
playerGroup.add(bodyMesh);

// Đai lưng lụa vàng hoàng gia (Golden silk sash)
const sashMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, emissive: 0xeab308, emissiveIntensity: 0.3 });
const sashMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.15, 16), sashMat);
sashMesh.position.y = 0.72;
playerGroup.add(sashMesh);

// Dải lụa thắt buông rủ phía trước
const ribbonMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.04), sashMat);
ribbonMesh.position.set(0, 0.52, 0.36);
ribbonMesh.rotation.x = -0.1;
playerGroup.add(ribbonMesh);

// 3. Đầu & Khuôn mặt chibi đáng yêu
const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe2b8, roughness: 0.6 }); // Màu da sáng mịn
const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), skinMat);
headMesh.position.y = 1.25;
playerGroup.add(headMesh);

// Mắt đen nhánh to tròn
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
leftEye.position.set(-0.09, 1.28, 0.25);
playerGroup.add(leftEye);

const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
rightEye.position.set(0.09, 1.28, 0.25);
playerGroup.add(rightEye);

// Đôi má ửng hồng dễ thương
const blushMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.6 });
const leftBlush = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), blushMat);
leftBlush.position.set(-0.16, 1.22, 0.22);
playerGroup.add(leftBlush);

const rightBlush = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), blushMat);
rightBlush.position.set(0.16, 1.22, 0.22);
playerGroup.add(rightBlush);

// 4. Nón Lá Tre Việt Nam chi tiết
const hatGroup = new THREE.Group();
hatGroup.position.set(0, 1.38, 0);

// Chóp nón lá rơm vàng ấm
const hatStrawMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.7 });
const hatMesh = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.42, 24), hatStrawMat);
hatGroup.add(hatMesh);

// Vành nón lá nẹp chỉ đỏ son truyền thống
const hatRimMat = new THREE.MeshBasicMaterial({ color: 0xc8102e });
const hatRim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.025, 8, 24), hatRimMat);
hatRim.rotation.x = Math.PI / 2;
hatGroup.add(hatRim);

// Chóp đồng nhọn nhỏ trên đỉnh nón
const hatTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
hatTip.position.y = 0.26;
hatGroup.add(hatTip);

// Quai nón lụa ngọc bích rủ hai bên
const strapMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6 });
const leftStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), strapMat);
leftStrap.position.set(-0.25, -0.15, 0.05);
leftStrap.rotation.z = -0.25;
hatGroup.add(leftStrap);

const rightStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), strapMat);
rightStrap.position.set(0.25, -0.15, 0.05);
rightStrap.rotation.z = 0.25;
hatGroup.add(rightStrap);

playerGroup.add(hatGroup);

// 5. Chiếc Đèn Lồng Cầm Tay Hoa Sen Tinh Xảo (Handheld Lotus Lantern)
const handLanternGroup = new THREE.Group();
handLanternGroup.position.set(0.42, 0.65, 0.25);

// Cán cầm tre thanh mảnh
const stickMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.8 });
const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), stickMat);
stick.rotation.z = 0.5;
handLanternGroup.add(stick);

// Dây treo đèn
const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), hatRimMat);
cord.position.set(0.12, -0.05, 0);
handLanternGroup.add(cord);

// Lồng đèn hoa sen quả trám phát sáng rực rỡ
const lanternMat = new THREE.MeshStandardMaterial({
  color: 0xffa500,
  emissive: 0xffe58a,
  emissiveIntensity: 2.5,
  roughness: 0.3
});
const handLantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 1), lanternMat);
handLantern.position.set(0.12, -0.22, 0);
handLanternGroup.add(handLantern);

// Tua rua đỏ nhỏ dưới đáy đèn cầm tay
const miniTassel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 0.15, 6), hatRimMat);
miniTassel.position.set(0.12, -0.34, 0);
handLanternGroup.add(miniTassel);

playerGroup.add(handLanternGroup);

// Nguồn sáng tỏa từ đèn của Mây
const playerLight = new THREE.PointLight(0xffb347, 2.2, 8);
playerLight.position.set(0.54, 0.43, 0.25);
playerGroup.add(playerLight);

scene.add(playerGroup);

// Particle & Trail Effects Managers
// 1. Dash Smoke / Ghost Afterimages
const dashGhosts = [];

// 2. Footstep Sparks
const footstepSparks = [];
const sparkGeo = new THREE.SphereGeometry(0.06, 6, 6);
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe58a, transparent: true, opacity: 0.8 });

function spawnFootstepSpark(x, y, z) {
  const s = new THREE.Mesh(sparkGeo, sparkMat.clone());
  s.position.set(x + (Math.random() - 0.5) * 0.2, y, z + (Math.random() - 0.5) * 0.2);
  scene.add(s);
  footstepSparks.push({ mesh: s, life: 1.0 });
}

// 3. Pulse Shockwave Rings
const pulseRing = new THREE.Mesh(
  new THREE.RingGeometry(0.2, 0.6, 32),
  new THREE.MeshBasicMaterial({ color: 0xffe58a, side: THREE.DoubleSide, transparent: true, opacity: 0 })
);
pulseRing.rotation.x = -Math.PI / 2;
pulseRing.position.y = 0.05;
scene.add(pulseRing);

const pulseInnerRing = new THREE.Mesh(
  new THREE.RingGeometry(0.1, 0.3, 32),
  new THREE.MeshBasicMaterial({ color: 0xffa500, side: THREE.DoubleSide, transparent: true, opacity: 0 })
);
pulseInnerRing.rotation.x = -Math.PI / 2;
pulseInnerRing.position.y = 0.06;
scene.add(pulseInnerRing);

let pulseAnim = { active: false, radius: 0, opacity: 0 };

// Lantern visuals with Fuel Bars
const lanternMeshes = new Map();
function syncLanterns(lanterns) {
  for (const [id, lm] of lanternMeshes.entries()) {
    scene.remove(lm.group);
  }
  lanternMeshes.clear();

  for (const l of lanterns) {
    const g = new THREE.Group();
    g.position.set(l.pos[0], l.pos[1], l.pos[2]);

    // 1. Chân bệ đá tam cấp vững chãi
    const stoneMat1 = new THREE.MeshStandardMaterial({ color: 0x3e4250, roughness: 0.95 });
    const stoneMat2 = new THREE.MeshStandardMaterial({ color: 0x4f5466, roughness: 0.9 });
    
    // Tầng đế 1
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.2, 8), stoneMat1);
    base1.position.y = 0.1;
    g.add(base1);

    // Tầng đế 2
    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 0.2, 8), stoneMat2);
    base2.position.y = 0.28;
    g.add(base2);

    // Tầng đài sen đỡ cột
    const lotusBase = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.18, 8), stoneMat1);
    lotusBase.position.y = 0.45;
    g.add(lotusBase);

    // 1b. Vành hào quang viền chân bệ đá (Golden Outline Rims)
    const baseGlowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 0.96, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    baseGlowRing.rotation.x = -Math.PI / 2;
    baseGlowRing.position.y = 0.04;
    g.add(baseGlowRing);

    const baseMidRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.02, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffe58a })
    );
    baseMidRim.rotation.x = Math.PI / 2;
    baseMidRim.position.y = 0.38;
    g.add(baseMidRim);

    // 2. Thân cột gỗ sơn son thếp vàng
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e2215, roughness: 0.7 }); // Gỗ gụ son trầm
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 }); // Đồng ánh kim

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.2, 16), woodMat);
    pillar.position.y = 1.6;
    g.add(pillar);

    // Vòng đai đồng trang trí thân cột
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.025, 8, 16), brassMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 1.1;
    g.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.025, 8, 16), brassMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 2.0;
    g.add(ring2);

    // 3. Tay rường cột gỗ vươn ra đỡ lồng đèn
    const corbelGeo = new THREE.BoxGeometry(0.08, 0.08, 0.6);
    const corbel1 = new THREE.Mesh(corbelGeo, woodMat);
    corbel1.position.set(0, 2.65, 0);
    g.add(corbel1);

    const corbel2 = new THREE.Mesh(corbelGeo, woodMat);
    corbel2.rotation.y = Math.PI / 2;
    corbel2.position.set(0, 2.65, 0);
    g.add(corbel2);

    // 4. Lồng đèn Lục giác Hội An
    const silkMat = new THREE.MeshStandardMaterial({
      color: l.lit ? 0xff9e1b : 0x7c1e14,
      emissive: l.lit ? 0xffe58a : 0x3d0b06,
      emissiveIntensity: l.lit ? 2.2 : 0.6,
      roughness: 0.5
    });

    const lanternSilk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.42, 1.05, 6),
      silkMat
    );
    lanternSilk.position.y = 3.15;
    g.add(lanternSilk);

    // Khung vành gỗ trên và dưới của lồng đèn có viền vàng
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x3d120a, roughness: 0.8 });
    const topRim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 6), rimMat);
    topRim.position.y = 3.68;
    g.add(topRim);

    const topGoldRim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.015, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
    topGoldRim.rotation.x = Math.PI / 2;
    topGoldRim.position.y = 3.72;
    g.add(topGoldRim);

    const botRim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.08, 6), rimMat);
    botRim.position.y = 2.62;
    g.add(botRim);

    // 5. Mái ngói cong đình làng tứ giác uốn đầu đao & viền mái ngói vàng rực
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a2818, roughness: 0.6 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.45, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.92;
    g.add(roof);

    // Viền 4 góc mái ngói uốn cong
    const roofRidgeMat = new THREE.MeshBasicMaterial({ color: 0xffe58a });
    for (let r = 0; r < 4; r++) {
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.46, 0.04), roofRidgeMat);
      ridge.rotation.z = 0.72;
      ridge.rotation.y = (r * Math.PI) / 2 + Math.PI / 4;
      ridge.position.set(0, 3.88, 0);
      g.add(ridge);
    }

    // Quả hồ lô đỉnh chóp đồng tụ khí
    const gourdBot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), brassMat);
    gourdBot.position.y = 4.2;
    g.add(gourdBot);
    const gourdTop = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 8), brassMat);
    gourdTop.position.y = 4.32;
    g.add(gourdTop);

    // 6. Dải tua rua đỏ đung đưa dưới đáy đèn
    const tasselGroup = new THREE.Group();
    tasselGroup.position.set(0, 2.58, 0);

    const tasselBead = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), brassMat);
    tasselBead.position.y = -0.06;
    tasselGroup.add(tasselBead);

    const tasselMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.7 });
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.09, 0.4, 8), tasselMat);
    tassel.position.y = -0.3;
    tasselGroup.add(tassel);
    g.add(tasselGroup);

    // 7. Ánh sáng: PointLight
    const light = new THREE.PointLight(
      l.lit ? 0xffb347 : 0xff3b14,
      l.lit ? 3.8 : 0.6,
      l.lit ? 16 : 8
    );
    light.position.y = 3.15;
    g.add(light);

    // 8. Cột ánh sáng định vị từ xa (Beacon Beam)
    const beaconGeo = new THREE.CylinderGeometry(0.12, 0.45, 14, 8, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: l.lit ? 0xffe58a : 0xff3b14,
      transparent: true,
      opacity: l.lit ? 0.35 : 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 10.5;
    g.add(beacon);

    // 9. Vòng an toàn dưới đất khi đèn sáng
    const safeRing = new THREE.Mesh(
      new THREE.RingGeometry(5.8, 6.0, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffb347,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: (l.lit && l.fuel >= 30) ? 0.35 : 0
      })
    );
    safeRing.rotation.x = -Math.PI / 2;
    safeRing.position.y = 0.03;
    g.add(safeRing);

    // 10. Thanh dầu (Fuel Bar) trên đỉnh lồng đèn
    const fuelBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide })
    );
    fuelBg.position.set(0, 4.65, 0);

    const fuelFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.16, 0.11),
      new THREE.MeshBasicMaterial({ color: 0xf2c14e, side: THREE.DoubleSide })
    );
    fuelFill.position.set(0, 4.65, 0.01);
    g.add(fuelBg);
    g.add(fuelFill);

    scene.add(g);
    lanternMeshes.set(l.id, {
      group: g,
      silk: lanternSilk,
      roof,
      tasselGroup,
      light,
      beacon,
      safeRing,
      fuelBg,
      fuelFill
    });
  }
}

// Upgraded Mote Visuals (Glowing Core & Pulsing Halo)
const moteMeshes = new Map();

function createMoteVisual() {
  const g = new THREE.Group();
  
  // Lõi sáng vàng rực
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xfff6c2,
    emissive: 0xffe58a,
    emissiveIntensity: 2.2,
    roughness: 0.2
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), coreMat);
  g.add(core);

  // Quầng hào quang phát quang mềm mại
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffe58a,
    transparent: true,
    opacity: 0.4,
    side: THREE.BackSide
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), haloMat);
  g.add(halo);

  const light = new THREE.PointLight(0xffe58a, 0.6, 2.5);
  g.add(light);

  return { group: g, core, halo };
}

function syncMotes(motes) {
  const activeIds = new Set(motes.map((m) => m.id));
  for (const [id, entry] of moteMeshes.entries()) {
    if (!activeIds.has(id)) {
      scene.remove(entry.group);
      moteMeshes.delete(id);
    }
  }

  for (const m of motes) {
    let entry = moteMeshes.get(m.id);
    if (!entry) {
      entry = createMoteVisual();
      scene.add(entry.group);
      moteMeshes.set(m.id, entry);
    }
    const bob = Math.sin(Date.now() * 0.005 + m.pos[0] * 2) * 0.14;
    const pulseScale = 1.0 + 0.1 * Math.sin(Date.now() * 0.008 + m.pos[2]);
    entry.halo.scale.set(pulseScale, pulseScale, pulseScale);
    entry.group.position.set(m.pos[0], m.pos[1] + 0.38 + bob, m.pos[2]);
  }
}

// Upgraded Shade Visuals (Dark Ink Wraith with Crimson Eyes & Tentacles)
const shadeMeshes = new Map();

function createShadeVisual() {
  const g = new THREE.Group();

  // 1. Thân giọt mực hắc ám dẹt
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x090312,
    roughness: 0.2,
    metalness: 0.3,
    emissive: 0x581c87, // Ánh tím ma quái
    emissiveIntensity: 0.9
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), bodyMat);
  body.scale.set(1.0, 1.15, 1.0);
  body.position.y = 0.55;
  g.add(body);

  // 2. Vầng hào quang tà khí
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0x9333ea,
    transparent: true,
    opacity: 0.25,
    side: THREE.BackSide
  });
  const aura = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 12), auraMat);
  aura.position.y = 0.55;
  g.add(aura);

  // 3. Đôi mắt đỏ rực tà khí
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
  leftEye.position.set(-0.18, 0.65, 0.44);
  g.add(leftEye);

  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
  rightEye.position.set(0.18, 0.65, 0.44);
  g.add(rightEye);

  // Con ngươi rực sáng
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffe58a });
  const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), pupilMat);
  leftPupil.position.set(-0.18, 0.65, 0.51);
  g.add(leftPupil);

  const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), pupilMat);
  rightPupil.position.set(0.18, 0.65, 0.51);
  g.add(rightPupil);

  // 4. 4 xúc tua mực uốn lượn bên dưới
  const tentacleMat = new THREE.MeshStandardMaterial({ color: 0x1e0b36, roughness: 0.5 });
  const tentacles = [];
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.45, 8), tentacleMat);
    t.rotation.x = Math.PI;
    t.position.set(Math.cos(angle) * 0.22, 0.15, Math.sin(angle) * 0.22);
    g.add(t);
    tentacles.push(t);
  }

  // 5. Ngôi sao choáng xoay trên đầu
  const stunGroup = new THREE.Group();
  stunGroup.position.set(0, 1.25, 0);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  for (let i = 0; i < 3; i++) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), starMat);
    const a = (i * Math.PI * 2) / 3;
    star.position.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
    stunGroup.add(star);
  }
  stunGroup.visible = false;
  g.add(stunGroup);

  return { group: g, body, aura, leftEye, rightEye, tentacles, stunGroup };
}

function syncShades(shades) {
  const activeIds = new Set(shades.map((s) => s.id));
  for (const [id, entry] of shadeMeshes.entries()) {
    if (!activeIds.has(id)) {
      scene.remove(entry.group);
      shadeMeshes.delete(id);
    }
  }

  const shadeAuraColor = colorblindMode ? 0x00b3ff : 0x9333ea;

  for (const s of shades) {
    let entry = shadeMeshes.get(s.id);
    if (!entry) {
      entry = createShadeVisual();
      scene.add(entry.group);
      shadeMeshes.set(s.id, entry);
    }
    const bob = Math.sin(Date.now() * 0.004 + s.pos[2] * 2) * 0.12;
    entry.group.position.set(s.pos[0], s.pos[1] + 0.2 + bob, s.pos[2]);

    // Uốn lượn xúc tua theo thời gian
    const tentTime = Date.now() * 0.006;
    entry.tentacles.forEach((t, idx) => {
      t.rotation.z = Math.sin(tentTime + idx) * 0.25;
      t.rotation.x = Math.PI + Math.cos(tentTime + idx) * 0.25;
    });

    if (s.state === 'stunned') {
      entry.stunGroup.visible = true;
      entry.stunGroup.rotation.y += 0.12;
      entry.body.material.emissive.setHex(0x3a3450);
      entry.leftEye.material.color.setHex(0x441122);
      entry.rightEye.material.color.setHex(0x441122);
    } else if (s.state === 'drain') {
      entry.stunGroup.visible = false;
      // Mắt đỏ cam rực rỡ chớp giật liên tục khi hút dầu
      const drainBlink = Math.sin(Date.now() * 0.012) > 0;
      entry.body.material.emissive.setHex(drainBlink ? 0xf59e0b : 0xd97706);
      entry.leftEye.material.color.setHex(drainBlink ? 0xff5a00 : 0xffaa00);
      entry.rightEye.material.color.setHex(drainBlink ? 0xff5a00 : 0xffaa00);
    } else {
      entry.stunGroup.visible = false;
      entry.body.material.emissive.setHex(shadeAuraColor);
      entry.leftEye.material.color.setHex(0xff0044);
      entry.rightEye.material.color.setHex(0xff0044);
    }
  }
}

// Upgraded Drifter Visuals (Whirlwind Spirit with Flapping Ethereal Wings)
const drifterMeshes = new Map();

function createDrifterVisual() {
  const g = new THREE.Group();

  // Lõi xoáy lốc xanh băng
  const cycloneMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.0,
    roughness: 0.3
  });
  const cyclone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.42, 1.1, 10), cycloneMat);
  cyclone.position.y = 0.55;
  g.add(cyclone);

  // Đôi cánh gió lụa trong suốt
  const wingMat = new THREE.MeshBasicMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide
  });
  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.25), wingMat);
  leftWing.position.set(-0.35, 0.75, 0);
  g.add(leftWing);

  const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.25), wingMat);
  rightWing.position.set(0.35, 0.75, 0);
  g.add(rightWing);

  // Đốm đom đóm cướp được nằm trong bụng
  const stolenMote = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe58a })
  );
  stolenMote.position.y = 0.55;
  stolenMote.visible = false;
  g.add(stolenMote);

  return { group: g, cyclone, leftWing, rightWing, stolenMote };
}

function syncDrifters(drifters) {
  const activeIds = new Set(drifters.map((d) => d.id));
  for (const [id, entry] of drifterMeshes.entries()) {
    if (!activeIds.has(id)) {
      scene.remove(entry.group);
      drifterMeshes.delete(id);
    }
  }

  for (const d of drifters) {
    let entry = drifterMeshes.get(d.id);
    if (!entry) {
      entry = createDrifterVisual();
      scene.add(entry.group);
      drifterMeshes.set(d.id, entry);
    }
    const bob = Math.sin(Date.now() * 0.007 + d.pos[0] * 2) * 0.18;
    entry.group.position.set(d.pos[0], d.pos[1] + 0.4 + bob, d.pos[2]);

    // Xoay lốc xoáy và đập cánh
    entry.cyclone.rotation.y += 0.15;
    const flap = Math.sin(Date.now() * 0.015) * 0.35;
    entry.leftWing.rotation.z = flap;
    entry.rightWing.rotation.z = -flap;

    entry.stolenMote.visible = d.carried_motes > 0;
  }
}

// Charm Visuals (Bùa Gió)
const charmMeshes = new Map();
const charmGeo = new THREE.BoxGeometry(0.5, 0.8, 0.05);
const charmMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, emissive: 0xf2c14e, emissiveIntensity: 0.5 });

function syncCharms(charms) {
  for (const c of charms) {
    let mesh = charmMeshes.get(c.id);
    if (!mesh) {
      mesh = new THREE.Mesh(charmGeo, charmMat);
      scene.add(mesh);
      charmMeshes.set(c.id, mesh);
    }
    mesh.position.set(c.pos[0], c.pos[1] + 0.8, c.pos[2]);
    mesh.visible = c.available;
    mesh.rotation.y += 0.03;
  }
}

// Game Engine
let engine = new GameEngine({ night: currentNight });
buildIsland(currentNight);
syncLanterns(engine.lanterns);

// Initialize Settings & UI
loadSettings();

// Input State
const keys = {};
let jumpRequested = false;
let dashRequested = false;
let interactRequested = false;
let pulseRequested = false;
let pauseRequested = false;
let cameraShake = 0;

window.addEventListener('keydown', (e) => {
  // If user is rebinding a key
  if (listeningAction) {
    e.preventDefault();
    const conflict = checkKeyConflict(e.code, listeningAction);
    if (conflict) {
      keybindError.innerText = `Phím "${e.code}" đã được gán cho: "${conflict}"! Vui lòng chọn phím khác.`;
      return;
    }
    currentKeybinds[listeningAction].keys = [e.code];
    saveKeybinds();
    listeningAction = null;
    keybindError.innerText = '';
    renderKeybindUI();
    return;
  }

  // If typing in input box, ignore game hotkeys
  if (e.target && e.target.tagName === 'INPUT') {
    return;
  }

  keys[e.code] = true;

  if (currentKeybinds.jump.keys.includes(e.code)) jumpRequested = true;
  if (currentKeybinds.dash.keys.includes(e.code)) dashRequested = true;
  if (currentKeybinds.interact.keys.includes(e.code)) interactRequested = true;
  if (currentKeybinds.pulse.keys.includes(e.code)) pulseRequested = true;
  if (currentKeybinds.pause.keys.includes(e.code)) pauseRequested = true;
  if (e.code === 'KeyR' && (engine.state === 'won' || engine.state === 'lost')) {
    initNight(currentNight);
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Settings & Accessibility Listeners
if (hudSettingsBtn) {
  hudSettingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
    renderKeybindUI();
  });
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
    listeningAction = null;
  });
}

if (resetKeysBtn) {
  resetKeysBtn.addEventListener('click', () => {
    currentKeybinds = JSON.parse(JSON.stringify(DEFAULT_KEYBINDS));
    saveKeybinds();
    renderKeybindUI();
    keybindError.innerText = 'Đã khôi phục phím mặc định!';
  });
}

if (reducedMotionCb) {
  reducedMotionCb.addEventListener('change', (e) => {
    reducedMotion = e.target.checked;
    localStorage.setItem('dao_den_long_reduced_motion', String(reducedMotion));
  });
}

if (largeFontCb) {
  largeFontCb.addEventListener('change', (e) => {
    largeFont = e.target.checked;
    localStorage.setItem('dao_den_long_large_font', String(largeFont));
    if (largeFont) {
      document.body.classList.add('large-font');
    } else {
      document.body.classList.remove('large-font');
    }
  });
}

// Leaderboard Modal & Saving Listeners
function renderLeaderboard() {
  if (!leaderboardBody) return;
  const entries = getBrowserLeaderboard();
  leaderboardBody.innerHTML = '';
  if (entries.length === 0) {
    leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#8FA3B8;">Chưa có dữ liệu xếp hạng</td></tr>';
    return;
  }
  entries.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    const dateStr = new Date(entry.achieved_at).toLocaleDateString('vi-VN');
    tr.innerHTML = `
      <td>#${idx + 1}</td>
      <td>${entry.name}</td>
      <td><strong>${entry.score}</strong></td>
      <td>${entry.nights_won}/3</td>
      <td>${dateStr}</td>
    `;
    leaderboardBody.appendChild(tr);
  });
}

if (viewLeaderboardBtn) {
  viewLeaderboardBtn.addEventListener('click', () => {
    leaderboardModal.style.display = 'flex';
    renderLeaderboard();
  });
}

if (closeLeaderboardBtn) {
  closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardModal.style.display = 'none';
  });
}

if (saveScoreBtn) {
  saveScoreBtn.addEventListener('click', () => {
    const rawName = (playerNameInput.value || '').trim();
    if (!/^[A-Za-z0-9_]{3,12}$/.test(rawName)) {
      saveScoreMsg.style.color = '#FF5A5F';
      saveScoreMsg.innerText = 'Tên phải từ 3-12 ký tự [A-Za-z0-9_]!';
      return;
    }
    const nightsWon = engine.state === 'won' ? currentNight : (currentNight - 1);
    addEntryToBrowser({
      name: rawName,
      score: engine.score,
      nights_won: nightsWon,
      seed: engine.seed,
      achieved_at: new Date().toISOString()
    });
    saveScoreMsg.style.color = '#FFE58A';
    saveScoreMsg.innerText = 'Đã lưu điểm thành công!';
    saveScoreBtn.disabled = true;
    renderLeaderboard();
  });
}

resumeBtn.addEventListener('click', () => {
  pauseRequested = true;
});

restartNightBtn.addEventListener('click', () => {
  initNight(currentNight);
  pauseOverlay.style.display = 'none';
});

restartBtn.addEventListener('click', () => {
  initNight(currentNight);
});

nextNightBtn.addEventListener('click', () => {
  if (currentNight < 3) {
    currentNight += 1;
    initNight(currentNight);
  }
});

document.querySelectorAll('.btn-night').forEach((btn) => {
  btn.addEventListener('click', () => {
    const n = parseInt(btn.dataset.night, 10);
    initNight(n);
    pauseOverlay.style.display = 'none';
  });
});

function initNight(night) {
  currentNight = night;
  overlay.style.display = 'none';
  pauseOverlay.style.display = 'none';
  nextNightBtn.style.display = 'none';

  engine = new GameEngine({ night: currentNight });
  buildIsland(currentNight);
  syncLanterns(engine.lanterns);

  const titles = ['', 'Đêm 1 — Đảo Bến', 'Đêm 2 — Đảo Cau', 'Đêm 3 — Đảo Chuông'];
  nightTitle.innerText = titles[currentNight];
  showNotif(`${titles[currentNight]} bắt đầu!`);
}

// Edge pointer calculation for offscreen Shades
function updateEdgePointers(shades) {
  if (!edgePointerContainer) return;
  edgePointerContainer.innerHTML = '';
  const width = window.innerWidth;
  const height = window.innerHeight;
  const cx = width / 2;
  const cy = height / 2;

  for (const s of shades) {
    const v = new THREE.Vector3(s.pos[0], s.pos[1] + 0.5, s.pos[2]);
    v.project(camera);

    const isBehind = v.z > 1 || v.z < -1;
    let sx = (v.x * 0.5 + 0.5) * width;
    let sy = (-(v.y * 0.5) + 0.5) * height;

    if (isBehind || sx < 40 || sx > width - 40 || sy < 40 || sy > height - 40) {
      let dx = isBehind ? -v.x : v.x;
      let dy = isBehind ? v.y : -v.y;
      const angle = Math.atan2(dy, dx);
      const edgeX = Math.max(30, Math.min(width - 30, cx + Math.cos(angle) * (cx - 45)));
      const edgeY = Math.max(30, Math.min(height - 30, cy + Math.sin(angle) * (cy - 45)));

      const pointer = document.createElement('div');
      pointer.className = 'edge-pointer';
      pointer.style.left = `${edgeX - 10}px`;
      pointer.style.top = `${edgeY - 20}px`;
      pointer.style.transform = `rotate(${angle + Math.PI / 2}rad)`;
      edgePointerContainer.appendChild(pointer);
    }
  }
}

// Loop
let lastTime = performance.now();
let accumulator = 0;
const TICK_DURATION = 1000 / 60;
let lastMoveX = 0;
let lastMoveZ = 0;

function animate(currentTime) {
  requestAnimationFrame(animate);

  const delta = Math.min(currentTime - lastTime, 100);
  lastTime = currentTime;
  accumulator += delta;

  while (accumulator >= TICK_DURATION) {
    accumulator -= TICK_DURATION;

    let moveX = 0;
    let moveZ = 0;
    if (currentKeybinds.moveUp.keys.some(k => keys[k])) moveZ += 1;
    if (currentKeybinds.moveDown.keys.some(k => keys[k])) moveZ -= 1;
    if (currentKeybinds.moveLeft.keys.some(k => keys[k])) moveX += 1;
    if (currentKeybinds.moveRight.keys.some(k => keys[k])) moveX -= 1;

    if (moveX !== 0 || moveZ !== 0) {
      lastMoveX = moveX;
      lastMoveZ = moveZ;
    }

    const input = {
      move: [moveX, moveZ],
      cam_yaw_deg: 0,
      jump: jumpRequested,
      dash: dashRequested,
      interact: interactRequested,
      pulse: pulseRequested,
      pause: pauseRequested
    };

    if (pulseRequested && engine.player.carried >= 3 && engine.player.pulse_cd_ticks === 0) {
      pulseAnim = { active: true, radius: 0.5, opacity: 0.8 };
    }

    jumpRequested = false;
    dashRequested = false;
    interactRequested = false;
    pulseRequested = false;
    pauseRequested = false;

    const events = engine.step(input);

    for (const evt of events) {
      if (evt.name === 'mote_picked') {
        showNotif(`Nhặt đom đóm (+5đ, đang có: ${evt.data.carried}/${engine.capacity})`);
      } else if (evt.name === 'deposit') {
        showNotif(`Nạp ${evt.data.amount} đom đóm vào đèn ${evt.data.lantern_id}`);
      } else if (evt.name === 'refuel') {
        showNotif(`Châm ${evt.data.amount} đom đóm vào đèn ${evt.data.lantern_id} (Dầu: ${evt.data.fuel})`);
      } else if (evt.name === 'lantern_lit') {
        showNotif(evt.data.relight ? `ĐÈN ${evt.data.lantern_id} ĐÃ THẮP LẠI! (+40đ)` : `ĐÈN ${evt.data.lantern_id} ĐÃ THẮP SÁNG! (+100đ)`);
      } else if (evt.name === 'lantern_out') {
        showNotif(`ĐÈN ${evt.data.lantern_id} ĐÃ HẾT DẦU VÀ TẮT!`, true);
      } else if (evt.name === 'pulse') {
        showNotif(`Tỏa sáng! Làm choáng ${evt.data.stunned_ids.length} Bóng Mực`);
      } else if (evt.name === 'dash') {
        showNotif('Lướt!');
      } else if (evt.name === 'charm_picked') {
        showNotif('NHẶT BÙA GIÓ! (Tốc độ + Lướt 0s hồi chiêu)');
      } else if (evt.name === 'drifter_steal') {
        showNotif(`Gió Lạc cướp ${evt.data.amount} đom đóm!`, true);
      } else if (evt.name === 'drifter_drop') {
        showNotif(`Tỏa sáng khiến Gió Lạc đánh rơi ${evt.data.amount} đom đóm!`);
      } else if (evt.name === 'player_hit') {
        if (!reducedMotion) cameraShake = 0.5;
        if (evt.data.by === 'fall') {
          showNotif('Rơi khỏi đảo! Mất 1 ngọn lửa và toàn bộ đom đóm', true);
        } else {
          showNotif(`Bị Bóng Mực cắn! Mất 1 ngọn lửa, rơi ${evt.data.dropped} đom đóm`, true);
        }
      } else if (evt.name === 'shade_spawned') {
        showSubtitle('Bóng Mực xuất hiện!');
      } else if (evt.name === 'wind_gust') {
        showSubtitle('Gió sắp thổi mạnh!');
      } else if (evt.name === 'paused') {
        pauseOverlay.style.display = 'flex';
      } else if (evt.name === 'resumed') {
        pauseOverlay.style.display = 'none';
      } else if (evt.name === 'game_over') {
        overlay.style.display = 'flex';
        if (saveScoreBtn) {
          saveScoreBtn.disabled = false;
          saveScoreMsg.innerText = '';
        }
        if (evt.data.result === 'won') {
          overlayTitle.innerText = currentNight === 3 ? 'BÌNH MINH TOÀN DIỆN!' : 'VƯỢT QUA ĐÊM (BÌNH MINH)!';
          overlayTitle.style.color = '#F2C14E';
          overlayDesc.innerText = `Sống sót đến bình minh với ${engine.lanterns.filter(l => l.lit).length}/${engine.lanterns.length} ngọn đèn còn rực sáng!`;
          if (currentNight < 3) {
            nextNightBtn.style.display = 'inline-block';
            nextNightBtn.innerText = `Sang Đêm ${currentNight + 1}`;
          }
        } else {
          overlayTitle.innerText = 'THẤT BẠI!';
          overlayTitle.style.color = '#FF5A5F';
          overlayDesc.innerText = evt.data.reason === 'no_flames' ? 'Mây đã kiệt sức và mất hết ngọn lửa!' : 'Bình minh đến nhưng số đèn sáng không đạt yêu cầu 60%!';
        }
        overlayStats.innerHTML = `
          <strong>Điểm Đêm này: ${engine.score}</strong><br>
          Ngọn Lửa còn lại: ${engine.player.flames}
        `;
      }
    }

    // Periodic accessibility warnings
    if (Math.floor(engine.time_left_s) === 10 && engine.tick % 60 === 0) {
      showSubtitle('10 giây cuối! Bình minh sắp đến!');
    }
    if (engine.tick % 180 === 0) {
      const low = engine.lanterns.find(l => l.lit && l.fuel < 30);
      if (low) {
        showSubtitle(`Cảnh báo: Đèn ${low.id} cạn dầu (<30%)!`);
      }
    }
  }

  // Visual position updates
  playerGroup.position.set(engine.player.pos[0], engine.player.pos[1], engine.player.pos[2]);

  if (lastMoveX !== 0 || lastMoveZ !== 0) {
    playerGroup.rotation.y = Math.atan2(lastMoveX, lastMoveZ);
  }

  // 1. Dash Smoke & Ghost Afterimages Trail (Hiệu ứng sau khi lướt)
  if (engine.player.dash_ticks_left > 0) {
    // Tàn ảnh bóng ma Mây
    const ghost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 1.1, 12),
      new THREE.MeshBasicMaterial({
        color: 0x2dd4bf, // Ngọc bích phát sáng
        transparent: true,
        opacity: 0.7
      })
    );
    ghost.position.copy(playerGroup.position);
    ghost.rotation.copy(playerGroup.rotation);
    scene.add(ghost);
    dashGhosts.push({ mesh: ghost, life: 1.0 });

    // Vệt khói lướt (Smoke puff)
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
    );
    smoke.position.set(
      engine.player.pos[0] + (Math.random() - 0.5) * 0.3,
      engine.player.pos[1] + 0.3,
      engine.player.pos[2] + (Math.random() - 0.5) * 0.3
    );
    scene.add(smoke);
    dashGhosts.push({ mesh: smoke, life: 0.8, isSmoke: true });
  }

  // Cập nhật và tan biến vệt khói / bóng ma lướt
  for (let i = dashGhosts.length - 1; i >= 0; i--) {
    const dg = dashGhosts[i];
    dg.life -= 0.055;
    dg.mesh.material.opacity = Math.max(0, dg.life * (dg.isSmoke ? 0.5 : 0.7));
    if (dg.isSmoke) {
      dg.mesh.scale.multiplyScalar(1.04);
      dg.mesh.position.y += 0.015;
    } else {
      dg.mesh.scale.multiplyScalar(0.96);
    }
    if (dg.life <= 0) {
      scene.remove(dg.mesh);
      dashGhosts.splice(i, 1);
    }
  }

  // 2. Vệt đốm sáng bước chân khi di chuyển trên mặt đất
  if ((lastMoveX !== 0 || lastMoveZ !== 0) && engine.player.grounded && engine.tick % 5 === 0) {
    spawnFootstepSpark(engine.player.pos[0], engine.player.pos[1] + 0.04, engine.player.pos[2]);
  }

  for (let i = footstepSparks.length - 1; i >= 0; i--) {
    const s = footstepSparks[i];
    s.life -= 0.05;
    s.mesh.material.opacity = Math.max(0, s.life * 0.8);
    s.mesh.position.y += 0.008;
    if (s.life <= 0) {
      scene.remove(s.mesh);
      footstepSparks.splice(i, 1);
    }
  }

  // Camera Follow
  const targetCamX = engine.player.pos[0];
  const targetCamY = engine.player.pos[1] + 9.0;
  const targetCamZ = engine.player.pos[2] - 13.0;

  camera.position.x += (targetCamX - camera.position.x) * 0.1;
  camera.position.y += (targetCamY - camera.position.y) * 0.1;
  camera.position.z += (targetCamZ - camera.position.z) * 0.1;

  if (!reducedMotion && cameraShake > 0) {
    camera.position.x += (Math.random() - 0.5) * cameraShake;
    camera.position.y += (Math.random() - 0.5) * cameraShake;
    cameraShake = Math.max(0, cameraShake - 0.04);
  }

  camera.lookAt(engine.player.pos[0], engine.player.pos[1] + 1.0, engine.player.pos[2]);

  // Pulse Shockwave Rings Animation
  if (pulseAnim.active) {
    pulseAnim.radius += 0.32;
    pulseAnim.opacity -= 0.032;

    pulseRing.scale.set(pulseAnim.radius, pulseAnim.radius, 1);
    pulseRing.position.set(engine.player.pos[0], engine.player.pos[1] + 0.05, engine.player.pos[2]);
    pulseRing.material.opacity = Math.max(0, pulseAnim.opacity);

    pulseInnerRing.scale.set(pulseAnim.radius * 0.75, pulseAnim.radius * 0.75, 1);
    pulseInnerRing.position.set(engine.player.pos[0], engine.player.pos[1] + 0.06, engine.player.pos[2]);
    pulseInnerRing.material.opacity = Math.max(0, pulseAnim.opacity * 1.3);

    if (pulseAnim.opacity <= 0) {
      pulseAnim.active = false;
      pulseRing.material.opacity = 0;
      pulseInnerRing.material.opacity = 0;
    }
  }

  // Sync Entities
  syncMotes(engine.motes);
  syncShades(engine.shades);
  syncDrifters(engine.drifters);
  syncCharms(engine.charms);

  // Update Lantern Visuals and Fuel Bars
  for (const l of engine.lanterns) {
    const lm = lanternMeshes.get(l.id);
    if (lm) {
      // Đung đưa nhẹ dải tua rua lụa đỏ theo gió
      lm.tasselGroup.rotation.z = Math.sin(Date.now() * 0.003 + l.pos[0]) * 0.12;

      // Xoay thanh dầu luôn nhìn về phía camera
      lm.fuelBg.quaternion.copy(camera.quaternion);
      lm.fuelFill.quaternion.copy(camera.quaternion);

      if (l.lit) {
        lm.silk.material.color.setHex(0xff9e1b);
        lm.silk.material.emissive.setHex(0xffe58a);
        lm.silk.material.emissiveIntensity = 2.2;
        lm.beacon.material.color.setHex(0xffe58a);
        lm.beacon.material.opacity = 0.35;

        // Blinking if low fuel (< 30)
        if (l.fuel < 30) {
          const blink = (Math.sin(Date.now() * 0.006) + 1) / 2;
          lm.light.color.setHex(0xff5a5f);
          lm.light.intensity = 1.0 + 2.5 * blink;
          lm.safeRing.material.opacity = 0; // Lost safe zone
          lm.fuelFill.material.color.setHex(0xff5a5f); // Red fuel bar
          lm.beacon.material.color.setHex(0xff5a5f);
        } else {
          lm.light.color.setHex(0xffb347);
          lm.light.intensity = 3.8;
          lm.safeRing.material.opacity = 0.35;
          lm.fuelFill.material.color.setHex(0xf2c14e);
        }

        lm.fuelBg.visible = true;
        lm.fuelFill.visible = true;
        const scaleX = Math.max(0.01, l.fuel / 100);
        lm.fuelFill.scale.set(scaleX, 1, 1);
        lm.fuelFill.position.x = -0.58 + (scaleX * 1.16) / 2;
      } else {
        // Đèn chưa thắp hoặc cạn dầu: than đỏ le lói và cột beacon đỏ cam dẫn đường
        lm.silk.material.color.setHex(0x7c1e14);
        lm.silk.material.emissive.setHex(0x3d0b06);
        lm.silk.material.emissiveIntensity = 0.6;
        lm.light.color.setHex(0xff3b14);
        lm.light.intensity = 0.6 + 0.3 * Math.sin(Date.now() * 0.004);
        lm.beacon.material.color.setHex(0xff3b14);
        lm.beacon.material.opacity = 0.22;
        lm.safeRing.material.opacity = 0;
        lm.fuelBg.visible = false;
        lm.fuelFill.visible = false;
      }
    }
  }

  // Dynamic ambient light based on lit lanterns progress: 0.15 + 0.55 * (lit / total)
  const litCount = engine.lanterns.filter((l) => l.lit).length;
  ambientLight.intensity = 0.15 + 0.55 * (litCount / (engine.lanterns.length || 1));

  // Check near lantern for hint
  let nearLantern = null;
  for (const l of engine.lanterns) {
    if ((!l.lit || l.fuel < 100) && Math.sqrt((l.pos[0] - engine.player.pos[0]) ** 2 + (l.pos[2] - engine.player.pos[2]) ** 2) <= 2.0) {
      nearLantern = l;
      break;
    }
  }
  if (nearLantern) {
    interactHint.style.display = 'block';
    if (!nearLantern.lit) {
      const cost = nearLantern.ever_lit ? 5 : 10;
      interactHint.innerText = `E — ${nearLantern.ever_lit ? 'Thắp lại' : 'Nạp ánh sáng'} (${nearLantern.deposited}/${cost})`;
    } else {
      interactHint.innerText = `E — Châm dầu (Dầu: ${round1(nearLantern.fuel)}/100)`;
    }
  } else {
    interactHint.style.display = 'none';
  }

  // Update HUD
  flamesVal.innerText = '🔥 '.repeat(Math.max(0, engine.player.flames));
  const mins = Math.floor(engine.time_left_s / 60);
  const secs = Math.floor(engine.time_left_s % 60);
  timeVal.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  if (engine.time_left_s <= 30) {
    document.getElementById('hud-top-center').classList.add('danger');
  } else {
    document.getElementById('hud-top-center').classList.remove('danger');
  }

  const reqLit = Math.ceil(0.6 * engine.lanterns.length);
  lanternsVal.innerText = `🏮 ${litCount}/${engine.lanterns.length} (Cần ${reqLit})`;
  scoreVal.innerText = `Điểm: ${engine.score}`;

  motesCount.innerText = engine.player.carried;

  // Build / update mote slots
  const cap = engine.capacity;
  if (moteSlotsContainer.children.length !== cap) {
    moteSlotsContainer.innerHTML = '';
    for (let i = 0; i < cap; i++) {
      const slot = document.createElement('div');
      slot.className = 'mote-slot';
      moteSlotsContainer.appendChild(slot);
    }
  }

  const slots = moteSlotsContainer.querySelectorAll('.mote-slot');
  slots.forEach((slot, idx) => {
    if (idx < engine.player.carried) {
      slot.classList.add('filled');
    } else {
      slot.classList.remove('filled');
    }
  });

  // Skill CDs
  dashCdUi.innerText = engine.player.charm_ticks > 0 ? '0s (Bùa)' : (engine.player.dash_cd_ticks > 0 ? `${(engine.player.dash_cd_ticks / 60).toFixed(1)}s` : 'Sẵn sàng');
  pulseCdUi.innerText = engine.player.pulse_cd_ticks > 0 ? `${(engine.player.pulse_cd_ticks / 60).toFixed(1)}s` : (engine.player.carried >= 3 ? 'Sẵn sàng' : 'Cần 3 đom đóm');

  if (engine.player.charm_ticks > 0) {
    charmBadge.style.display = 'block';
    charmCdUi.innerText = `Bùa Gió: ${(engine.player.charm_ticks / 60).toFixed(1)}s`;
  } else {
    charmBadge.style.display = 'none';
  }

  // Update edge screen pointers
  updateEdgePointers(engine.shades);

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
