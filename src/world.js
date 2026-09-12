import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const HEX_ROOT = `${import.meta.env.BASE_URL}KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/`;
const DUNGEON_ROOT = `${import.meta.env.BASE_URL}KayKit_Dungeon_Remastered_1.0_FREE/`;
const TOP = 0.46;
const SQRT3 = Math.sqrt(3);
const HEX_SCALE = SQRT3 / 2;
const NEIGHBOURS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const loader = new GLTFLoader();
const assetCache = new Map();
const ASSETS = {
  grass: HEX_ROOT + 'tiles/base/hex_grass.gltf',
  treeA: HEX_ROOT + 'decoration/nature/tree_single_A.gltf',
  treeB: HEX_ROOT + 'decoration/nature/tree_single_B.gltf',
  rock: HEX_ROOT + 'decoration/nature/rock_single_E.gltf',
  stone: HEX_ROOT + 'decoration/props/resource_stone.gltf',
  tent: HEX_ROOT + 'decoration/props/tent.gltf',
  flag: HEX_ROOT + 'decoration/props/flag_blue.gltf',
  castle: HEX_ROOT + 'buildings/blue/building_castle_blue.gltf',
  ruins: HEX_ROOT + 'buildings/neutral/building_destroyed.gltf',
  chest: DUNGEON_ROOT + 'chest.glb',
};

const BIOMES = [
  { id: 'meadow', foliage: '#6e9d73', grass: '#789a72', water: '#4ba9ac', crystal: '#a6e3df' },
  { id: 'autumn', foliage: '#d39756', grass: '#a09d73', water: '#569b9e', crystal: '#d7b3ff' },
  { id: 'ruins', foliage: '#699b91', grass: '#7d9d91', water: '#418d9b', crystal: '#a1eec3' },
];

function seededRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let v = state;
    v = Math.imul(v ^ v >>> 15, v | 1);
    v ^= v + Math.imul(v ^ v >>> 7, v | 61);
    return ((v ^ v >>> 14) >>> 0) / 4294967296;
  };
}

function loadAsset(name) {
  if (!assetCache.has(name)) {
    assetCache.set(name, loader.loadAsync(ASSETS[name]).then(({ scene }) => {
      scene.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        for (const material of [node.material].flat()) {
          if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
        }
      });
      return scene;
    }).catch((error) => {
      assetCache.delete(name);
      throw error;
    }));
  }
  return assetCache.get(name);
}

function axial(q, r, y = TOP) {
  return new THREE.Vector3(q * 1.5, y, (r + q * 0.5) * SQRT3);
}

function rotateKey(key, turns) {
  let [q, r] = key.split(',').map(Number);
  for (let i = 0; i < turns; i++) [q, r] = [-r, q + r];
  return `${q},${r}`;
}

