import * as THREE from 'three';
import { GameEngine } from '../core/engine.js';
import { DEFAULT_TUNING } from '../core/constants.js';

// Setup DOM elements
const container = document.getElementById('game-container');
const flamesVal = document.getElementById('flames-val');
const motesVal = document.getElementById('motes-val');
const lanternsVal = document.getElementById('lanterns-val');
const timeVal = document.getElementById('time-val');
const scoreVal = document.getElementById('score-val');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const overlayStats = document.getElementById('overlay-stats');
const restartBtn = document.getElementById('restart-btn');
const notification = document.getElementById('notification');

let notifTimeout = null;
function showNotif(text, isDanger = false) {
  notification.innerText = text;
  notification.style.background = isDanger ? 'rgba(239, 68, 68, 0.9)' : 'rgba(245, 158, 11, 0.9)';
  notification.style.color = isDanger ? '#fff' : '#000';
  notification.style.opacity = '1';
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => {
    notification.style.opacity = '0';
  }, 1500);
}

// 1. Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080914);
scene.fog = new THREE.FogExp2(0x080914, 0.02);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// 2. Lighting
const ambientLight = new THREE.AmbientLight(0x2d3748, 1.2);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x6366f1, 0.8);
moonLight.position.set(20, 40, 20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 1024;
moonLight.shadow.mapSize.height = 1024;
scene.add(moonLight);

// 3. Environment: Island Ground
const islandRadius = 35.0;
const islandGeo = new THREE.CylinderGeometry(islandRadius, islandRadius + 2, 2, 64);
const islandMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  roughness: 0.8,
  metalness: 0.1
});
const islandMesh = new THREE.Mesh(islandGeo, islandMat);
islandMesh.position.y = -1;
islandMesh.receiveShadow = true;
scene.add(islandMesh);

// Glowing boundary ring
const ringGeo = new THREE.RingGeometry(islandRadius - 0.2, islandRadius + 0.2, 64);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
const ringMesh = new THREE.Mesh(ringGeo, ringMat);
ringMesh.rotation.x = -Math.PI / 2;
ringMesh.position.y = 0.02;
scene.add(ringMesh);

// 4. Character Mây (Yellow capsule + bamboo cone hat + hand lantern)
const playerGroup = new THREE.Group();

// Body
const bodyGeo = new THREE.CylinderGeometry(0.4, 0.45, 1.2, 16);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
bodyMesh.position.y = 0.6;
bodyMesh.castShadow = true;
playerGroup.add(bodyMesh);

// Conical Hat (Nón lá)
const hatGeo = new THREE.ConeGeometry(0.85, 0.45, 24);
const hatMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
const hatMesh = new THREE.Mesh(hatGeo, hatMat);
hatMesh.position.y = 1.35;
hatMesh.castShadow = true;
playerGroup.add(hatMesh);

// Little Lantern on hand
const miniLantern = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.25, 0.2),
  new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1 })
);
miniLantern.position.set(0.45, 0.7, 0.3);
playerGroup.add(miniLantern);

const playerLight = new THREE.PointLight(0xfbbf24, 1.5, 6);
playerLight.position.set(0.45, 0.7, 0.3);
playerGroup.add(playerLight);

scene.add(playerGroup);

// Pulse Visual Wave
const pulseGeo = new THREE.RingGeometry(0.2, 0.5, 32);
const pulseMat = new THREE.MeshBasicMaterial({
  color: 0xfde047,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0
});
const pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
pulseRing.rotation.x = -Math.PI / 2;
pulseRing.position.y = 0.05;
scene.add(pulseRing);
let pulseAnim = { active: false, radius: 0, opacity: 0 };

// 5. Large Lanterns Visuals
const lanternMeshes = new Map();
function createLanternMesh(lanternData) {
  const g = new THREE.Group();
  g.position.set(lanternData.pos[0], 0, lanternData.pos[2]);

  // Pillar
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.35, 2.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
  );
  pillar.position.y = 1.25;
  pillar.castShadow = true;
  g.add(pillar);

  // Lantern Head (Box)
  const headGeo = new THREE.BoxGeometry(0.8, 1.0, 0.8);
  const headMat = new THREE.MeshStandardMaterial({
    color: lanternData.lit ? 0xf59e0b : 0x334155,
    emissive: lanternData.lit ? 0xf59e0b : 0x000000,
    emissiveIntensity: lanternData.lit ? 1.5 : 0,
    roughness: 0.4
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.8;
  head.castShadow = true;
  g.add(head);

  // Lantern Point Light
  const pLight = new THREE.PointLight(0xf59e0b, lanternData.lit ? 3 : 0, 16);
  pLight.position.y = 2.8;
  g.add(pLight);

  // Safe Zone Ring (Ground)
  const safeRing = new THREE.Mesh(
    new THREE.RingGeometry(4.8, 5.0, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: lanternData.lit ? 0.3 : 0
    })
  );
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.03;
  g.add(safeRing);

  scene.add(g);
  lanternMeshes.set(lanternData.id, { group: g, head, light: pLight, safeRing });
}

