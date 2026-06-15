/*
 * Point-cloud viewer for the figure grids.
 *
 * A SINGLE shared WebGLRenderer/canvas draws every cell. One WebGL context per
 * cell would blow past the browser's ~16-context limit (this page has 30+
 * viewers), so instead the shared canvas is a fixed, full-viewport overlay
 * pinned on top of the page with pointer-events:none. Each frame, every visible
 * cell is drawn into a scissor rectangle matching its on-screen position, so the
 * canvas only paints where a cell is and stays transparent everywhere else.
 *
 * Each cell keeps its own scene + camera + OrbitControls. Controls listen on the
 * cell <div> (pointer events pass through the transparent canvas above it), so
 * interaction and the existing per-row camera sync work unchanged.
 *
 * Rendering is on-demand: the page redraws only when a cell's controls move,
 * after a load, or on scroll/resize. Clouds load lazily via IntersectionObserver
 * and off-screen cells are skipped.
 */

import * as THREE from "three";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const cells = [];
const syncGroups = new Map();

// Delay before a finished drag is mirrored to the rest of its row.
const SYNC_DELAY_MS = 180;
// Duration of the eased camera glide when a row syncs.
const SYNC_TWEEN_MS = 520;

let renderer = null;
let canvas = null;
let needsRender = true;

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

function ensureRenderer() {
  if (renderer) return;
  canvas = document.createElement("canvas");
  canvas.id = "pcd-shared-canvas";
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "5",
  });
  document.body.appendChild(canvas);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  sizeRenderer();

  window.addEventListener("resize", () => {
    sizeRenderer();
    requestRender();
  });
  window.addEventListener("scroll", requestRender, { passive: true });
}

function sizeRenderer() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  requestRender();
}

function requestRender() {
  needsRender = true;
}

function buildCell(cfg) {
  const el = cfg.element;

  const scene = new THREE.Scene();
  const fov = cfg.view && cfg.view.fov ? cfg.view.fov : 50;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.01, 1000);
  camera.up.set(0, 0, 1);

  const controls = new OrbitControls(camera, el);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;

  const cell = {
    element: el,
    scene,
    camera,
    controls,
    url: cfg.url,
    view: cfg.view,
    pointSize: cfg.pointSize,
    syncGroup: cfg.syncGroup || null,
    loaded: false,
    loading: false,
    visible: false,
  };

  // Redraw on any control change, but mirror to the rest of the row only after
  // the drag ends (plus a short delay), so dragging stays snappy and the other
  // panels settle asynchronously on release.
  controls.addEventListener("change", requestRender);
  controls.addEventListener("start", () => {
    if (cell.syncTimer) {
      clearTimeout(cell.syncTimer);
      cell.syncTimer = null;
    }
  });
  controls.addEventListener("end", () => {
    if (!cell.syncGroup) return;
    if (cell.syncTimer) clearTimeout(cell.syncTimer);
    cell.syncTimer = setTimeout(() => {
      cell.syncTimer = null;
      propagateSync(cell);
    }, SYNC_DELAY_MS);
  });

  if (cell.syncGroup) {
    if (!syncGroups.has(cell.syncGroup)) syncGroups.set(cell.syncGroup, []);
    syncGroups.get(cell.syncGroup).push(cell);
  }

  cells.push(cell);
  return cell;
}

function applyView(cell) {
  const cam = cell.camera;
  const controls = cell.controls;
  const view = cell.view || {};
  const center = cell.center || new THREE.Vector3();

  if (view.up) cam.up.set(view.up[0], view.up[1], view.up[2]);

  if (view.position) {
    cam.position.set(view.position[0], view.position[1], view.position[2]);
  } else {
    const r = cell.radius || 3;
    cam.position.set(center.x + r * 1.4, center.y - r * 1.4, center.z + r * 1.1);
  }

  if (view.fov) {
    cam.fov = view.fov;
    cam.updateProjectionMatrix();
  }

  const target = view.target
    ? new THREE.Vector3(view.target[0], view.target[1], view.target[2])
    : center.clone();
  controls.target.copy(target);
  controls.update();
  requestRender();
}

function onGeometry(cell, geometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const center = new THREE.Vector3();
  box.getCenter(center);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);

  cell.center = center;
  cell.radius = sphere.radius;

  const material = new THREE.PointsMaterial({
    size: cell.pointSize || 0.015,
    vertexColors: geometry.hasAttribute("color"),
    color: geometry.hasAttribute("color") ? 0xffffff : 0x88aabb,
    sizeAttenuation: true,
  });

  cell.scene.add(new THREE.Points(geometry, material));
  cell.loaded = true;
  cell.element.classList.add("pcd-loaded");

  applyView(cell);
}

function loadCell(cell) {
  if (cell.loading || cell.loaded) return;
  cell.loading = true;
  new PLYLoader().load(
    cell.url,
    (geometry) => onGeometry(cell, geometry),
    undefined,
    (err) => {
      cell.loading = false;
      cell.element.classList.add("pcd-error");
      console.error("Point cloud load failed:", cell.url, err);
    }
  );
}

