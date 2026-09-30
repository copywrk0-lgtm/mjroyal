import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

export function startCameraIntro(stage, finish) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { finish(); return () => {}; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  camera.position.set(0, .2, 6.7);
  camera.lookAt(0, 0, 0);
  const pivot = new THREE.Group();
  scene.add(pivot);
  let disposed = false;
  let frame = 0;
  const owned = new Set();
  const face = new THREE.MeshBasicMaterial({ color: '#111110', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const line = new THREE.LineBasicMaterial({ color: '#ecece7', transparent: true, opacity: .72 });
  owned.add(face); owned.add(line);
  function resize() {
    const {width, height} = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(stage); resize();
  new GLTFLoader().load('./assets/camera-wire.glb', ({scene: model}) => {
    if (disposed) {
      model.traverse(n => { if(n.isMesh) { n.geometry.dispose(); const mats=Array.isArray(n.material)?n.material:[n.material]; mats.forEach(m=>m.dispose()); } });
      return;
    }
    model.traverse(node => {
      if (!node.isMesh) return;
      const previous = Array.isArray(node.material) ? node.material : [node.material];
      previous.forEach(m => m.dispose());
      node.material = face;
      owned.add(node.geometry);
      const edges = new THREE.EdgesGeometry(node.geometry, 22);
      owned.add(edges);
      node.add(new THREE.LineSegments(edges, line));
    });
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 3.2 / Math.max(size.x, size.y, size.z);
    const centered = new THREE.Group();
    model.position.sub(center);
    centered.add(model); centered.scale.setScalar(scale); pivot.add(centered);
    pivot.rotation.set(.12, -.55, 0);
    stage.classList.add('ready');
    const label = document.getElementById('loader-label');
    if (label) label.textContent = 'EVERY ANGLE. EVERY STORY.';
    const started = performance.now();
    function tick(now) {
      if (disposed) return;
      const t = Math.min((now - started) / 3600, 1);
      const eased = t * t * (3 - 2 * t);
      pivot.rotation.y = -.55 + eased * Math.PI * 2;
      pivot.rotation.x = .12 + Math.sin(t * Math.PI * 2) * .1;
      renderer.render(scene, camera);
      if (t < 1) frame = requestAnimationFrame(tick);
      else finish();
    }
    frame = requestAnimationFrame(tick);
  }, undefined, () => finish());
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    owned.forEach(resource => resource.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  };
}