// 6. Motes Visuals
const moteMeshes = new Map();
const moteGeo = new THREE.SphereGeometry(0.2, 12, 12);
const moteMat = new THREE.MeshStandardMaterial({
  color: 0xfef08a,
  emissive: 0xfacc15,
  emissiveIntensity: 1.5
});

function syncMotes(motes) {
  const activeIds = new Set(motes.map((m) => m.id));
  for (const [id, mesh] of moteMeshes.entries()) {
    if (!activeIds.has(id)) {
      scene.remove(mesh);
      moteMeshes.delete(id);
    }
  }

  for (const mote of motes) {
    let mesh = moteMeshes.get(mote.id);
    if (!mesh) {
      mesh = new THREE.Mesh(moteGeo, moteMat);
      scene.add(mesh);
      moteMeshes.set(mote.id, mesh);
    }
    const bob = Math.sin(Date.now() * 0.005 + mote.pos[0]) * 0.15;
    mesh.position.set(mote.pos[0], 0.35 + bob, mote.pos[2]);
  }
}

// 7. Shades Visuals
const shadeMeshes = new Map();
const shadeGeo = new THREE.SphereGeometry(0.65, 16, 16);
const shadeMat = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  emissive: 0x7c3aed,
  emissiveIntensity: 0.6,
  roughness: 0.3
});

function syncShades(shades) {
  const activeIds = new Set(shades.map((s) => s.id));
  for (const [id, mesh] of shadeMeshes.entries()) {
    if (!activeIds.has(id)) {
      scene.remove(mesh);
      shadeMeshes.delete(id);
    }
  }

  for (const s of shades) {
    let mesh = shadeMeshes.get(s.id);
    if (!mesh) {
      mesh = new THREE.Mesh(shadeGeo, shadeMat);
      mesh.castShadow = true;
      scene.add(mesh);
      shadeMeshes.set(s.id, mesh);
    }
    const bob = Math.sin(Date.now() * 0.003 + s.pos[2]) * 0.1;
    mesh.position.set(s.pos[0], 0.75 + bob, s.pos[2]);

    if (s.state === 'stunned') {
      mesh.material.emissive.setHex(0x38bdf8);
      mesh.rotation.y += 0.1;
    } else {
      mesh.material.emissive.setHex(0x7c3aed);
    }
  }
}

// 8. Game Engine Instance
let engine = new GameEngine();

// Initialize visual lanterns
for (const l of engine.lanterns) {
  createLanternMesh(l);
}

