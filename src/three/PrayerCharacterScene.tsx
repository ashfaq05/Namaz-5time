import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import type { CharacterModelId, MadhhabId, PoseId } from '../types/namaz';

export type CameraPreset = 'three_quarter' | 'front' | 'side';

interface PrayerCharacterSceneProps {
  pose: PoseId;
  madhhab: MadhhabId;
  theme: 'light' | 'dark';
  quality?: 'standard' | 'high';
  modelId?: CharacterModelId;
  cameraPreset?: CameraPreset;
  className?: string;
  compact?: boolean;
  fullScreenMode?: boolean;
  caption?: string;
}

/**
 * Signed local Euler rotations (radians) for the articulated character rig.
 * Coordinate convention:
 * - Character faces -Z (toward Qibla / top of prayer mat).
 * - Character's Right = +X, Left = -X, Up = +Y.
 * - For segments extending +Y (pelvis, torso, head): negative X rotation pitches FORWARD (-Z).
 * - For segments extending -Y (upper arm, forearm, thigh, shin): positive X rotation swings FORWARD (-Z), negative swings BACKWARD (+Z).
 */
interface JointTargets {
  pelvisX: number;
  pelvisZ: number;
  torsoX: number;
  headX: number;
  headY: number;

  lShoulderX: number;
  lShoulderY: number;
  lShoulderZ: number;
  lElbowX: number;
  lForearmY: number;
  lWristX: number;
  lWristZ: number;

  rShoulderX: number;
  rShoulderY: number;
  rShoulderZ: number;
  rElbowX: number;
  rForearmY: number;
  rWristX: number;
  rWristZ: number;

  rFingersCurl: number;
  rIndexCurl: number;
  lFingersCurl: number;

  lHipX: number;
  lHipZ: number;
  lKneeX: number;
  lAnkleX: number;
  lAnkleY: number;
  lAnkleZ: number;
  lToesX: number;