function propagateSync(source) {
  if (!source.syncGroup) return;
  const group = syncGroups.get(source.syncGroup);
  if (!group) return;
  for (const cell of group) {
    if (cell === source) continue;
    cell.camera.zoom = source.camera.zoom;
    cell.camera.updateProjectionMatrix();

    // Interpolate in OrbitControls' own spherical frame (offsets rotated so the
    // camera up axis maps to +Y). Matching its model means the final frame is
    // exactly what controls.update() produces, so re-enabling never snaps.
    const quat = new THREE.Quaternion().setFromUnitVectors(
      cell.camera.up,
      _yAxis
    );
    const quatInv = quat.clone().invert();

    const fromOffset = cell.camera.position
      .clone()
      .sub(cell.controls.target)
      .applyQuaternion(quat);
    const toOffset = source.camera.position
      .clone()
      .sub(source.controls.target)
      .applyQuaternion(quat);

    const sFrom = new THREE.Spherical().setFromVector3(fromOffset);
    const sTo = new THREE.Spherical().setFromVector3(toOffset);
    sFrom.makeSafe();
    sTo.makeSafe();

    // Take the shortest way around in azimuth (theta wraps at +/-PI).
    let dTheta = sTo.theta - sFrom.theta;
    while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
    while (dTheta < -Math.PI) dTheta += 2 * Math.PI;

    cell.tween = {
      start: performance.now(),
      quatInv,
      fromRadius: sFrom.radius,
      dRadius: sTo.radius - sFrom.radius,
      fromPhi: sFrom.phi,
      dPhi: sTo.phi - sFrom.phi,
      fromTheta: sFrom.theta,
      dTheta,
      fromTarget: cell.controls.target.clone(),
      toTarget: source.controls.target.clone(),
    };
    // Pause damping/input integration while the glide plays.
    cell.controls.enabled = false;
  }
  requestRender();
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const _yAxis = new THREE.Vector3(0, 1, 0);
const _sph = new THREE.Spherical();
const _offset = new THREE.Vector3();

function advanceTween(cell, now) {
  const tw = cell.tween;
  const raw = (now - tw.start) / SYNC_TWEEN_MS;
  const t = raw >= 1 ? 1 : easeInOutCubic(raw);

  _sph.set(
    tw.fromRadius + tw.dRadius * t,
    tw.fromPhi + tw.dPhi * t,
    tw.fromTheta + tw.dTheta * t
  );
  _sph.makeSafe();
  _offset.setFromSpherical(_sph).applyQuaternion(tw.quatInv);

  cell.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, t);
  cell.camera.position.copy(cell.controls.target).add(_offset);
  cell.camera.lookAt(cell.controls.target);
  cell.camera.updateProjectionMatrix();

  if (raw >= 1) {
    cell.tween = null;
    cell.controls.enabled = true;
    cell.controls.update();
  }
}

function renderAll() {
  const h = window.innerHeight;
  const w = window.innerWidth;
  renderer.clear();
  renderer.setScissorTest(true);

  for (const cell of cells) {
    if (!cell.loaded || !cell.visible) continue;
    const rect = cell.element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) continue;
    if (rect.bottom <= 0 || rect.top >= h || rect.right <= 0 || rect.left >= w) {
      continue;
    }

    const bottom = h - rect.bottom;
    renderer.setViewport(rect.left, bottom, width, height);
    renderer.setScissor(rect.left, bottom, width, height);

    cell.camera.aspect = width / height;
    cell.camera.updateProjectionMatrix();
    renderer.render(cell.scene, cell.camera);
  }

  renderer.setScissorTest(false);
}

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  let render = needsRender;
  for (const cell of cells) {
    if (!cell.loaded || !cell.visible) continue;
    if (cell.tween) {
      advanceTween(cell, now);
      render = true;
    } else if (cell.controls.update()) {
      render = true;
    }
  }

  if (render) {
    renderAll();
    needsRender = false;
  }
}

export function initPointClouds(cellConfigs) {
  if (!hasWebGL()) {
    for (const cfg of cellConfigs) {
      if (cfg.fallbackImage) {
        const img = document.createElement("img");
        img.src = cfg.fallbackImage;
        img.alt = cfg.alt || "point cloud";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        cfg.element.appendChild(img);
      }
      cfg.element.classList.add("pcd-fallback");
    }
    return;
  }

  ensureRenderer();

  const builtCells = cellConfigs.map(buildCell);

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cell = cells.find((c) => c.element === entry.target);
        if (!cell) continue;
        cell.visible = entry.isIntersecting;
        if (entry.isIntersecting) loadCell(cell);
      }
      requestRender();
    },
    { rootMargin: "200px" }
  );

  for (const cell of builtCells) {
    io.observe(cell.element);
  }

  if (cells.length === builtCells.length) animate();
}