// 9. Input State Tracking
const keys = {};
let interactRequested = false;
let pulseRequested = false;

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE') interactRequested = true;
  if (e.code === 'Space' || e.code === 'KeyQ') pulseRequested = true;
  if (e.code === 'KeyR' && engine.state !== 'playing') {
    restartGame();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

restartBtn.addEventListener('click', restartGame);

function restartGame() {
  overlay.style.display = 'none';
  engine = new GameEngine();

  // Reset visual lanterns
  for (const l of engine.lanterns) {
    const lm = lanternMeshes.get(l.id);
    if (lm) {
      lm.head.material.color.setHex(0x334155);
      lm.head.material.emissive.setHex(0x000000);
      lm.head.material.emissiveIntensity = 0;
      lm.light.intensity = 0;
      lm.safeRing.material.opacity = 0;
    }
  }
  showNotif('Trò chơi mới bắt đầu!');
}

// 10. Game Loop (60Hz fixed simulation + variable render)
let lastTime = performance.now();
let accumulator = 0;
const TICK_DURATION = 1000 / 60;

function animate(currentTime) {
  requestAnimationFrame(animate);

  const delta = Math.min(currentTime - lastTime, 100);
  lastTime = currentTime;
  accumulator += delta;

  while (accumulator >= TICK_DURATION) {
    accumulator -= TICK_DURATION;

    // Gather keyboard inputs
    let moveX = 0;
    let moveZ = 0;
    if (keys['KeyW'] || keys['ArrowUp']) moveZ += 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveZ -= 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

    const input = {
      move: [moveX, moveZ],
      cam_yaw_deg: 0,
      interact: interactRequested,
      pulse: pulseRequested
    };

    if (pulseRequested) {
      pulseAnim = {
        active: true,
        radius: 0.5,
        opacity: 0.8
      };
    }

    interactRequested = false;
    pulseRequested = false;

    // Engine Step
    const events = engine.step(input);

    // Process events for UI feedback
    for (const evt of events) {
      if (evt.name === 'mote_picked') {
        showNotif(`Nhặt đom đóm (+10đ, đang có: ${evt.data.carried})`);
      } else if (evt.name === 'deposit') {
        showNotif(`Nạp ${evt.data.amount} đom đóm vào đèn ${evt.data.lantern_id}`);
      } else if (evt.name === 'lantern_lit') {
        showNotif(`ĐÈN ${evt.data.lantern_id} ĐÃ THẮP SÁNG! (+100đ)`);
        const lm = lanternMeshes.get(evt.data.lantern_id);
        if (lm) {
          lm.head.material.color.setHex(0xf59e0b);
          lm.head.material.emissive.setHex(0xf59e0b);
          lm.head.material.emissiveIntensity = 2;
          lm.light.intensity = 4;
          lm.safeRing.material.opacity = 0.4;
        }
      } else if (evt.name === 'pulse') {
        if (evt.data.stunned_ids.length > 0) {
          showNotif(`Tỏa sáng làm choáng ${evt.data.stunned_ids.length} Bóng Mực! (+${evt.data.stunned_ids.length * 25}đ)`);
        } else {
          showNotif('Tỏa sáng!');
        }
      } else if (evt.name === 'player_hit') {
        showNotif(`Bị Bóng Mực chạm! Mất 1 ngọn lửa (-${evt.data.dropped} đom đóm)`, true);
      } else if (evt.name === 'game_over') {
        overlay.style.display = 'flex';
        if (evt.data.result === 'won') {
          overlayTitle.innerText = 'CHIẾN THẮNG!';
          overlayTitle.style.color = '#fbbf24';
          overlayDesc.innerText = 'Mây đã thắp sáng cả 5 Đèn Lồng Lớn trên Đảo Bến!';
        } else {
          overlayTitle.innerText = 'THẤT BẠI!';
          overlayTitle.style.color = '#ef4444';
          overlayDesc.innerText = evt.data.reason === 'no_flames' ? 'Mây đã kiệt sức và mất hết ngọn lửa!' : 'Bình minh đã đến trước khi kịp thắp đèn!';
        }
        overlayStats.innerHTML = `
          <strong>Tổng điểm: ${engine.score}</strong><br>
          Thời gian còn lại: ${Math.round(engine.time_left_s)} giây<br>
          Số ngọn lửa còn lại: ${engine.player.flames}
        `;
      }
    }
  }

  // Visual position updates
  playerGroup.position.set(engine.player.pos[0], 0, engine.player.pos[2]);

  // Turn player towards move direction
  if (keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD']) {
    let angle = 0;
    if (keys['KeyW']) angle = 0;
    if (keys['KeyS']) angle = Math.PI;
    if (keys['KeyA']) angle = Math.PI / 2;
    if (keys['KeyD']) angle = -Math.PI / 2;
    playerGroup.rotation.y = angle;
  }

  // Smooth Third-person Camera Follow
  const targetCamX = engine.player.pos[0];
  const targetCamY = 8.5;
  const targetCamZ = engine.player.pos[2] - 12;

  camera.position.x += (targetCamX - camera.position.x) * 0.1;
  camera.position.y += (targetCamY - camera.position.y) * 0.1;
  camera.position.z += (targetCamZ - camera.position.z) * 0.1;
  camera.lookAt(engine.player.pos[0], 1.0, engine.player.pos[2]);

  // Update Pulse Ring Animation
  if (pulseAnim.active) {
    pulseAnim.radius += 0.25;
    pulseAnim.opacity -= 0.03;
    pulseRing.scale.set(pulseAnim.radius, pulseAnim.radius, 1);
    pulseRing.position.set(engine.player.pos[0], 0.05, engine.player.pos[2]);
    pulseRing.material.opacity = Math.max(0, pulseAnim.opacity);
    if (pulseAnim.opacity <= 0) {
      pulseAnim.active = false;
    }
  }

  // Sync Entities
  syncMotes(engine.motes);
  syncShades(engine.shades);

  // Update HUD
  flamesVal.innerText = '🔥 '.repeat(Math.max(0, engine.player.flames));
  motesVal.innerText = `🟡 ${engine.player.carried} / ${DEFAULT_TUNING.carry_capacity}`;
  const litCount = engine.lanterns.filter((l) => l.lit).length;
  lanternsVal.innerText = `🏮 ${litCount} / 5`;

  const mins = Math.floor(engine.time_left_s / 60);
  const secs = Math.floor(engine.time_left_s % 60);
  timeVal.innerText = `⏳ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  scoreVal.innerText = `🏆 ${engine.score}`;

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