  rHipX: number;
  rHipZ: number;
  rKneeX: number;
  rAnkleX: number;
  rAnkleY: number;
  rAnkleZ: number;
  rToesX: number;
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function getPoseTargets(pose: PoseId, madhhab: MadhhabId): JointTargets {
  const standing: JointTargets = {
    pelvisX: 0,
    pelvisZ: 0,
    torsoX: 0,
    headX: -0.18, // Calm gaze directed down toward the place of Sujud
    headY: 0,

    lShoulderX: 0.05,
    lShoulderY: 0,
    lShoulderZ: -0.09, // Flare left arm slightly outward (-X)
    lElbowX: 0.1,
    lForearmY: 0,
    lWristX: 0,
    lWristZ: 0,

    rShoulderX: 0.05,
    rShoulderY: 0,
    rShoulderZ: 0.09, // Flare right arm slightly outward (+X)
    rElbowX: 0.1,
    rForearmY: 0,
    rWristX: 0,
    rWristZ: 0,

    rFingersCurl: 0.1,
    rIndexCurl: 0.1,
    lFingersCurl: 0.1,

    lHipX: 0,
    lHipZ: -0.015,
    lKneeX: -0.02,
    lAnkleX: 0.02,
    lAnkleY: 0,
    lAnkleZ: 0,
    lToesX: 0,

    rHipX: 0,
    rHipZ: 0.015,
    rKneeX: -0.02,
    rAnkleX: 0.02,
    rAnkleY: 0,
    rAnkleZ: 0,
    rToesX: 0,
  };

  if (pose === 'intention' || pose === 'qawmah') {
    return standing;
  }

  if (pose === 'takbir') {
    const isHanafi = madhhab === 'hanafi';
    return {
      ...standing,
      headX: -0.14,
      lShoulderX: isHanafi ? 1.48 : 1.18,
      lShoulderY: -0.12,
      lShoulderZ: -0.45,
      lElbowX: 1.58,
      lForearmY: 1.42, // Turn left palm forward toward Qibla (-Z)
      lWristX: -0.1,

      rShoulderX: isHanafi ? 1.48 : 1.18,
      rShoulderY: 0.12,
      rShoulderZ: 0.45,
      rElbowX: 1.58,
      rForearmY: -1.42, // Turn right palm forward toward Qibla (-Z)
      rWristX: -0.1,
    };
  }

  if (pose === 'qiyam') {
    if (madhhab === 'maliki') {
      // Sadl: arms resting naturally at the sides
      return standing;
    }

    const isHanafi = madhhab === 'hanafi';
    // Hanafi: hands folded below navel, right hand over left wrist
    // Shafi'i / Hanbali: hands folded above navel / lower chest
    return {
      ...standing,
      lShoulderX: isHanafi ? 0.12 : 0.28,
      lShoulderY: -1.16, // Swings left forearm horizontally across front (+X)
      lShoulderZ: -0.16,
      lElbowX: isHanafi ? 1.24 : 1.52,
      lForearmY: 0.5, // Left palm faces inward against abdomen
      lWristZ: 0.1,

      rShoulderX: isHanafi ? 0.19 : 0.35, // Slightly further forward so right hand rests over left wrist
      rShoulderY: 1.2, // Swings right forearm horizontally across front (-X)
      rShoulderZ: 0.16,
      rElbowX: isHanafi ? 1.28 : 1.56,
      rForearmY: -0.6, // Right palm rests over back of left wrist
      rWristZ: -0.12,
      rFingersCurl: 0.45,
      rIndexCurl: 0.4,
    };
  }

  if (pose === 'ruku') {
    // 90-degree flat horizontal back, legs straight, hands gripping knees firmly
    return {
      ...standing,
      pelvisX: -1.5, // -86 deg forward at hip
      torsoX: -0.06, // -89.4 deg flat tabletop spine
      headX: 0.04, // Neck & head aligned level with flat spine
      headY: 0,

      lShoulderX: 0.78, // World angle ~ -0.78 (-45 deg), reaching straight down+back onto left knee
      lShoulderY: 0,
      lShoulderZ: 0.14, // Angled slightly inward to meet kneecap
      lElbowX: 0.08,
      lWristX: -0.55, // Palm cups kneecap

      rShoulderX: 0.78,
      rShoulderY: 0,
      rShoulderZ: -0.14,
      rElbowX: 0.08,
      rWristX: -0.55,

      rFingersCurl: 0.55,
      rIndexCurl: 0.55,
      lFingersCurl: 0.55,

      lHipX: 1.5, // Cancels pelvisX so thighs remain vertical
      lHipZ: -0.015,
      lKneeX: -0.04,
      lAnkleX: 0.04,

      rHipX: 1.5,
      rHipZ: 0.015,
      rKneeX: -0.04,
      rAnkleX: 0.04,
    };
  }

  if (pose === 'sujud') {
    // 7 points of contact on the prayer mat (all aligned to y ≈ -0.488 in pelvis space):
    // forehead+nose, 2 flat palms beside head, 2 knees, 2 curled toes; elbows lifted off mat.
    return {
      ...standing,
      pelvisX: -1.92,
      torsoX: -0.3, // Total spine = -2.22 rad (-127 deg), bringing forehead cleanly onto mat
      headX: 0.6, // Face, forehead, and nose rest parallel on the mat
      headY: 0,

      // Upper arms reach down+out+back to lifted elbows; forearms angle forward onto mat beside head
      lShoulderX: 1.25,
      lShoulderY: 0.16,
      lShoulderZ: -0.34, // Elbows clear of ribs and lifted off mat
      lElbowX: 2.31,
      lForearmY: 1.45, // Palms face flat downward onto mat
      lWristX: 0.23,

      rShoulderX: 1.25,
      rShoulderY: -0.16,
      rShoulderZ: 0.34,
      rElbowX: 2.31,
      rForearmY: -1.45,
      rWristX: 0.23,

      rFingersCurl: 0.06,
      rIndexCurl: 0.06,
      lFingersCurl: 0.06,

      // Knees grounded, shins horizontal/slightly up to ankles, feet upright on curled toes
      lHipX: 2.12, // World thigh angle = +0.20 rad
      lHipZ: -0.06,
      lKneeX: -1.86, // World shin angle = -1.66 rad
      lAnkleX: -0.42,
      lToesX: 1.55, // Toes curled forward (-Z) flat on mat

      rHipX: 2.12,
      rHipZ: 0.06,
      rKneeX: -1.86,
      rAnkleX: -0.42,
      rToesX: 1.55,
    };
  }

  if (pose === 'jalsa' || pose === 'tashahhud' || pose === 'salam_right' || pose === 'salam_left') {
    const isTashahhud = pose === 'tashahhud';
    const isTawarruk =
      (pose === 'tashahhud' || pose === 'salam_right' || pose === 'salam_left') &&
      (madhhab === 'shafii' || madhhab === 'maliki');
    const isSalam = pose === 'salam_right' || pose === 'salam_left';
    const yaw = pose === 'salam_right' ? -1.18 : pose === 'salam_left' ? 1.18 : 0;

    return {
      ...standing,
      pelvisX: -0.04,
      pelvisZ: isTawarruk ? 0.08 : 0, // Slight shift onto left hip in Tawarruk
      torsoX: -0.03,
      headX: isSalam ? -0.1 : -0.28, // Calm downward gaze toward lap / right index finger
      headY: yaw,

      // Hands rest naturally on top of the thighs near the knees
      lShoulderX: 0.2,
      lShoulderY: -0.1,
      lShoulderZ: -0.08,
      lElbowX: 0.65,
      lForearmY: 1.35, // Left palm flat down on left thigh
      lWristX: 0.38,

      rShoulderX: 0.2,
      rShoulderY: 0.1,
      rShoulderZ: 0.08,
      rElbowX: 0.65,
      rForearmY: isTashahhud ? -0.35 : -1.35, // In Tashahhud thumb/middle ring upright; else flat on right thigh
      rWristX: isTashahhud ? 0.2 : 0.38,

      rFingersCurl: isTashahhud ? 1.35 : 0.18, // Middle/ring/pinky curled in Tashahhud
      rIndexCurl: isTashahhud ? -0.12 : 0.18, // Right index finger raised & pointing in Tashahhud
      lFingersCurl: 0.15,

      // Knees grounded on mat (y ≈ -0.225); shins angle gently up to tucked left foot & upright right foot on curled toes
      lHipX: 1.28, // Thigh world = +1.24 rad
      lHipZ: isTawarruk ? -0.12 : -0.05,
      lKneeX: -2.94, // Shin world = -1.70 rad
      lAnkleX: -1.45, // Left foot lies flat under body (Iftirash)
      lAnkleY: isTawarruk ? -0.82 : -0.45, // Tucked inward under pelvis / across in Tawarruk
      lAnkleZ: -0.18,
      lToesX: 0.15,

      rHipX: 1.28,
      rHipZ: 0.05,
      rKneeX: -2.94,
      rAnkleX: -0.2, // Right foot stays upright on curled toes facing Qibla
      rAnkleY: 0,
      rAnkleZ: 0,
      rToesX: 1.45,
    };
  }

  return standing;
}

function createPrayerMatTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  ctx.fillStyle = '#184b3c';
  ctx.fillRect(0, 0, 512, 1024);

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < 1024; y += 4) {
    ctx.fillRect(0, y, 512, 1);
  }

  ctx.strokeStyle = '#c8a45d';
  ctx.lineWidth = 14;
  ctx.strokeRect(24, 24, 464, 976);

  ctx.strokeStyle = '#e7dfd0';
  ctx.lineWidth = 4;
  ctx.strokeRect(46, 46, 420, 932);

  ctx.fillStyle = '#123a2e';
  ctx.fillRect(62, 62, 388, 900);

  // Mihrab arch pointing toward Qibla (-Z / top of texture)
  ctx.beginPath();
  ctx.moveTo(94, 910);
  ctx.lineTo(94, 340);
  ctx.quadraticCurveTo(94, 175, 256, 110);
  ctx.quadraticCurveTo(418, 175, 418, 340);
  ctx.lineTo(418, 910);
  ctx.closePath();
  ctx.fillStyle = '#1c5645';
  ctx.fill();
  ctx.strokeStyle = '#c8a45d';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.save();
  ctx.translate(256, 540);
  ctx.strokeStyle = 'rgba(200, 164, 93, 0.48)';
  ctx.lineWidth = 3;
  ctx.strokeRect(-65, -65, 130, 130);
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-65, -65, 130, 130);
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#d8b774';
  ctx.beginPath();
  ctx.moveTo(256, 134);
  ctx.lineTo(276, 170);
  ctx.lineTo(236, 170);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createEmbroideryTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#e5ded0';
    g.fillRect(0, 0, 128, 256);

    // Subtle vertical woven borders
    g.fillStyle = '#c8bda4';
    g.fillRect(4, 0, 6, 256);
    g.fillRect(118, 0, 6, 256);

    // Repeating geometric diamond / arabesque embroidery weave
    g.strokeStyle = '#b4a586';
    g.lineWidth = 3;
    for (let y = 16; y < 256; y += 32) {
      g.beginPath();
      g.moveTo(64, y - 12);
      g.lineTo(98, y);
      g.lineTo(64, y + 12);
      g.lineTo(30, y);
      g.closePath();
      g.stroke();

      g.fillStyle = '#f5f0e4';
      g.beginPath();
      g.arc(64, y, 4.5, 0, Math.PI * 2);
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.65, 'rgba(0,0,0,0.62)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

function frameWhole(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  stage: { x: number; y: number; w: number; h: number },
  canvas: { w: number; h: number },
  {
    fill = 0.78,
    baseFov = 32,
    dir = new THREE.Vector3(1.12, 0.5, -1.42),
  } = {},
): { target: THREE.Vector3; radius: number; dist: number } {
  _box.setFromObject(object);
  _box.getSize(_size);
  const target = _box.getCenter(new THREE.Vector3());
  if (!(stage.w > 0 && stage.h > 0 && _size.lengthSq() > 0 && Number.isFinite(_size.lengthSq()))) {
    return { target, radius: 1, dist: 3.6 };
  }
  const r = _size.length() / 2;
  const rXZ = Math.hypot(_size.x, _size.z) / 2;
  const aspect = stage.w / stage.h;
  const t = Math.tan(THREE.MathUtils.degToRad(baseFov) / 2);
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(t * Math.max(1, rXZ / r / aspect)));
  camera.setViewOffset(stage.w, stage.h, -stage.x, -stage.y, canvas.w, canvas.h);

  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const th = tv * aspect;
  const n = (dir.lengthSq() > 0 && Number.isFinite(dir.lengthSq())
    ? dir.clone()
    : new THREE.Vector3(1.12, 0.5, -1.42)
  ).normalize();

  const sinEl = Math.abs(n.y);
  const cosEl = Math.sqrt(Math.max(0, 1 - sinEl * sinEl));
  const guard = Math.max(
    rXZ / (0.92 * Math.sin(Math.atan(th))),
    ((_size.y / 2) * cosEl + rXZ * sinEl) / (0.92 * tv) + rXZ * cosEl,
  );

  const p = new THREE.Vector3();
  let dist = Math.max(guard, r * 1.45);
  for (let i = 0; i < 4; i++) {
    camera.position.copy(target).addScaledVector(n, dist);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let k = 0; k < 8; k++) {
      p.set(
        k & 1 ? _box.max.x : _box.min.x,
        k & 2 ? _box.max.y : _box.min.y,
        k & 4 ? _box.max.z : _box.min.z,
      ).applyMatrix4(camera.matrixWorldInverse);
      x0 = Math.min(x0, p.x / -p.z);
      x1 = Math.max(x1, p.x / -p.z);
      y0 = Math.min(y0, p.y / -p.z);
      y1 = Math.max(y1, p.y / -p.z);
    }
    dist = Math.max(guard, (dist * Math.max((x1 - x0) / th, (y1 - y0) / tv)) / (2 * fill));
  }

  camera.position.copy(target).addScaledVector(n, dist);
  camera.near = Math.max(1e-4, dist / 100);
  camera.far = dist * 100;
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  return { target, radius: r, dist };
}