/** A small, connected, deterministic island. Tile centres are always unobstructed. */
export async function createWorld({ scene, level = 1, seed = 1 }) {
  const biomeIndex = ((Math.max(1, level) - 1) % BIOMES.length);
  const biome = BIOMES[biomeIndex];
  const random = seededRandom(seed + level * 8191);
  const sourceModels = new Map(await Promise.all(Object.keys(ASSETS).map(async (key) => [key, await loadAsset(key)])));
  const root = new THREE.Group();
  root.name = `island-${level}`;
  scene.add(root);
  const tiles = new Map();
  const props = new Map();
  const materialCache = new Map();
  const ownedGeometries = new Set();
  const ownedMaterials = new Set();
  const ownedInstances = new Set();
  const animatedTrees = [];
  const timedEffects = [];
  const entranceKey = '0,3';
  const portalKey = '0,-3';
  const turns = (Math.max(1, level) - 1) % 6;
  const enemyKeys = ['-2,2', '1,0', '-1,-1'].map((key) => rotateKey(key, turns));
  const resourceKeys = ['2,0', '-2,0'].map((key) => rotateKey(key, turns));
  const chestKeys = ['3,-2', '-3,1'].map((key) => rotateKey(key, turns));
  const campKey = rotateKey('2,1', turns);
  const specialKeys = new Set([entranceKey, portalKey, campKey, ...enemyKeys, ...resourceKeys, ...chestKeys]);
  const geo = (geometry) => { ownedGeometries.add(geometry); return geometry; };
  const mat = (material) => { ownedMaterials.add(material); return material; };

  function cloneMaterial(source, category) {
    const cacheKey = `${source.uuid}:${category}`;
    if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);
    const material = mat(source.clone());
    const isTerrain = category.startsWith('terrain');
    material.roughness = isTerrain ? 0.95 : 0.8;
    material.metalness = 0;
    if (isTerrain) {
      const variant = Number(category.split('-')[1] || 0);
      const grassColor = new THREE.Color(biome.grass).multiplyScalar(0.94 + variant * 0.025);
      const earthColor = new THREE.Color('#918269');
      material.onBeforeCompile = (shader) => {
        shader.uniforms.grassColor = { value: grassColor };
        shader.uniforms.earthColor = { value: earthColor };
        shader.vertexShader = 'varying float terrainNormalY;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nterrainNormalY = normal.y;');
        shader.fragmentShader = 'uniform vec3 grassColor; uniform vec3 earthColor; varying float terrainNormalY;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #include <map_fragment>
          float topSurface = smoothstep(.1, .75, terrainNormalY);
          diffuseColor.rgb = mix(earthColor * .85, grassColor, topSurface);
        `);
      };
      material.customProgramCacheKey = () => `ground-v2-${biomeIndex}-${variant}`;
    } else if (biome.foliage && category === 'foliage') {
      const seasonalColor = new THREE.Color(biome.foliage);
      const strength = 0.95;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.seasonalColor = { value: seasonalColor };
        shader.uniforms.seasonalStrength = { value: strength };
        shader.fragmentShader = 'uniform vec3 seasonalColor; uniform float seasonalStrength;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #include <map_fragment>
          float foliageMask = smoothstep(0.015, 0.08, diffuseColor.g - max(diffuseColor.r, diffuseColor.b));
          float foliageLight = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = mix(diffuseColor.rgb, seasonalColor * (foliageLight * 1.8 + 0.12), foliageMask * seasonalStrength);
        `);
      };
      material.customProgramCacheKey = () => `season-${biomeIndex}-${category}`;
    }
    materialCache.set(cacheKey, material);
    return material;
  }

  function model(name, position, scale = 1, rotation = 0, category = 'prop', parent = root) {
    const object = sourceModels.get(name).clone(true);
    object.position.copy(position);
    object.scale.setScalar(scale);
    object.rotation.y = rotation;
    object.traverse((node) => {
      if (!node.isMesh) return;
      node.material = Array.isArray(node.material)
        ? node.material.map((material) => cloneMaterial(material, category))
        : cloneMaterial(node.material, category);
    });
    parent.add(object);
    return object;
  }

  function makeHex(q, r, elevation = TOP) {
    const variant = ((q * 7 + r * 13) % 5 + 5) % 5;
    const object = model('grass', axial(q, r, elevation), 1, Math.PI / 6, `terrain-${variant}`);
    object.scale.set(HEX_SCALE, 0.65, HEX_SCALE);
    return object;
  }

  // Generate the data grid before decoration. Every one of the 37 tiles is reachable.
  for (let q = -3; q <= 3; q++) {
    for (let r = Math.max(-3, -q - 3); r <= Math.min(3, -q + 3); r++) {
      const key = `${q},${r}`;
      let kind = 'grass';
      if (enemyKeys.includes(key)) kind = 'enemy';
      else if (resourceKeys.includes(key)) kind = 'resource';
      else if (chestKeys.includes(key)) kind = 'chest';
      else if (key === campKey) kind = 'camp';
      else if (key === portalKey) kind = 'portal';
      else if (key === entranceKey) kind = 'entrance';
      tiles.set(key, { key, q, r, kind, position: axial(q, r), walkable: true, mesh: null, instanceId: -1 });
    }
  }

  // Batch the identical KayKit ground geometry by its five existing colour variants.
  // The coordinates, shader inputs, scale and lighting are identical to individual tiles.
  const terrainGroups = Array.from({ length: 5 }, () => []);
  for (const tile of tiles.values()) terrainGroups[((tile.q * 7 + tile.r * 13) % 5 + 5) % 5].push(tile);
  const terrainSource = sourceModels.get('grass');
  terrainSource.updateMatrixWorld(true);
  const terrainParts = [];
  terrainSource.traverse((node) => { if (node.isMesh) terrainParts.push(node); });
  const terrainTransform = new THREE.Object3D();
  const terrainMatrix = new THREE.Matrix4();
  terrainTransform.rotation.y = Math.PI / 6;
  terrainTransform.scale.set(HEX_SCALE, 0.65, HEX_SCALE);
  for (const [variant, members] of terrainGroups.entries()) {
    if (!members.length) continue;
    for (const part of terrainParts) {
      const materials = Array.isArray(part.material)
        ? part.material.map((material) => cloneMaterial(material, `terrain-${variant}`))
        : cloneMaterial(part.material, `terrain-${variant}`);
      const batch = new THREE.InstancedMesh(part.geometry, materials, members.length);
      batch.name = `terrain-${variant}`;
      batch.castShadow = true;
      batch.receiveShadow = true;
      batch.userData.tileKeys = members.map((tile) => tile.key);
      members.forEach((tile, instanceId) => {
        terrainTransform.position.copy(tile.position);
        terrainTransform.updateMatrix();
        terrainMatrix.multiplyMatrices(terrainTransform.matrix, part.matrixWorld);
        batch.setMatrixAt(instanceId, terrainMatrix);
        tile.mesh = batch;
        tile.instanceId = instanceId;
      });
      batch.instanceMatrix.needsUpdate = true;
      batch.computeBoundingSphere();
      root.add(batch);
      ownedInstances.add(batch);
    }
  }

  // Shared water shader: slow reflected bands, with no displacement under the shore.
  const waterTime = { value: 0 };
  const waterMaterial = mat(new THREE.MeshStandardMaterial({ color: biome.water, roughness: 0.38, metalness: 0.04 }));
  waterMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.waterTime = waterTime;
    shader.vertexShader = 'varying vec3 waterPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nwaterPosition = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = 'uniform float waterTime; varying vec3 waterPosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float ripple = sin(waterPosition.x * 1.45 + waterPosition.z * 1.9 + waterTime * .45)
        * sin(waterPosition.x * 1.8 - waterPosition.z * 1.1 - waterTime * .32);
      diffuseColor.rgb *= 1.0 + ripple * .045;
    `);
  };
  waterMaterial.customProgramCacheKey = () => 'island-water-v1';
  const sea = new THREE.Mesh(geo(new THREE.PlaneGeometry(180, 180)), waterMaterial);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.177;
  sea.receiveShadow = true;
  root.add(sea);
  // A tiny castle island gives the exit a silhouette without occupying a walking tile.
  makeHex(0, -4, 0.51);
  model(biomeIndex === 2 ? 'ruins' : 'castle', axial(0, -4, 0.51), biomeIndex === 2 ? 1.1 : 0.58, Math.PI, 'prop');
  model('treeA', new THREE.Vector3(-0.71, 0.51, -6.77), 1.05, 1.4, 'foliage');
  model('rock', new THREE.Vector3(0.68, 0.5, -6.6), 1.2, 0.7);

  const shoreVertices = [];
  for (const tile of tiles.values()) {
    for (const [dq, dr] of NEIGHBOURS) {
      if (tiles.has(`${tile.q + dq},${tile.r + dr}`)) continue;
      const direction = axial(dq, dr, 0).normalize();
      const centre = tile.position.clone().addScaledVector(direction, SQRT3 * 0.5 + 0.045);
      const along = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(0.46);
      shoreVertices.push(centre.x - along.x, -0.16, centre.z - along.z, centre.x + along.x, -0.16, centre.z + along.z);
    }
  }
  const shorelineGeometry = geo(new THREE.BufferGeometry());
  shorelineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(shoreVertices, 3));
  const foamMaterial = mat(new THREE.LineBasicMaterial({ color: '#d8fff1', transparent: true, opacity: 0.38, depthWrite: false }));
  root.add(new THREE.LineSegments(shorelineGeometry, foamMaterial));

  // Corner placement keeps a clear lane between the centres of all neighbouring hexes.
  for (const tile of tiles.values()) {
    if (specialKeys.has(tile.key)) continue;
    const edge = Math.max(Math.abs(tile.q), Math.abs(tile.r), Math.abs(tile.q + tile.r)) === 3;
    const treeCount = edge ? 2 : 0;
    const outwardCorner = Math.round(Math.atan2(tile.position.z, tile.position.x) / (Math.PI / 3)) * Math.PI / 3;
    for (let i = 0; i < treeCount; i++) {
      const offset = new THREE.Vector3(Math.cos(outwardCorner) * (i ? 0.86 : 0.83), 0, Math.sin(outwardCorner) * (i ? 0.86 : 0.83));
      offset.x += Math.sin(outwardCorner) * (i ? -0.19 : 0.13);
      offset.z += Math.cos(outwardCorner) * (i ? 0.19 : -0.13);
      const scale = (i ? 0.92 : 1.48) + random() * 0.25;
      const tree = model(random() > 0.4 ? 'treeA' : 'treeB', tile.position.clone().add(offset), scale, random() * Math.PI * 2, 'foliage');
      animatedTrees.push({ object: tree, phase: random() * 6.28 });
    }
    if (random() < 0.44) {
      model('rock', tile.position.clone().add(new THREE.Vector3(-0.7, 0, 0)), 0.55 + random() * 0.3, random() * 6.28);
    }
  }

  // A shared instanced patch of flowers adds colour without dozens of draw calls.
  const flowerGeometry = geo(new THREE.IcosahedronGeometry(0.043, 0));
  const flowerMaterial = mat(new THREE.MeshStandardMaterial({ color: biomeIndex === 1 ? '#ffdaa0' : '#fff3b5', roughness: 0.9 }));
  const flowers = new THREE.InstancedMesh(flowerGeometry, flowerMaterial, 48);
  ownedInstances.add(flowers);
  const dummy = new THREE.Object3D();
  const plainTiles = [...tiles.values()].filter((tile) => !specialKeys.has(tile.key));
  for (let i = 0; i < 48; i++) {
    const tile = plainTiles[Math.floor(random() * plainTiles.length)];
    const corner = Math.floor(random() * 6) * Math.PI / 3;
    dummy.position.set(tile.position.x + Math.cos(corner) * (0.64 + random() * 0.17), TOP + 0.065, tile.position.z + Math.sin(corner) * (0.64 + random() * 0.17));
    dummy.scale.setScalar(0.75 + random() * 0.7);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
  }
  root.add(flowers);

  const crystalMaterial = mat(new THREE.MeshStandardMaterial({ color: biome.crystal, emissive: biome.crystal, emissiveIntensity: 0.5, metalness: 0.1, roughness: 0.28, flatShading: true }));
  const crystalGeometry = geo(new THREE.CylinderGeometry(0, 0.12, 0.6, 5));
  for (const [index, key] of resourceKeys.entries()) {
    const tile = tiles.get(key);
    const group = new THREE.Group();
    group.position.copy(tile.position).add(new THREE.Vector3(index === 0 ? 0.86 : -0.86, 0, 0));
    root.add(group);
    model('stone', new THREE.Vector3(), 1.25, index * 0.8, 'prop', group);
    for (let i = 0; i < 3; i++) {
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
      crystal.position.set((i - 1) * 0.09, 0.4 + (i === 1 ? 0.13 : 0), i % 2 * 0.07);
      crystal.rotation.z = (i - 1) * -0.28;
      group.add(crystal);
    }
    props.set(key, { object: group, type: 'resource', basePosition: group.position.clone(), progress: 0, hitTime: 0 });
  }

  const chestGlowMaterial = mat(new THREE.MeshBasicMaterial({ color: '#ffd96e', transparent: true, opacity: 0, depthWrite: false }));
  const chestHaloGeometry = geo(new THREE.CircleGeometry(0.3, 20));
  for (const [index, key] of chestKeys.entries()) {
    const tile = tiles.get(key);
    const group = new THREE.Group();
    const out = tile.position.clone().setY(0).normalize();
    group.position.copy(tile.position).addScaledVector(out, 0.8);
    root.add(group);
    const chest = model('chest', new THREE.Vector3(), 0.39, -Math.atan2(out.z, out.x) + Math.PI / 2, 'prop', group);
    const lid = chest.getObjectByName('chest_gold_lid');
    const halo = new THREE.Mesh(chestHaloGeometry, chestGlowMaterial.clone());
    ownedMaterials.add(halo.material);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.015;
    group.add(halo);
    props.set(key, { object: group, type: 'chest', lid, lidRest: lid?.rotation.x ?? 0, open: false, openProgress: 0, halo });
  }

  // An unmistakable little resting place: a tent, blue pennant, and warm campfire.
  const camp = new THREE.Group();
  camp.position.copy(tiles.get(campKey).position);
  root.add(camp);
  const campOut = tiles.get(campKey).position.clone().setY(0).normalize();
  model('tent', campOut.clone().multiplyScalar(0.69), 1.65, Math.atan2(campOut.x, campOut.z), 'prop', camp);
  model('flag', campOut.clone().multiplyScalar(0.89).add(new THREE.Vector3(-0.25, 0, -0.1)), 1.1, 0, 'prop', camp);
  const fire = new THREE.Group();
  fire.position.copy(campOut).multiplyScalar(0.72).add(new THREE.Vector3(-campOut.z * 0.5, 0.02, campOut.x * 0.5));
  fire.scale.setScalar(1.3);
  camp.add(fire);
  const logMaterial = mat(new THREE.MeshStandardMaterial({ color: '#734c34', roughness: 1 }));
  const logGeometry = geo(new THREE.CylinderGeometry(0.046, 0.052, 0.35, 6));
  for (let i = 0; i < 2; i++) {
    const log = new THREE.Mesh(logGeometry, logMaterial);
    log.rotation.set(Math.PI / 2, 0, i * Math.PI / 2 + 0.45);
    log.position.y = 0.045;
    fire.add(log);
  }
  const flameMaterial = mat(new THREE.MeshBasicMaterial({ color: '#ffc968' }));
  const flame = new THREE.Mesh(geo(new THREE.IcosahedronGeometry(0.14, 0)), flameMaterial);
  flame.position.y = 0.19;
  flame.scale.set(0.75, 1.5, 0.75);
  fire.add(flame);
  const fireLight = new THREE.PointLight('#ffb45d', 0.8, 2, 2);
  fireLight.position.y = 0.32;
  fire.add(fireLight);
  props.set(campKey, { object: camp, type: 'camp', fire, used: false });

  const portal = new THREE.Group();
  portal.position.copy(tiles.get(portalKey).position);
  root.add(portal);
  const stoneMaterial = mat(new THREE.MeshStandardMaterial({ color: '#d2d2bc', roughness: 0.84 }));
  const ringMaterial = mat(new THREE.MeshStandardMaterial({ color: '#6b9da5', emissive: '#559bae', emissiveIntensity: 0.15, metalness: 0.25, roughness: 0.35 }));
  const ring = new THREE.Mesh(geo(new THREE.TorusGeometry(0.73, 0.105, 6, 36)), ringMaterial);
  ring.position.y = 1.08;
  ring.rotation.x = -0.35;
  ring.scale.y = 1.35;
  portal.add(ring);
  for (const side of [-1, 1]) {
    const stone = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.145, 0.2, 0.68, 5)), stoneMaterial);
    stone.position.set(side * 0.66, 0.34, 0.05);
    stone.rotation.y = side * 0.3;
    stone.castShadow = true;
    portal.add(stone);
  }
  const portalUniforms = { time: { value: 0 }, strength: { value: 0 } };
  const veilMaterial = mat(new THREE.ShaderMaterial({
    uniforms: portalUniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float time; uniform float strength;
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r=length(p); float a=atan(p.y,p.x);
        float edge=1.0-smoothstep(.78,1.0,r);
        float sw=0.5+0.5*sin(a*3.0-r*12.0+time*1.6);
        vec3 colour=mix(vec3(.15,.68,.78),vec3(.72,1.0,.83),sw*.6+pow(1.0-r,2.0)*.4);
        gl_FragColor=vec4(colour,edge*(.06+strength*(.24+sw*.17)));
      }`,
  }));
  const veil = new THREE.Mesh(geo(new THREE.CircleGeometry(0.68, 48)), veilMaterial);
  veil.position.set(0, 1.08, 0.005);
  veil.rotation.x = -0.35;
  veil.scale.y = 1.35;
  portal.add(veil);
  const portalLight = new THREE.PointLight('#9cffd7', 0, 3.5, 2);
  portalLight.position.set(0, 1.15, 0.5);
  portal.add(portalLight);
  const motesGeometry = geo(new THREE.BufferGeometry());
  const motePositions = new Float32Array(18 * 3);
  motesGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMaterial = mat(new THREE.PointsMaterial({ color: '#c6ffe1', size: 0.055, transparent: true, opacity: 0.1, depthWrite: false }));
  const motes = new THREE.Points(motesGeometry, moteMaterial);
  portal.add(motes);
  let portalActive = false;
  let portalStrength = 0;
  props.set(portalKey, { object: portal, type: 'portal', active: false });
  for (const [key, record] of props) record.object.traverse((node) => { node.userData.tileKey = key; });

  // The API performs visual responses only; rewards and combat stay in the game controller.
  function openChest(key) {
    const chest = props.get(key);
    if (chest?.type !== 'chest' || chest.open) return;
    chest.open = true;
  }

  function hitResource(key, progress = 0) {
    const resource = props.get(key);
    if (resource?.type !== 'resource') return;
    resource.progress = THREE.MathUtils.clamp(progress, 0, 1);
    resource.hitTime = 0.28;
  }

  function setPortal(active) {
    portalActive = Boolean(active);
    props.get(portalKey).active = portalActive;
  }

  function useCamp() {
    const record = props.get(campKey);
    if (record.used) return;
    record.used = true;
    timedEffects.push({ object: fire, elapsed: 0, duration: 0.6 });
  }

  function update(dt, time) {
    const delta = Math.min(dt, 0.1);
    waterTime.value = time;
    portalUniforms.time.value = time;
    foamMaterial.opacity = 0.3 + Math.sin(time * 0.8) * 0.07;
    for (const { object, phase } of animatedTrees) {
      object.rotation.z = Math.sin(time * 0.85 + phase) * 0.009;
      object.rotation.x = Math.sin(time * 0.67 + phase * 1.4) * 0.007;
    }
    flame.scale.set(0.75 + Math.sin(time * 7) * 0.04, 1.5 + Math.sin(time * 9) * 0.14, 0.75);
    flame.rotation.y = time * 0.45;
    fireLight.intensity = 0.75 + Math.sin(time * 8) * 0.09;
    portalStrength = THREE.MathUtils.damp(portalStrength, portalActive ? 1 : 0, 4, delta);
    portalUniforms.strength.value = portalStrength;
    ringMaterial.emissiveIntensity = 0.12 + portalStrength * (1.7 + Math.sin(time * 2) * 0.2);
    ringMaterial.color.set(portalActive ? '#b8edc9' : '#7d9c9f');
    portalLight.intensity = portalStrength * 1.1;
    moteMaterial.opacity = 0.08 + portalStrength * 0.8;
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + time * 0.24;
      const radius = 0.73 + Math.sin(time * 0.7 + i * 1.7) * 0.09;
      motePositions[i * 3] = Math.cos(angle) * radius;
      motePositions[i * 3 + 1] = 1.08 + Math.sin(angle) * radius * 1.26;
      motePositions[i * 3 + 2] = -Math.sin(angle) * radius * 0.4 + Math.sin(time * 0.8 + i) * 0.1;
    }
    motesGeometry.attributes.position.needsUpdate = true;
    for (const record of props.values()) {
      if (record.type === 'chest' && record.open) {
        record.openProgress = Math.min(1, record.openProgress + delta / 0.55);
        const t = 1 - Math.pow(1 - record.openProgress, 3);
        if (record.lid) record.lid.rotation.x = record.lidRest - t * Math.PI * 0.62;
        record.halo.material.opacity = Math.sin(record.openProgress * Math.PI) * 0.58;
        record.halo.scale.setScalar(1 + t * 1.8);
      }
      if (record.type === 'resource') {
        record.hitTime = Math.max(0, record.hitTime - delta);
        const shake = Math.sin(record.hitTime * 85) * record.hitTime * 0.1;
        record.object.position.copy(record.basePosition);
        record.object.position.x += shake;
        const size = record.progress >= 1 ? 0 : 1 - record.progress * 0.24;
        record.object.scale.setScalar(THREE.MathUtils.damp(record.object.scale.x, size, 10, delta));
        if (record.progress >= 1 && record.object.scale.x < 0.01) record.object.visible = false;
      }
    }
    for (let i = timedEffects.length - 1; i >= 0; i--) {
      const effect = timedEffects[i];
      effect.elapsed += delta;
      const t = Math.min(1, effect.elapsed / effect.duration);
      effect.object.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.28);
      if (t >= 1) timedEffects.splice(i, 1);
    }
  }

  function dispose() {
    root.removeFromParent();
    for (const instances of ownedInstances) instances.dispose();
    for (const geometry of ownedGeometries) geometry.dispose();
    for (const material of ownedMaterials) material.dispose();
    // Cached GLTF geometries/textures belong to the loader cache and are reused next island.
    tiles.clear();
    props.clear();
    timedEffects.length = 0;
  }

  return {
    root, tiles, props, entranceKey, portalKey, enemyKeys, resourceKeys, chestKeys, campKey,
    biome: biome.id, bounds: { minX: -5.5, maxX: 5.5, minZ: -7.8, maxZ: 6.07 },
    update, dispose, openChest, hitResource, setPortal, useCamp,
  };
}
