import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

export function startCameraIntro(stage, finish, options = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { renderer = createSoftwareRenderer(); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, matchMedia('(max-width: 700px)').matches ? 1.5 : 1.75));
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  camera.position.set(0, .2, 6.7);
  camera.lookAt(0, 0, 0);
  const pivot = new THREE.Group();
  scene.add(pivot);
  let disposed = false;
  let frame = 0;
  let flashLamp = null;
  const owned = new Set();
  const face = new THREE.MeshBasicMaterial({ color: '#111110', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const line = new THREE.LineBasicMaterial({ color: '#ecece7', transparent: true, opacity: .72 });
  owned.add(face); owned.add(line);
  function resize() {
    const {width, height} = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = Math.max(6.7, 6.7 * 1.15 / camera.aspect);
    camera.updateMatrixWorld();
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
    const door = model.getObjectByName("camDoor_GRP");
    if (door) { door.position.set(0,0,0); door.rotation.set(0,0,0); door.scale.set(1,1,1); }
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 4 / Math.max(size.x, size.y, size.z);
    const centered = new THREE.Group();
    model.position.sub(center);
    centered.add(model); centered.scale.setScalar(scale); pivot.add(centered);
    const housingGeometry = new THREE.BoxGeometry(.62, .22, .20);
    const housing = new THREE.Mesh(housingGeometry, face);
    housing.position.set(0, size.y * scale / 2 + .11, .16);
    const housingEdges = new THREE.EdgesGeometry(housingGeometry);
    housing.add(new THREE.LineSegments(housingEdges, line));
    const lampGeometry = new THREE.PlaneGeometry(.50, .12);
    const lampMaterial = new THREE.MeshBasicMaterial({color:'#bcbcb4',side:THREE.DoubleSide});
    flashLamp = new THREE.Mesh(lampGeometry, lampMaterial);
    flashLamp.position.set(0, housing.position.y, .265);
    flashLamp.renderOrder = 1;
    owned.add(housingGeometry); owned.add(housingEdges);
    owned.add(lampGeometry); owned.add(lampMaterial);
    pivot.add(housing, flashLamp);
    pivot.rotation.set(.12, -.55, 0);
    stage.classList.add('ready');
    options.onReady?.();
    const label = document.getElementById('loader-label');
    if (label) label.textContent = 'EVERY ANGLE. EVERY STORY.';
    const started = performance.now();
    function tick(now) {
      if (disposed) return;
      const elapsed = (now - started) / 3600;
      const t = options.preview ? elapsed % 1 : Math.min(elapsed, 1);
      const eased = t * t * (3 - 2 * t);
      pivot.rotation.y = -.55 + eased * (Math.PI * 2 + .43);
      pivot.rotation.x = .12 + Math.sin(t * Math.PI * 2) * .1;
      renderer.render(scene, camera);
      if (options.preview || t < 1) frame = requestAnimationFrame(tick);
      else finish();
    }
    frame = requestAnimationFrame(tick);
  }, undefined, () => finish());
  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    owned.forEach(resource => resource.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  };
  dispose.flash = () => {
    if (!flashLamp || disposed) return null;
    cancelAnimationFrame(frame);
    pivot.rotation.set(.12, -.12, 0);
    flashLamp.material.color.set('#ffffff');
    scene.updateMatrixWorld(true);
    renderer.render(scene, camera);
    const point = flashLamp.getWorldPosition(new THREE.Vector3()).project(camera);
    const rect = stage.getBoundingClientRect();
    return {x:rect.left+(point.x+1)*rect.width/2, y:rect.top+(1-point.y)*rect.height/2};
  };
  return dispose;
}

// Canvas fallback uses the same camera geometry and rotation when WebGL is unavailable.
function createSoftwareRenderer() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let width = 1, height = 1, cached = null;
  const vp = new THREE.Matrix4();
  return {
    domElement: canvas,
    setPixelRatio() {},
    setSize(w, h) { width=w; height=h; canvas.width=w; canvas.height=h; },
    render(scene, camera) {
      if (!ctx) return;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      if (!cached) {
        cached=[];
        scene.traverse(mesh => {
          if (!mesh.isMesh) return;
          const p=mesh.geometry.attributes.position;
          const index=mesh.geometry.index;
          const edges=mesh.children.find(child=>child.isLineSegments)?.geometry.attributes.position;
          const edgeSet=new Set();
          const key=(x,y,z)=>[x,y,z].map(v=>Math.round(v*10000)).join(',');
          const pair=(a,b)=>a<b?a+'|'+b:b+'|'+a;
          if (edges) for(let i=0;i<edges.count;i+=2) {
            edgeSet.add(pair(key(edges.getX(i),edges.getY(i),edges.getZ(i)),key(edges.getX(i+1),edges.getY(i+1),edges.getZ(i+1))));
          }
          const vertices=Array.from({length:p.count},(_,i)=>new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)));
          const keys=vertices.map(v=>key(v.x,v.y,v.z));
          const triangles=[];
          for(let i=0;i<(index?index.count:p.count);i+=3){
            const ids=[0,1,2].map(n=>index?index.getX(i+n):i+n);
            triangles.push({ids,edges:[0,1,2].map(n=>edgeSet.has(pair(keys[ids[n]],keys[ids[(n+1)%3]])))});
          }
          cached.push({mesh,vertices,triangles});
        });
      }
      ctx.clearRect(0,0,width,height);
      const faces=[];
      for(const item of cached){
        const matrix=new THREE.Matrix4().multiplyMatrices(vp,item.mesh.matrixWorld);
        const projected=item.vertices.map(v=>{const p=v.clone().applyMatrix4(matrix);return [(p.x+1)*width/2,(1-p.y)*height/2,p.z];});
        for(const tri of item.triangles){
          const points=tri.ids.map(i=>projected[i]);
          const [a,b,c]=points;
          if ((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>=0)continue;
          faces.push({points,edges:tri.edges,z:(a[2]+b[2]+c[2])/3,color:item.mesh.material.color.getStyle(),order:item.mesh.renderOrder});
        }
      }
      faces.sort((a,b)=>a.order-b.order || b.z-a.z);
      ctx.fillStyle='#111110';ctx.strokeStyle='rgba(236,236,231,.72)';ctx.lineWidth=.7;
      for(const face of faces){
        ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=face.color;ctx.fill();
        ctx.beginPath();face.edges.forEach((draw,i)=>{if(draw){const a=face.points[i],b=face.points[(i+1)%3];ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}});ctx.stroke();
      }
    },
    dispose(){cached=null;}
  };
}