function getCameraDirectionForPreset(preset: CameraPreset): THREE.Vector3 {
  // Character faces -Z (toward Qibla), so Front & 3/4 views look from -Z toward +Z!
  if (preset === 'front') return new THREE.Vector3(0.05, 0.34, -1.75);
  if (preset === 'side') return new THREE.Vector3(1.75, 0.3, -0.08);
  return new THREE.Vector3(1.12, 0.5, -1.42);
}

export function PrayerCharacterScene({
  pose,
  madhhab,
  theme,
  quality = 'high',
  modelId = 'embroidered_thobe',
  cameraPreset = 'three_quarter',
  className = '',
  compact = false,
  fullScreenMode = false,
  caption,
}: PrayerCharacterSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPreset>(cameraPreset);
  const [controlsHidden, setControlsHidden] = useState(false);

  const poseRef = useRef<PoseId>(pose);
  const madhhabRef = useRef<MadhhabId>(madhhab);
  const themeRef = useRef<'light' | 'dark'>(theme);
  const presetTriggerRef = useRef<((preset: CameraPreset) => void) | null>(null);

  useEffect(() => {
    poseRef.current = pose;
    madhhabRef.current = madhhab;
  }, [pose, madhhab]);

  useEffect(() => {
    setActivePreset(cameraPreset);
    presetTriggerRef.current?.(cameraPreset);
  }, [cameraPreset]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl && quality === 'high',
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.5),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const groundHex = themeRef.current === 'dark' ? 0x1a2220 : 0xf2ede3;
    scene.background = new THREE.Color(groundHex);
    scene.fog = new THREE.Fog(groundHex, 6.5, 16);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.88;
    roomEnv.dispose();
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI * 0.47;

    // 3-point lighting rig illuminating front (-Z) and 3/4 faces cleanly
    const keyLight = new THREE.DirectionalLight(0xfff4e2, 1.24);
    keyLight.position.set(2.6, 4.6, -3.4);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.camera.left = -2.2;
    keyLight.shadow.camera.right = 2.2;
    keyLight.shadow.camera.top = 2.6;
    keyLight.shadow.camera.bottom = -2.2;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xe5efff, 0x4b4238, 0.48);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(
      0xe6effa,
      themeRef.current === 'dark' ? 1.0 : 0.45,
    );
    rimLight.position.set(-2.4, 3.0, 3.2);
    scene.add(rimLight);

    // Ground shadow catcher
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.22 });
    const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), shadowPlaneMat);
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.receiveShadow = true;
    shadowFloor.renderOrder = 1;
    scene.add(shadowFloor);

    // Hero group (Prayer Mat + Articulated Character)
    const heroGroup = new THREE.Group();
    scene.add(heroGroup);

    // Prayer Mat (Sajjadah)
    const matTex = createPrayerMatTexture();
    matTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const matGeo = new THREE.BoxGeometry(0.76, 0.02, 1.24);
    const matTopMat = new THREE.MeshStandardMaterial({
      map: matTex,
      roughness: 0.86,
      metalness: 0.0,
    });
    const matSideMat = new THREE.MeshStandardMaterial({
      color: 0x164134,
      roughness: 0.9,
      metalness: 0.0,
    });
    const prayerMat = new THREE.Mesh(matGeo, [
      matSideMat,
      matSideMat,
      matTopMat,
      matSideMat,
      matSideMat,
      matSideMat,
    ]);
    prayerMat.position.y = 0.01;
    prayerMat.receiveShadow = true;
    prayerMat.castShadow = true;
    heroGroup.add(prayerMat);

    // Contact shadow plane beneath prayer mat
    const contactTex = createContactShadowTexture();
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76 * 1.35, 1.24 * 1.35),
      new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.45,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.001;
    contactShadow.renderOrder = 2;
    scene.add(contactShadow);

    const activeModel: CharacterModelId = modelId;
    const isEmbroidered = activeModel === 'embroidered_thobe';
    const isGulfGhutra = activeModel === 'gulf_ghutra';

    // Character Materials calibrated to selected 3D model
    const embroideryTex = createEmbroideryTexture();

    const skinMat = new THREE.MeshStandardMaterial({
      color: isGulfGhutra ? 0xdfa27e : isEmbroidered ? 0xd2976f : 0xc99672,
      roughness: isGulfGhutra ? 0.52 : 0.48,
      metalness: 0.02,
    });
    const thobeMat = new THREE.MeshStandardMaterial({
      color: isEmbroidered ? 0xf7f8fa : isGulfGhutra ? 0xf6f7fa : 0xf4efe4,
      roughness: isGulfGhutra ? 0.86 : 0.78,
      metalness: 0.0,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: isEmbroidered ? 0xdcd4c2 : isGulfGhutra ? 0xe4e7ec : 0x205946,
      roughness: 0.62,
      metalness: isEmbroidered ? 0.14 : 0.04,
    });
    const embroideryMat = new THREE.MeshStandardMaterial({
      map: embroideryTex,
      color: 0xf4efe4,
      roughness: 0.6,
      metalness: 0.14,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.74,
      metalness: 0.01,
    });
    const trouserMat = new THREE.MeshStandardMaterial({
      color: isEmbroidered ? 0x4b4f56 : isGulfGhutra ? 0xebedf2 : 0xe6dfd0,
      roughness: 0.86,
      metalness: 0.0,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: isEmbroidered ? 0xd3c49d : 0xc8a45d,
      roughness: 0.28,
      metalness: 0.68,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: isGulfGhutra ? 0x1b1715 : 0x241d19,
      roughness: 0.88,
      metalness: 0.0,
    });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xfcfcfc,
      roughness: 0.2,
      metalness: 0.0,
    });
    const irisMat = new THREE.MeshStandardMaterial({
      color: 0x1e1410,
      roughness: 0.12,
      metalness: 0.05,
    });
    const sandalMat = new THREE.MeshStandardMaterial({
      color: isEmbroidered ? 0x454549 : isGulfGhutra ? 0x5c3a24 : 0x4b4036,
      roughness: 0.72,
      metalness: 0.05,
    });

    // Articulated Character Hierarchy
    const character = new THREE.Group();
    heroGroup.add(character);

    const pelvis = new THREE.Group();
    character.add(pelvis);

    const pelvisMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.142, 0.16, 0.15, 22),
      thobeMat,
    );
    pelvisMesh.castShadow = true;
    pelvis.add(pelvisMesh);

    if (!isEmbroidered && !isGulfGhutra) {
      const beltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.143, 0.145, 0.04, 20), trimMat);
      beltMesh.position.y = 0.055;
      pelvis.add(beltMesh);
    }

    const torso = new THREE.Group();
    torso.position.y = 0.075;
    pelvis.add(torso);

    const chestMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.172, 0.142, 0.41, 22),
      thobeMat,
    );
    chestMesh.position.y = 0.205;
    chestMesh.castShadow = true;
    torso.add(chestMesh);

    // Front chest placket & model-specific garment ornamentation
    if (isEmbroidered) {
      // Ornate gold-beige embroidered central placket with pointed bottom tip & two medallion buttons
      const placketMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.052, 0.21, 0.018),
        embroideryMat,
      );
      placketMesh.position.set(0, 0.295, -0.156);
      torso.add(placketMesh);

      const placketTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.036, 0.044, 4),
        embroideryMat,
      );
      placketTip.rotation.z = Math.PI;
      placketTip.rotation.y = Math.PI / 4;
      placketTip.scale.set(1, 1, 0.32);
      placketTip.position.set(0, 0.172, -0.156);
      torso.add(placketTip);

      const topButton = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 12), brassMat);
      topButton.scale.set(1, 1, 0.65);
      topButton.position.set(0, 0.355, -0.167);
      torso.add(topButton);

      const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.01, 16), brassMat);
      medallion.rotation.x = Math.PI / 2;
      medallion.position.set(0, 0.23, -0.166);
      torso.add(medallion);

      // Stand-up embroidered Mandarin collar
      const standCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.082, 0.088, 0.036, 20),
        thobeMat,
      );
      standCollar.position.y = 0.422;
      torso.add(standCollar);

      const collarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.083, 0.007, 10, 22), trimMat);
      collarTrim.rotation.x = Math.PI / 2;
      collarTrim.position.y = 0.436;
      torso.add(collarTrim);

      // Twin flowing gold-beige embroidered shoulder stoles + bottom beads & tassels
      ([-1, 1] as const).forEach((side) => {
        const stoleChest = new THREE.Mesh(
          new THREE.BoxGeometry(0.042, 0.36, 0.02),
          embroideryMat,
        );
        stoleChest.position.set(side * 0.088, 0.235, -0.152);
        stoleChest.rotation.z = side * -0.05;
        stoleChest.rotation.x = -0.06;
        stoleChest.castShadow = true;
        torso.add(stoleChest);

        const stoleShoulder = new THREE.Mesh(
          new THREE.BoxGeometry(0.044, 0.022, 0.16),
          embroideryMat,
        );
        stoleShoulder.position.set(side * 0.095, 0.408, -0.07);
        torso.add(stoleShoulder);

        const stoleLower = new THREE.Mesh(
          new THREE.BoxGeometry(0.042, 0.17, 0.02),
          embroideryMat,
        );
        stoleLower.position.set(side * 0.088, -0.01, -0.153);
        pelvis.add(stoleLower);

        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 12), brassMat);
        bead.position.set(side * 0.088, -0.104, -0.155);
        pelvis.add(bead);

        const tassel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.006, 0.012, 0.038, 10),
          trimMat,
        );
        tassel.position.set(side * 0.088, -0.132, -0.155);
        pelvis.add(tassel);
      });
    } else if (isGulfGhutra) {
      // Minimalist crisp Gulf thobe front vertical seam + clean high collar
      const centerSeam = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.39, 0.014), trimMat);
      centerSeam.position.set(0, 0.205, -0.156);
      torso.add(centerSeam);

      const lowerSeam = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.15, 0.014), trimMat);
      lowerSeam.position.set(0, 0.0, -0.152);
      pelvis.add(lowerSeam);

      const gulfCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.078, 0.084, 0.038, 20),
        thobeMat,
      );
      gulfCollar.position.y = 0.422;
      torso.add(gulfCollar);
    } else {
      const placketMesh = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.22, 0.02), trimMat);
      placketMesh.position.set(0, 0.285, -0.152);
      torso.add(placketMesh);

      const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.014, 10, 20), brassMat);
      collarRing.rotation.x = Math.PI / 2;
      collarRing.position.y = 0.415;
      torso.add(collarRing);
    }

    // Neck + Head + Stylized Facial Features + Model Headwear
    const neck = new THREE.Group();
    neck.position.y = 0.425;
    torso.add(neck);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.08, 16), skinMat);
    neckMesh.position.y = 0.03;
    neck.add(neckMesh);

    const head = new THREE.Group();
    head.rotation.order = 'YXZ';
    head.position.y = 0.125;
    neck.add(head);

    const skullMesh = new THREE.Mesh(new THREE.SphereGeometry(0.108, 28, 22), skinMat);
    skullMesh.scale.set(0.92, 1.08, 0.97);
    skullMesh.castShadow = true;
    head.add(skullMesh);

    // Sculpted Ears
    ([-1, 1] as const).forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), skinMat);
      ear.scale.set(0.55, 1.15, 0.78);
      ear.position.set(side * 0.098, -0.002, 0.006);
      head.add(ear);
    });

    // Nose (rounded friendly stylized nose)
    const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.017, 14, 14), skinMat);
    noseMesh.scale.set(0.95, 1.25, 1.2);
    noseMesh.position.set(0, -0.006, -0.105);
    head.add(noseMesh);

    // Expressive Stylized Eyes & Eyebrows
    ([-1, 1] as const).forEach((side) => {
      if (isGulfGhutra) {
        const dotEye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 12), irisMat);
        dotEye.position.set(side * 0.034, 0.018, -0.096);
        head.add(dotEye);

        const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 8, 8), eyeWhiteMat);
        glint.position.set(side * 0.031, 0.022, -0.105);
        head.add(glint);
      } else {
        const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.016, 14, 14), eyeWhiteMat);
        sclera.scale.set(1.05, 0.85, 0.65);
        sclera.position.set(side * 0.035, 0.017, -0.094);
        head.add(sclera);

        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 12), irisMat);
        iris.scale.set(1, 1, 0.65);
        iris.position.set(side * 0.035, 0.017, -0.101);
        head.add(iris);

        const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 8, 8), eyeWhiteMat);
        glint.position.set(side * 0.032, 0.021, -0.106);
        head.add(glint);
      }

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.009, 0.012), hairMat);
      brow.position.set(side * 0.035, 0.041, -0.096);
      brow.rotation.z = side * -0.08;
      head.add(brow);
    });

    // Warm Smile
    if (isGulfGhutra) {
      const smile = new THREE.Mesh(
        new THREE.TorusGeometry(0.024, 0.006, 10, 18, Math.PI * 0.8),
        eyeWhiteMat,
      );
      smile.rotation.x = Math.PI;
      smile.rotation.z = Math.PI * 0.1;
      smile.position.set(0, -0.032, -0.098);
      head.add(smile);
    }

    // Groomed Beard + Hairline
    if (isEmbroidered) {
      // Sculpted jawline beard & neat mustache matching Image 1
      const jawBeard = new THREE.Mesh(
        new THREE.SphereGeometry(0.098, 22, 16, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.42),
        hairMat,
      );
      jawBeard.scale.set(0.95, 1.06, 0.99);
      jawBeard.position.set(0, -0.022, -0.012);
      head.add(jawBeard);

      const chinTuft = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.032, 0.026), hairMat);
      chinTuft.position.set(0, -0.072, -0.082);
      head.add(chinTuft);

      const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.016), hairMat);
      mustache.position.set(0, -0.032, -0.098);
      head.add(mustache);

      const sideHair = new THREE.Mesh(
        new THREE.CylinderGeometry(0.099, 0.1, 0.036, 22, 1, false, Math.PI * 0.25, Math.PI * 1.5),
        hairMat,
      );
      sideHair.position.set(0, 0.028, 0.005);
      head.add(sideHair);
    } else if (isGulfGhutra) {
      // Full rounded dark beard framing the smile matching Image 2
      const fullBeard = new THREE.Mesh(
        new THREE.SphereGeometry(0.104, 22, 16, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.48),
        hairMat,
      );
      fullBeard.scale.set(0.96, 1.08, 1.01);
      fullBeard.position.set(0, -0.024, -0.01);
      head.add(fullBeard);

      const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.012, 0.018), hairMat);
      mustache.position.set(0, -0.026, -0.098);
      head.add(mustache);
    } else {
      const beardMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 18, 14, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.5),
        hairMat,
      );
      beardMesh.position.set(0, -0.024, -0.015);
      head.add(beardMesh);
    }

    // Headwear per selected model
    if (isGulfGhutra) {
      // White Ghutra headscarf + plump white rolled headband + back/side shoulder drape
      const ghutraCrown = new THREE.Mesh(
        new THREE.SphereGeometry(0.111, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.58),
        capMat,
      );
      ghutraCrown.scale.set(0.95, 1.02, 1.0);
      ghutraCrown.position.y = 0.036;
      ghutraCrown.castShadow = true;
      head.add(ghutraCrown);

      const headband = new THREE.Mesh(
        new THREE.TorusGeometry(0.109, 0.021, 14, 28),
        new THREE.MeshStandardMaterial({
          color: 0xeff1f5,
          roughness: 0.72,
          metalness: 0.02,
        }),
      );
      headband.rotation.x = Math.PI / 2 - 0.14;
      headband.position.set(0, 0.068, 0.008);
      headband.castShadow = true;
      head.add(headband);

      const ghutraMat = new THREE.MeshStandardMaterial({
        color: 0xf6f7fa,
        roughness: 0.84,
        side: THREE.DoubleSide,
      });
      // Flowing drape around sides & back of head (+Z), keeping face (-Z) open
      const ghutraDrape = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.114,
          0.165,
          0.25,
          24,
          1,
          true,
          -Math.PI * 0.65,
          Math.PI * 1.3,
        ),
        ghutraMat,
      );
      ghutraDrape.position.set(0, -0.045, 0.018);
      ghutraDrape.castShadow = true;
      head.add(ghutraDrape);
    } else {
      // Rounded embroidered Kufi cap matching Image 1 (and Classic Emerald)
      const kufiBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.101, 0.106, 0.056, 24),
        capMat,
      );
      kufiBody.position.y = 0.064;
      kufiBody.castShadow = true;
      head.add(kufiBody);

      const kufiDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.102, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
        capMat,
      );
      kufiDome.scale.set(1, 0.52, 1);
      kufiDome.position.y = 0.088;
      kufiDome.castShadow = true;
      head.add(kufiDome);

      const kufiBand = new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.009, 10, 24), trimMat);
      kufiBand.rotation.x = Math.PI / 2;
      kufiBand.position.y = 0.039;
      head.add(kufiBand);
    }

    // Articulated Arm Builder (Right: side = +1, Left: side = -1)
    function buildArm(side: -1 | 1) {
      const shoulder = new THREE.Group();
      shoulder.rotation.order = 'YXZ';
      shoulder.position.set(side * 0.195, 0.365, 0);
      torso.add(shoulder);

      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.056, 14, 14), thobeMat);
      shoulder.add(shoulderCap);

      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.27, 16), thobeMat);
      upperArm.position.y = -0.135;
      upperArm.castShadow = true;
      shoulder.add(upperArm);

      const elbow = new THREE.Group();
      elbow.position.y = -0.27;
      shoulder.add(elbow);

      const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 12), thobeMat);
      elbow.add(elbowCap);

      const forearm = new THREE.Group();
      elbow.add(forearm);

      const forearmMesh = new THREE.Mesh(
        isGulfGhutra
          ? new THREE.CylinderGeometry(0.044, 0.068, 0.235, 16)
          : new THREE.CylinderGeometry(0.045, 0.049, 0.23, 16),
        thobeMat,
      );
      forearmMesh.position.y = -0.118;
      forearmMesh.castShadow = true;
      forearm.add(forearmMesh);

      if (isEmbroidered) {
        const cuffMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.051, 0.053, 0.038, 16),
          embroideryMat,
        );
        cuffMesh.position.y = -0.22;
        forearm.add(cuffMesh);
      } else if (!isGulfGhutra) {
        const cuffMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.038, 0.038, 0.024, 14),
          trimMat,
        );
        cuffMesh.position.y = -0.228;
        forearm.add(cuffMesh);
      }

      const hand = new THREE.Group();
      hand.rotation.order = 'XYZ';
      hand.position.y = -0.245;
      forearm.add(hand);

      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.07, 0.056), skinMat);
      palm.position.y = -0.035;
      palm.castShadow = true;
      hand.add(palm);

      const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.04, 8), skinMat);
      thumb.position.set(0, -0.025, -0.035);
      thumb.rotation.x = 0.5;
      hand.add(thumb);

      const indexPivot = new THREE.Group();
      indexPivot.position.set(0, -0.07, -0.018);
      hand.add(indexPivot);
      const indexMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.008, 0.048, 8), skinMat);
      indexMesh.position.y = -0.024;
      indexPivot.add(indexMesh);

      const fingersPivot = new THREE.Group();
      fingersPivot.position.set(0, -0.07, 0.006);
      hand.add(fingersPivot);
      [-0.01, 0.005, 0.018].forEach((zOff, i) => {
        const len = i === 0 ? 0.05 : i === 1 ? 0.046 : 0.038;
        const fMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0075, len, 8), skinMat);
        fMesh.position.set(0, -len / 2, zOff);
        fingersPivot.add(fMesh);
      });

      return { shoulder, elbow, forearm, hand, indexPivot, fingersPivot };
    }

    const rightArm = buildArm(1);
    const leftArm = buildArm(-1);

    // Articulated Leg Builder with hinged Toes (Right: side = +1, Left: side = -1)
    function buildLeg(side: -1 | 1) {
      const hip = new THREE.Group();
      hip.rotation.order = 'XYZ';
      hip.position.set(side * 0.095, -0.04, 0);
      pelvis.add(hip);

      const thighMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.056, 0.4, 16),
        trouserMat,
      );
      thighMesh.position.y = -0.2;
      thighMesh.castShadow = true;
      hip.add(thighMesh);

      const knee = new THREE.Group();
      knee.position.y = -0.4;
      hip.add(knee);

      const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), trouserMat);
      knee.add(kneeCap);

      const shinMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.04, 0.4, 16),
        trouserMat,
      );
      shinMesh.position.y = -0.2;
      shinMesh.castShadow = true;
      knee.add(shinMesh);

      const ankle = new THREE.Group();
      ankle.rotation.order = 'YXZ';
      ankle.position.y = -0.4;
      knee.add(ankle);

      const ankleCap = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 12), skinMat);
      ankle.add(ankleCap);

      const footMesh = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.048, 0.145), skinMat);
      footMesh.position.set(0, -0.024, -0.045);
      footMesh.castShadow = true;
      ankle.add(footMesh);

      // Subtle sandal / strap accents matching reference images while keeping toes clean
      if (isEmbroidered || isGulfGhutra) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.02, 0.045), sandalMat);
        strap.position.set(0, -0.008, -0.06);
        ankle.add(strap);

        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.012, 0.175), sandalMat);
        sole.position.set(0, -0.046, -0.062);
        ankle.add(sole);
      }

      const toes = new THREE.Group();
      toes.position.set(0, -0.024, -0.116);
      ankle.add(toes);

      const toesMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.034, 0.055), skinMat);
      toesMesh.position.set(0, -0.005, -0.025);
      toesMesh.castShadow = true;
      toes.add(toesMesh);

      return { hip, knee, ankle, toes };
    }

    const rightLeg = buildLeg(1);
    const leftLeg = buildLeg(-1);

    // Ankle-length lower white thobe robe for standing/bowing postures
    const skirtHeight = isEmbroidered || isGulfGhutra ? 0.66 : 0.48;
    const skirtMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.16,
        isEmbroidered ? 0.215 : isGulfGhutra ? 0.195 : 0.205,
        skirtHeight,
        24,
        1,
        true,
      ),
      new THREE.MeshStandardMaterial({
        color: isEmbroidered ? 0xf7f8fa : isGulfGhutra ? 0xf6f7fa : 0xf4efe4,
        roughness: isGulfGhutra ? 0.86 : 0.78,
        side: THREE.DoubleSide,
      }),
    );
    skirtMesh.position.y = -skirtHeight / 2;
    pelvis.add(skirtMesh);

    const current: JointTargets = { ...getPoseTargets(poseRef.current, madhhabRef.current) };

    function applyJoints(j: JointTargets) {
      character.position.set(0, 0.9, 0.16);
      pelvis.rotation.set(j.pelvisX, 0, j.pelvisZ);
      torso.rotation.x = j.torsoX;
      head.rotation.set(j.headX, j.headY, 0);

      leftArm.shoulder.rotation.set(j.lShoulderX, j.lShoulderY, j.lShoulderZ);
      leftArm.elbow.rotation.x = j.lElbowX;
      leftArm.forearm.rotation.y = j.lForearmY;
      leftArm.hand.rotation.set(j.lWristX, 0, j.lWristZ);
      leftArm.fingersPivot.rotation.z = j.lFingersCurl;
      leftArm.indexPivot.rotation.z = j.lFingersCurl;

      rightArm.shoulder.rotation.set(j.rShoulderX, j.rShoulderY, j.rShoulderZ);
      rightArm.elbow.rotation.x = j.rElbowX;
      rightArm.forearm.rotation.y = j.rForearmY;
      rightArm.hand.rotation.set(j.rWristX, 0, j.rWristZ);
      // Right fingers curl inward (-X, i.e. negative Z rotation on right hand)
      rightArm.fingersPivot.rotation.z = -j.rFingersCurl;
      rightArm.indexPivot.rotation.z = -j.rIndexCurl;

      leftLeg.hip.rotation.set(j.lHipX, 0, j.lHipZ);
      leftLeg.knee.rotation.x = j.lKneeX;
      leftLeg.ankle.rotation.set(j.lAnkleX, j.lAnkleY, j.lAnkleZ);
      leftLeg.toes.rotation.x = j.lToesX;

      rightLeg.hip.rotation.set(j.rHipX, 0, j.rHipZ);
      rightLeg.knee.rotation.x = j.rKneeX;
      rightLeg.ankle.rotation.set(j.rAnkleX, j.rAnkleY, j.rAnkleZ);
      rightLeg.toes.rotation.x = j.rToesX;

      // Show flowing lower thobe skirt when upright or bowing; hide when seated/prostrating so knees/shins read cleanly
      skirtMesh.visible = j.lHipX < 1.7 && j.lKneeX > -1.0;

      // Keep character centered nicely on prayer mat and snapped flush to mat top surface (y = 0.02)
      character.updateMatrixWorld(true);
      _box.setFromObject(character);
      if (Number.isFinite(_box.min.y)) {
        character.position.y += 0.02 - _box.min.y;
      }
      // Also center Z gently within prayer mat bounds so forehead never overhangs front edge during Sujud
      if (Number.isFinite(_box.min.z) && _box.min.z < -0.52) {
        character.position.z += -0.52 - _box.min.z;
      }
    }

    applyJoints(current);

    let cameraFlightActive = false;
    const camGoalPos = new THREE.Vector3();
    const camGoalTarget = new THREE.Vector3();
    let camGoalFov = 32;

    const fitScene = (preset: CameraPreset, animateFlight = false) => {
      const rect = mount.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      renderer.setSize(rect.width, rect.height, false);

      const dir = getCameraDirectionForPreset(preset);
      const dummyCam = camera.clone();
      const { target, radius, dist } = frameWhole(
        dummyCam,
        heroGroup,
        { x: 0, y: 0, w: rect.width, h: rect.height },
        { w: rect.width, h: rect.height },
        { fill: compact ? 0.8 : 0.76, baseFov: 32, dir },
      );

      controls.minDistance = radius * 1.15;
      controls.maxDistance = dist * 2.0;

      if (!animateFlight) {
        camera.copy(dummyCam);
        camera.updateProjectionMatrix();
        controls.target.copy(target);
        controls.update();
      } else {
        camGoalPos.copy(dummyCam.position);
        camGoalTarget.copy(target);
        camGoalFov = dummyCam.fov;
        cameraFlightActive = true;
      }
    };

    fitScene(cameraPreset, false);
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    presetTriggerRef.current = (preset: CameraPreset) => {
      fitScene(preset, true);
    };

    const onControlsStart = () => {
      cameraFlightActive = false;
    };
    controls.addEventListener('start', onControlsStart);

    const resizeObserver = new ResizeObserver(() => {
      const rect = mount.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      renderer.setSize(rect.width, rect.height, false);
      const currentDir = camera.position.clone().sub(controls.target);
      const { target, radius, dist } = frameWhole(
        camera,
        heroGroup,
        { x: 0, y: 0, w: rect.width, h: rect.height },
        { w: rect.width, h: rect.height },
        { fill: compact ? 0.8 : 0.76, baseFov: 32, dir: currentDir },
      );
      controls.target.copy(target);
      controls.minDistance = radius * 1.15;
      controls.maxDistance = dist * 2.0;
      controls.update();
    });
    resizeObserver.observe(mount);

    let frameId = 0;
    let disposed = false;
    let isVisible = true;
    let lastTime = performance.now();

    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    io.observe(mount);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.06, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (isVisible) {
        const targetBgHex = themeRef.current === 'dark' ? 0x1a2220 : 0xf2ede3;
        if ((scene.background as THREE.Color).getHex() !== targetBgHex) {
          (scene.background as THREE.Color).setHex(targetBgHex);
          if (scene.fog) scene.fog.color.setHex(targetBgHex);
          rimLight.intensity = themeRef.current === 'dark' ? 1.0 : 0.45;
        }

        const targetJoints = getPoseTargets(poseRef.current, madhhabRef.current);
        const lambda = reducedMotion ? 40 : 6.5;
        (Object.keys(targetJoints) as Array<keyof JointTargets>).forEach((k) => {
          current[k] = THREE.MathUtils.damp(current[k], targetJoints[k], lambda, dt);
        });

        const renderPose: JointTargets = { ...current };
        if (!reducedMotion) {
          renderPose.torsoX += Math.sin(now * 0.0022) * 0.008;
        }
        applyJoints(renderPose);

        if (cameraFlightActive) {
          const camLambda = reducedMotion ? 40 : 7;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, camGoalPos.x, camLambda, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, camGoalPos.y, camLambda, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, camGoalPos.z, camLambda, dt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, camGoalTarget.x, camLambda, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, camGoalTarget.y, camLambda, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, camGoalTarget.z, camLambda, dt);
          camera.fov = THREE.MathUtils.damp(camera.fov, camGoalFov, camLambda, dt);
          camera.updateProjectionMatrix();
          if (camera.position.distanceTo(camGoalPos) < 0.01) {
            cameraFlightActive = false;
          }
        }

        controls.update();
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      io.disconnect();
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlsStart);
      controls.dispose();
      envTarget.dispose();
      matTex.dispose();
      embroideryTex.dispose();
      contactTex.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [quality, compact, modelId]);

  const handleSelectPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    presetTriggerRef.current?.(preset);
  };

  if (webglUnavailable) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-card border border-border bg-surface-alt p-6 text-center ${className}`}
      >
        <p className="text-base font-medium text-foreground">
          3D Prayer Demonstration ({pose.replace('_', ' ')})
        </p>
        <p className="mt-1 text-sm text-muted max-w-md">
          WebGL rendering is unavailable in this browser context. Follow the synchronized Arabic text,
          transliteration, and posture checklist below.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-surface-alt ${
        fullScreenMode ? 'h-full rounded-none border-0' : 'rounded-card border border-border/80'
      } ${className}`}
    >
      <div ref={containerRef} className="h-full w-full min-h-[260px]" />

      {caption && !fullScreenMode && (
        <div className="pointer-events-none absolute top-3 left-3 rounded-control bg-surface/90 px-3 py-1.5 text-xs font-medium text-foreground border border-border/70">
          {caption}
        </div>
      )}

      {/* Collapsible camera dock */}
      <div
        className={`pointer-events-none absolute flex flex-col gap-1.5 ${
          fullScreenMode
            ? 'top-16 right-3 sm:right-4 items-end'
            : 'inset-x-0 bottom-3 items-center px-3'
        }`}
      >
        <button
          type="button"
          onClick={() => setControlsHidden((v) => !v)}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/90 px-3 py-1 text-xs font-medium text-muted hover:text-foreground cursor-pointer"
        >
          {controlsHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {controlsHidden ? 'Camera' : 'Hide Camera'}
        </button>

        {!controlsHidden && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-card border border-border/85 bg-surface/92 px-2.5 py-1.5 shadow-sm">
            {(
              [
                { id: 'three_quarter', label: '3/4 Angle' },
                { id: 'front', label: 'Front View' },
                { id: 'side', label: 'Side Profile' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => handleSelectPreset(btn.id)}
                className={`min-h-8 whitespace-nowrap rounded-control px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  activePreset === btn.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-surface-alt'
                }`}
              >
                {btn.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleSelectPreset('three_quarter')}
              title="Reset View"
              className="inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-control border border-border/80 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-alt cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
