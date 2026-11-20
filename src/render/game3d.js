import * as THREE from 'three';
import { GameEngine, round1 } from '../core/engine.js';
import { DEFAULT_TUNING } from '../core/constants.js';

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

let currentNight = 1;
let colorblindMode = false;

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

// Player visual
const playerGroup = new THREE.Group();
const bodyMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.4, 0.45, 1.2, 16),
  new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.5 })
);
bodyMesh.position.y = 0.6;
playerGroup.add(bodyMesh);

const hatMesh = new THREE.Mesh(
  new THREE.ConeGeometry(0.85, 0.45, 24),
  new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 })
);
hatMesh.position.y = 1.35;
playerGroup.add(hatMesh);

const handLantern = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.25, 0.2),
  new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xffe58a, emissiveIntensity: 1 })
);
handLantern.position.set(0.45, 0.7, 0.3);
playerGroup.add(handLantern);

const playerLight = new THREE.PointLight(0xffb347, 1.5, 7);
playerLight.position.set(0.45, 0.7, 0.3);
playerGroup.add(playerLight);
scene.add(playerGroup);

// Pulse Ring
const pulseRing = new THREE.Mesh(
  new THREE.RingGeometry(0.2, 0.5, 32),
  new THREE.MeshBasicMaterial({ color: 0xffe58a, side: THREE.DoubleSide, transparent: true, opacity: 0 })
);
pulseRing.rotation.x = -Math.PI / 2;
pulseRing.position.y = 0.05;
scene.add(pulseRing);
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

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 2.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x5b5f6e, roughness: 0.9 })
    );
    pillar.position.y = 1.25;
    g.add(pillar);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.0, 0.8),
      new THREE.MeshStandardMaterial({
        color: l.lit ? 0xffb347 : 0x5b5f6e,
        emissive: l.lit ? 0xffe58a : 0x000000,
        emissiveIntensity: l.lit ? 1.5 : 0
      })
    );
    head.position.y = 2.8;
    g.add(head);

    const light = new THREE.PointLight(0xffb347, l.lit ? 3 : 0, 16);
    light.position.y = 2.8;
    g.add(light);

    const safeRing = new THREE.Mesh(
      new THREE.RingGeometry(5.8, 6.0, 32),
      new THREE.MeshBasicMaterial({ color: 0xffb347, side: THREE.DoubleSide, transparent: true, opacity: (l.lit && l.fuel >= 30) ? 0.35 : 0 })
    );
    safeRing.rotation.x = -Math.PI / 2;
    safeRing.position.y = 0.03;
    g.add(safeRing);

    // Fuel Bar Billboard above lantern
    const fuelBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide })
    );
    fuelBg.position.set(0, 3.6, 0);

    const fuelFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.16, 0.11),
      new THREE.MeshBasicMaterial({ color: 0xf2c14e, side: THREE.DoubleSide })
    );
    fuelFill.position.set(0, 3.6, 0.01);
    g.add(fuelBg);
    g.add(fuelFill);

    scene.add(g);
    lanternMeshes.set(l.id, { group: g, head, light, safeRing, fuelBg, fuelFill });
  }
}

// Mote Visuals
const moteMeshes = new Map();
const moteGeo = new THREE.SphereGeometry(0.2, 12, 12);
const moteMat = new THREE.MeshStandardMaterial({ color: 0xfff6c2, emissive: 0xffe58a, emissiveIntensity: 1.5 });

function syncMotes(motes) {
  const activeIds = new Set(motes.map((m) => m.id));
  for (const [id, mesh] of moteMeshes.entries()) {
    if (!activeIds.has(id)) {
      scene.remove(mesh);
      moteMeshes.delete(id);
    }
  }

  for (const m of motes) {
    let mesh = moteMeshes.get(m.id);
    if (!mesh) {
      mesh = new THREE.Mesh(moteGeo, moteMat);
      scene.add(mesh);
      moteMeshes.set(m.id, mesh);
    }
    const bob = Math.sin(Date.now() * 0.005 + m.pos[0]) * 0.12;
    mesh.position.set(m.pos[0], m.pos[1] + 0.35 + bob, m.pos[2]);
  }
}

// Shade Visuals
const shadeMeshes = new Map();
const shadeGeo = new THREE.SphereGeometry(0.65, 16, 16);
const shadeMat = new THREE.MeshStandardMaterial({ color: 0x120a1a, emissive: 0x7a3cff, emissiveIntensity: 0.6 });

function syncShades(shades) {
  const activeIds = new Set(shades.map((s) => s.id));
  for (const [id, mesh] of shadeMeshes.entries()) {
    if (!activeIds.has(id)) {
      scene.remove(mesh);
      shadeMeshes.delete(id);
    }
  }

  const shadeAura = colorblindMode ? 0x00b3ff : 0x7a3cff;

  for (const s of shades) {
    let mesh = shadeMeshes.get(s.id);
    if (!mesh) {
      mesh = new THREE.Mesh(shadeGeo, shadeMat.clone());
      scene.add(mesh);
      shadeMeshes.set(s.id, mesh);
    }
    const bob = Math.sin(Date.now() * 0.003 + s.pos[2]) * 0.1;
    mesh.position.set(s.pos[0], s.pos[1] + 0.75 + bob, s.pos[2]);

    if (s.state === 'stunned') {
      mesh.material.emissive.setHex(0x3a3450);
      mesh.rotation.y += 0.1;
    } else if (s.state === 'drain') {
      mesh.material.emissive.setHex(0xf59e0b); // Pulsing amber while draining
      mesh.rotation.y += 0.05;
    } else {
      mesh.material.emissive.setHex(shadeAura);
    }
  }
}

// Drifter Visuals (Gió Lạc)
const drifterMeshes = new Map();
const drifterGeo = new THREE.CylinderGeometry(0.15, 0.4, 1.2, 12);
const drifterMat = new THREE.MeshStandardMaterial({ color: 0x8fa3b8, emissive: 0x38bdf8, emissiveIntensity: 0.8 });

function syncDrifters(drifters) {
  const activeIds = new Set(drifters.map((d) => d.id));
  for (const [id, mesh] of drifterMeshes.entries()) {
    if (!activeIds.has(id)) {
      scene.remove(mesh);
      drifterMeshes.delete(id);
    }
  }

  for (const d of drifters) {
    let mesh = drifterMeshes.get(d.id);
    if (!mesh) {
      mesh = new THREE.Mesh(drifterGeo, drifterMat.clone());
      scene.add(mesh);
      drifterMeshes.set(d.id, mesh);
    }
    const bob = Math.sin(Date.now() * 0.006 + d.pos[0]) * 0.15;
    mesh.position.set(d.pos[0], d.pos[1] + bob, d.pos[2]);
    mesh.rotation.z = Math.PI / 4;
    mesh.rotation.y += 0.05;
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

// Input State
const keys = {};
let jumpRequested = false;
let dashRequested = false;
let interactRequested = false;
let pulseRequested = false;
let pauseRequested = false;

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') jumpRequested = true;
  if (e.code === 'ShiftLeft' || e.code === 'KeyJ') dashRequested = true;
  if (e.code === 'KeyE') interactRequested = true;
  if (e.code === 'KeyQ') pulseRequested = true;
  if (e.code === 'Escape' || e.code === 'KeyP') pauseRequested = true;
  if (e.code === 'KeyR' && (engine.state === 'won' || engine.state === 'lost')) {
    initNight(currentNight);
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

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
    if (keys['KeyW'] || keys['ArrowUp']) moveZ += 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveZ -= 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX += 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX -= 1;

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
        if (evt.data.by === 'fall') {
          showNotif('Rơi khỏi đảo! Mất 1 ngọn lửa và toàn bộ đom đóm', true);
        } else {
          showNotif(`Bị Bóng Mực cắn! Mất 1 ngọn lửa, rơi ${evt.data.dropped} đom đóm`, true);
        }
      } else if (evt.name === 'paused') {
        pauseOverlay.style.display = 'flex';
      } else if (evt.name === 'resumed') {
        pauseOverlay.style.display = 'none';
      } else if (evt.name === 'game_over') {
        overlay.style.display = 'flex';
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
  }

  // Visual position updates
  playerGroup.position.set(engine.player.pos[0], engine.player.pos[1], engine.player.pos[2]);

  if (lastMoveX !== 0 || lastMoveZ !== 0) {
    playerGroup.rotation.y = Math.atan2(lastMoveX, lastMoveZ);
  }

  // Camera Follow
  const targetCamX = engine.player.pos[0];
  const targetCamY = engine.player.pos[1] + 9.0;
  const targetCamZ = engine.player.pos[2] - 13.0;

  camera.position.x += (targetCamX - camera.position.x) * 0.1;
  camera.position.y += (targetCamY - camera.position.y) * 0.1;
  camera.position.z += (targetCamZ - camera.position.z) * 0.1;
  camera.lookAt(engine.player.pos[0], engine.player.pos[1] + 1.0, engine.player.pos[2]);

  // Pulse animation
  if (pulseAnim.active) {
    pulseAnim.radius += 0.25;
    pulseAnim.opacity -= 0.03;
    pulseRing.scale.set(pulseAnim.radius, pulseAnim.radius, 1);
    pulseRing.position.set(engine.player.pos[0], engine.player.pos[1] + 0.05, engine.player.pos[2]);
    pulseRing.material.opacity = Math.max(0, pulseAnim.opacity);
    if (pulseAnim.opacity <= 0) pulseAnim.active = false;
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
      if (l.lit) {
        lm.head.material.color.setHex(0xffb347);
        lm.head.material.emissive.setHex(0xffe58a);
        lm.head.material.emissiveIntensity = 1.5;
        lm.light.intensity = 3.5;

        // Blinking if low fuel (< 30)
        if (l.fuel < 30) {
          const blink = (Math.sin(Date.now() * 0.006) + 1) / 2;
          lm.light.intensity = 1.0 + 2.5 * blink;
          lm.safeRing.material.opacity = 0; // Lost safe zone
          lm.fuelFill.material.color.setHex(0xff5a5f); // Red fuel bar
        } else {
          lm.safeRing.material.opacity = 0.35;
          lm.fuelFill.material.color.setHex(0xf2c14e);
        }

        lm.fuelBg.visible = true;
        lm.fuelFill.visible = true;
        const scaleX = Math.max(0.01, l.fuel / 100);
        lm.fuelFill.scale.set(scaleX, 1, 1);
        lm.fuelFill.position.x = -0.58 + (scaleX * 1.16) / 2;
      } else {
        lm.head.material.color.setHex(0x5b5f6e);
        lm.head.material.emissive.setHex(0x000000);
        lm.head.material.emissiveIntensity = 0;
        lm.light.intensity = 0;
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

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
