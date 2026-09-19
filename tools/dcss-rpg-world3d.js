import * as THREE from 'three';
import {
  MAX_SPOT_SHADOW_LIGHTS,
  VOLUMETRIC_LIGHT_HEIGHT,
  selectWorldLights,
  worldLightPulse,
  worldShadowPlan,
} from './dcss-rpg-volumetric-lighting.js';

export const WORLD_CAMERA_ELEVATION = 65;
/** Shadow budget: the map is square, the frustum is a radius in tiles. */
export const WORLD_SHADOW_MAP_SIZE = 512;
export const WORLD_SHADOW_EXTENT = 7;

export const WORLD_WALL_HEIGHT = 0.6;
export const WORLD_RENDER_PIXEL_SIZE = 2;
export const WALL_FACE_TEXTURE_WIDTH = 32;
export const WALL_FACE_TEXTURE_HEIGHT = 21;
export const WALL_FACE_SAMPLE_WIDTH = 16;
export const WALL_FACE_SAMPLE_HEIGHT = 10;
export const WORLD_POINT_LIGHT_INTENSITY = 3.1;
export const WORLD_SPOT_LIGHT_INTENSITY = 26;
export const WORLD_BEAM_OPACITY = 0.072;
export const WORLD_AMBIENT_INTENSITY = 0.56;
export const WORLD_KEY_LIGHT_INTENSITY = 0.82;
export const MAX_SHADOWED_WORLD_LIGHTS = MAX_SPOT_SHADOW_LIGHTS;
/**
 * Every billboard standing on the floor is lifted the same distance toward the
 * camera, so it never fights the ground plane for the same pixels.
 *
 * It used to be given to decorations and finds only, and at a fifth of a tile
 * that was enough to put a statue, a chest or the ascent arch *in front of the
 * hero standing on it*. A lift that only some sprites get is not a lift, it is
 * a reordering — so now everything that stands on the floor gets it, and what
 * is in front of what is decided by ground position alone, exactly as the 2D
 * layer decides it for actors.
 */
export const WORLD_BILLBOARD_DEPTH_BIAS = 0.18;
/**
 * Scenery stands a hair further from the camera than anything alive. Both are
 * billboards on the same ground line, so on a shared cell their depth is an
 * exact tie and the draw order is whatever the sorter happened to pick — which
 * is why the hero arrived every run standing inside the ascent arch with the
 * arch painted over them. One step is enough to break the tie and far too small
 * to reorder anything a whole tile apart.
 */
export const WORLD_SCENERY_DEPTH_STEP = 0.08;
export const WORLD_DOOR_HEIGHT = 0.52;
export const WORLD_DOOR_THICKNESS = 0.12;
export const DOOR_PANEL_CROP = Object.freeze({ x: 6, y: 5, width: 20, height: 25 });

const elevationRadians = THREE.MathUtils.degToRad(WORLD_CAMERA_ELEVATION);
const groundVerticalScale = Math.sin(elevationRadians);
const cameraDistance = 12;
const cameraHeight = Math.tan(elevationRadians) * cameraDistance;

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
    else child.material?.dispose();
    child.customDepthMaterial?.dispose();
    child.customDistanceMaterial?.dispose();
  });
  object.clear();
}

function addInstancedTiles({ root, records, geometry, materialFor, castShadow, receiveShadow }) {
  const byPath = new Map();
  for (const record of records) {
    const collection = byPath.get(record.path) ?? [];
    collection.push(record);
    byPath.set(record.path, collection);
  }
  const matrix = new THREE.Matrix4();
  for (const [path, instances] of byPath) {
    const mesh = new THREE.InstancedMesh(geometry.clone(), materialFor(path), instances.length);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    mesh.frustumCulled = true;
    instances.forEach(({ x, y, height = 0 }, index) => {
      matrix.makeTranslation((x + 0.5) * groundVerticalScale, height, y + 0.5);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
  }
}

/** A persistent hinged leaf; it stays in the scene at both transition endpoints. */
export function createDoorAssembly({ door, panelMaterial, frameMaterial }) {
  const centerX = (door.x + 0.5) * groundVerticalScale;
  const centerZ = door.y + 0.5;
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  const passageAlongX = door.axis === 'x';
  const panelWidth = passageAlongX
    ? WORLD_DOOR_THICKNESS * groundVerticalScale
    : 0.82 * groundVerticalScale;
  const panelDepth = passageAlongX ? 0.82 : WORLD_DOOR_THICKNESS;
  const hingeOffset = passageAlongX ? 0.41 : 0.41 * groundVerticalScale;
  pivot.position.set(
    passageAlongX ? centerX : centerX - hingeOffset,
    0,
    passageAlongX ? centerZ - hingeOffset : centerZ,
  );
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(panelWidth, WORLD_DOOR_HEIGHT, panelDepth),
    panelMaterial,
  );
  panel.position.set(
    passageAlongX ? 0 : hingeOffset,
    WORLD_DOOR_HEIGHT / 2,
    passageAlongX ? hingeOffset : 0,
  );
  panel.castShadow = true;
  panel.receiveShadow = true;
  pivot.add(panel);
  group.add(pivot);

  const frame = new THREE.Group();
  const postWidth = passageAlongX ? 0.15 * groundVerticalScale : 0.12 * groundVerticalScale;
  const postDepth = passageAlongX ? 0.12 : 0.15;
  const postGeometry = new THREE.BoxGeometry(postWidth, WORLD_WALL_HEIGHT, postDepth);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(postGeometry.clone(), frameMaterial);
    post.position.set(
      passageAlongX ? centerX : centerX + side * 0.45 * groundVerticalScale,
      WORLD_WALL_HEIGHT / 2,
      passageAlongX ? centerZ + side * 0.45 : centerZ,
    );
    post.castShadow = true;
    post.receiveShadow = true;
    frame.add(post);
  }
  postGeometry.dispose();
  // A top lintel becomes a bright line across the floor from this camera angle.
  // The neighbouring wall caps already frame the opening, so only side posts stay.
  group.add(frame);
  const assembly = { axis: door.axis, group, panel, pivot, frame };
  setDoorAssemblyOpenProgress(assembly, door.open ? 1 : 0);
  return assembly;
}

/** One reversible pose function is used for opening, closing and save hydration. */
export function setDoorAssemblyOpenProgress(entry, progress) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const eased = clamped * clamped * (3 - 2 * clamped);
  entry.pivot.rotation.y = (entry.axis === 'x' ? 1 : -1) * eased * Math.PI * 0.5;
  entry.panel.position.y = WORLD_DOOR_HEIGHT / 2;
}

export function createDungeonWorld3D({ canvas, tileSize = 64 }) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('A WebGL canvas is required');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#040708');
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
  const worldRoot = new THREE.Group();
  const actorRoot = new THREE.Group();
  const volumetricLightRoot = new THREE.Group();
  scene.add(worldRoot, actorRoot, volumetricLightRoot);

  const ambient = new THREE.AmbientLight('#ffffff', WORLD_AMBIENT_INTENSITY);
  const hemisphere = new THREE.HemisphereLight('#dce2e1', '#5d6463', 0.16);
  scene.add(ambient, hemisphere);
  const keyLight = new THREE.DirectionalLight('#f4f0e5', WORLD_KEY_LIGHT_INTENSITY);
  keyLight.castShadow = true;
  // The shadow map only ever covers what the camera shows. A 512 map over a
  // seven-tile frustum is the same shadow on a phone at a quarter of the cost.
  keyLight.shadow.mapSize.set(WORLD_SHADOW_MAP_SIZE, WORLD_SHADOW_MAP_SIZE);
  keyLight.shadow.camera.left = -WORLD_SHADOW_EXTENT;
  keyLight.shadow.camera.right = WORLD_SHADOW_EXTENT;
  keyLight.shadow.camera.top = WORLD_SHADOW_EXTENT;
  keyLight.shadow.camera.bottom = -WORLD_SHADOW_EXTENT;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 48;
  keyLight.shadow.bias = -0.0008;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight, keyLight.target);

  const textureCache = new Map();
  const materialCache = new Map();
  const actorTextureCache = new Map();
  const actorEntries = new Map();
  const doorEntries = new Map();
  const worldLightEntries = new Map();
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const projected = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  let viewportWidth = 1;
  let viewportHeight = 1;
  let cameraCenterX = 0;
  let cameraCenterY = 0;
  const actorTint = new THREE.Color('#eeeae1');
  const actorHitTint = new THREE.Color('#ffe0c4');

  const removeWorldLightEntry = (key) => {
    const entry = worldLightEntries.get(key);
    if (!entry) return;
    volumetricLightRoot.remove(entry.group);
    entry.group.traverse((child) => {
      child.geometry?.dispose();
      child.material?.dispose();
    });
    worldLightEntries.delete(key);
  };

  const createWorldLightEntry = (source) => {
    const group = new THREE.Group();
    const point = new THREE.PointLight(
      source.color,
      WORLD_POINT_LIGHT_INTENSITY,
      source.radius * 1.65,
      2,
    );
    point.castShadow = false;
    point.shadow.mapSize.set(256, 256);
    point.shadow.camera.near = 0.12;
    point.shadow.camera.far = Math.max(2.5, source.radius * 1.8);
    point.shadow.bias = -0.0016;
    point.shadow.normalBias = 0.035;
    point.shadow.radius = 1.5;
    group.add(point);

    const spot = new THREE.SpotLight(
      source.color,
      WORLD_SPOT_LIGHT_INTENSITY,
      VOLUMETRIC_LIGHT_HEIGHT + 1.4,
      0.34,
      0.4,
      2,
    );
    spot.position.set(0, VOLUMETRIC_LIGHT_HEIGHT, 0);
    spot.target.position.set(0, 0, 0);
    spot.castShadow = false;
    spot.shadow.mapSize.set(512, 512);
    spot.shadow.camera.near = 0.2;
    spot.shadow.camera.far = VOLUMETRIC_LIGHT_HEIGHT + 1.5;
    spot.shadow.bias = -0.0007;
    spot.shadow.normalBias = 0.025;
    group.add(spot, spot.target);

    const beamMaterial = new THREE.MeshBasicMaterial({
      color: source.color,
      transparent: true,
      opacity: WORLD_BEAM_OPACITY,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
      toneMapped: false,
    });
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 1, 1, 8, 1, true),
      beamMaterial,
    );
    beam.renderOrder = 1;
    group.add(beam);

    const poolMaterial = new THREE.MeshBasicMaterial({
      color: source.color,
      transparent: true,
      opacity: 0.075,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
      toneMapped: false,
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 12), poolMaterial);
    pool.geometry.rotateX(-Math.PI / 2);
    pool.position.y = 0.018;
    pool.renderOrder = 1;
    group.add(pool);
    volumetricLightRoot.add(group);
    return { beam, group, point, pool, spot };
  };

  const syncLights = ({ sources, focus, elapsed = 0, reducedMotion = false }) => {
    const selected = selectWorldLights(sources, focus);
    const shadowPlan = worldShadowPlan(selected);
    const radialShadowKeys = new Set(shadowPlan.radial);
    const spotShadowKeys = new Set(shadowPlan.spot);
    const visibleBeamKeys = new Set(shadowPlan.beams);
    const activeKeys = new Set();
    for (const source of selected) {
      const key = source.id;
      activeKeys.add(key);
      let entry = worldLightEntries.get(key);
      if (!entry) {
        entry = createWorldLightEntry(source);
        worldLightEntries.set(key, entry);
      }
      const pulse = worldLightPulse(elapsed, source.phase, reducedMotion);
      const x = (source.x / tileSize) * groundVerticalScale;
      const z = source.y / tileSize;
      const beamRadius = Math.min(1.55, 0.46 + source.radius * 0.3);
      const poolRadius = Math.min(1.8, 0.38 + source.radius * 0.34);
      const flameDrift = reducedMotion ? 0 : pulse.rotation * 0.72;
      entry.group.position.set(x, 0, z);
      entry.point.color.set(source.color);
      entry.point.position.set(flameDrift, 0.76 + Math.abs(flameDrift) * 0.35, -flameDrift * 0.58);
      entry.point.distance = source.radius * 1.65;
      entry.point.castShadow = radialShadowKeys.has(key);
      entry.point.shadow.camera.far = source.radius * 1.65 + 0.8;
      entry.point.shadow.camera.updateProjectionMatrix();
      entry.point.intensity =
        WORLD_POINT_LIGHT_INTENSITY * pulse.intensity * (source.beam ? 1 : 0.82);
      entry.spot.visible = true;
      entry.spot.color.set(source.color);
      entry.spot.intensity =
        WORLD_SPOT_LIGHT_INTENSITY * pulse.intensity * (source.beam ? 1 : 0.58);
      entry.spot.angle = Math.min(
        0.62,
        Math.max(0.36, Math.atan((source.radius * 0.9) / VOLUMETRIC_LIGHT_HEIGHT)),
      );
      entry.spot.castShadow = spotShadowKeys.has(key);
      entry.beam.visible = visibleBeamKeys.has(key);
      entry.beam.position.y = VOLUMETRIC_LIGHT_HEIGHT / 2 + 0.02;
      entry.beam.rotation.y = pulse.rotation;
      entry.beam.scale.set(
        beamRadius * groundVerticalScale,
        VOLUMETRIC_LIGHT_HEIGHT,
        beamRadius,
      );
      entry.beam.material.color.set(source.color);
      entry.beam.material.opacity = WORLD_BEAM_OPACITY * pulse.opacity;
      entry.pool.scale.set(poolRadius * groundVerticalScale, poolRadius, poolRadius);
      entry.pool.material.color.set(source.color);
      entry.pool.material.opacity = 0.075 * pulse.opacity;
    }
    for (const key of worldLightEntries.keys()) {
      if (!activeKeys.has(key)) removeWorldLightEntry(key);
    }
  };

  /**
   * A figure drawn out of equipment layers rather than from one sprite. The
   * hero has always been one; the ghost of a past run is the same hero wearing
   * what it died in, so it needs its own canvas and its own cache key.
   */
  const createLayeredFigure = () => {
    const figureCanvas = document.createElement('canvas');
    figureCanvas.width = 32;
    figureCanvas.height = 32;
    const figureContext = figureCanvas.getContext('2d', { alpha: true });
    figureContext.imageSmoothingEnabled = false;
    const figureTexture = new THREE.CanvasTexture(figureCanvas);
    figureTexture.colorSpace = THREE.SRGBColorSpace;
    figureTexture.magFilter = THREE.NearestFilter;
    figureTexture.minFilter = THREE.NearestFilter;
    figureTexture.generateMipmaps = false;
    let key = '';
    const compose = (layers, imageForPath, filter) => {
      // Each layer carries the recolouring of the item it came from, so the key
      // has to include it: two figures in the same gear of different materials
      // are not the same texture.
      const nextKey = `${filter}:${layers.map(({ path, filter: own }) => `${path}#${own ?? ''}`).join('|')}`;
      if (nextKey === key) return;
      key = nextKey;
      figureContext.clearRect(0, 0, figureCanvas.width, figureCanvas.height);
      for (const { path, filter: own } of layers) {
        const mirrored = path.startsWith('mirror:');
        const source = imageForPath(mirrored ? path.slice('mirror:'.length) : path);
        if (!source) continue;
        figureContext.save();
        figureContext.filter = own ? `${filter} ${own}` : filter;
        if (mirrored) {
          figureContext.translate(figureCanvas.width, 0);
          figureContext.scale(-1, 1);
        }
        figureContext.drawImage(source, 0, 0, figureCanvas.width, figureCanvas.height);
        figureContext.restore();
      }
      figureContext.filter = 'none';
      figureTexture.needsUpdate = true;
    };
    return { texture: figureTexture, compose };
  };

  const heroFigure = createLayeredFigure();
  const ghostFigure = createLayeredFigure();

  const textureFor = (path, imageForPath) => {
    if (textureCache.has(path)) return textureCache.get(path);
    const source = imageForPath(path);
    if (!source) throw new Error(`Missing 3D world texture: ${path}`);
    const texture = new THREE.Texture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    textureCache.set(path, texture);
    return texture;
  };

  const doorPanelTextureFor = (path, imageForPath) => {
    const cacheKey = `door-panel:${path}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
    const source = imageForPath(path);
    if (!source) throw new Error(`Missing 3D door texture: ${path}`);
    const sourceWidth = source.naturalWidth || source.width;
    const sourceHeight = source.naturalHeight || source.height;
    const scaleX = sourceWidth / 32;
    const scaleY = sourceHeight / 32;
    const cropX = Math.round(DOOR_PANEL_CROP.x * scaleX);
    const cropY = Math.round(DOOR_PANEL_CROP.y * scaleY);
    const cropWidth = Math.max(1, Math.round(DOOR_PANEL_CROP.width * scaleX));
    const cropHeight = Math.max(1, Math.round(DOOR_PANEL_CROP.height * scaleY));
    const panelCanvas = document.createElement('canvas');
    panelCanvas.width = DOOR_PANEL_CROP.width;
    panelCanvas.height = DOOR_PANEL_CROP.height;
    const panelContext = panelCanvas.getContext('2d', { alpha: false });
    panelContext.imageSmoothingEnabled = false;
    panelContext.drawImage(
      source,
      cropX,
      cropY,
      Math.min(cropWidth, sourceWidth - cropX),
      Math.min(cropHeight, sourceHeight - cropY),
      0,
      0,
      panelCanvas.width,
      panelCanvas.height,
    );
    const texture = new THREE.CanvasTexture(panelCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    textureCache.set(cacheKey, texture);
    return texture;
  };

  const wallFaceTextureFor = (path, imageForPath) => {
    const cacheKey = `wall-face:${path}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
    const source = imageForPath(path);
    if (!source) throw new Error(`Missing 3D wall face texture: ${path}`);
    const sourceWidth = source.naturalWidth || source.width;
    const sourceHeight = source.naturalHeight || source.height;
    const cropWidth = Math.max(1, sourceWidth - 2);
    const cropHeight = Math.min(sourceHeight, WALL_FACE_TEXTURE_HEIGHT);
    const cropY = Math.max(0, Math.floor((sourceHeight - cropHeight) / 2));
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = WALL_FACE_SAMPLE_WIDTH;
    sampleCanvas.height = WALL_FACE_SAMPLE_HEIGHT;
    const sampleContext = sampleCanvas.getContext('2d', { alpha: false });
    sampleContext.imageSmoothingEnabled = true;
    sampleContext.filter = 'brightness(0.82) saturate(0.7) contrast(0.72)';
    sampleContext.drawImage(
      source,
      Math.min(1, sourceWidth - 1),
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      WALL_FACE_SAMPLE_WIDTH,
      WALL_FACE_SAMPLE_HEIGHT,
    );
    const sideCanvas = document.createElement('canvas');
    sideCanvas.width = WALL_FACE_TEXTURE_WIDTH;
    sideCanvas.height = WALL_FACE_TEXTURE_HEIGHT;
    const sideContext = sideCanvas.getContext('2d', { alpha: false });
    sideContext.imageSmoothingEnabled = false;
    sideContext.drawImage(
      sampleCanvas,
      0,
      0,
      WALL_FACE_SAMPLE_WIDTH,
      WALL_FACE_SAMPLE_HEIGHT,
      0,
      0,
      WALL_FACE_TEXTURE_WIDTH,
      WALL_FACE_TEXTURE_HEIGHT - 1,
    );
    sideContext.fillStyle = 'rgb(220 225 216 / 6%)';
    sideContext.fillRect(0, 0, WALL_FACE_TEXTURE_WIDTH, 2);
    sideContext.fillStyle = 'rgb(3 6 7 / 13%)';
    sideContext.fillRect(0, 9, WALL_FACE_TEXTURE_WIDTH, 2);
    sideContext.fillRect(15, 0, 2, 9);
    sideContext.fillRect(7, 11, 2, 10);
    sideContext.fillStyle = 'rgb(2 4 5 / 20%)';
    sideContext.fillRect(0, 16, WALL_FACE_TEXTURE_WIDTH, 5);
    const texture = new THREE.CanvasTexture(sideCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    textureCache.set(cacheKey, texture);
    return texture;
  };

  /**
   * A picture that never loaded is a cosmetic fault; it used to be a fatal one.
   *
   * This threw, and it is called from the middle of the render, so one sprite
   * whose path nobody remembered to preload stopped the world on every frame
   * from the moment it came into view — the bag and the stick kept working and
   * the game looked hung. That is how the city's «наружу» gate froze Ivan's
   * run twice: its tile was never in any asset list and only rode along while
   * the down stair happened to use the same file.
   *
   * Now the sprite is simply not drawn, once per path, and the run goes on.
   */
  const missingActorTextures = new Set();

  const actorTextureFor = (path, imageForPath, filter) => {
    const cacheKey = `${path}:${filter}`;
    if (actorTextureCache.has(cacheKey)) return actorTextureCache.get(cacheKey);
    const source = imageForPath(path);
    if (!source) {
      if (!missingActorTextures.has(path)) {
        missingActorTextures.add(path);
        console.warn(`DNG Codex: no picture for ${path}; that sprite is not drawn`);
      }
      return null;
    }
    const actorCanvas = document.createElement('canvas');
    actorCanvas.width = source.naturalWidth || source.width;
    actorCanvas.height = source.naturalHeight || source.height;
    const actorContext = actorCanvas.getContext('2d', { alpha: true });
    actorContext.imageSmoothingEnabled = false;
    actorContext.filter = filter;
    actorContext.drawImage(source, 0, 0, actorCanvas.width, actorCanvas.height);
    const texture = new THREE.CanvasTexture(actorCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    actorTextureCache.set(cacheKey, texture);
    return texture;
  };

  const createActorEntry = (map) => {
    const material = new THREE.SpriteMaterial({
      map,
      transparent: true,
      alphaTest: 0.025,
      depthTest: true,
      depthWrite: true,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 2;
    actorRoot.add(sprite);

    const casterMaterial = new THREE.MeshBasicMaterial({
      map,
      alphaTest: 0.08,
      transparent: true,
      colorWrite: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
    });
    const caster = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), casterMaterial);
    caster.castShadow = true;
    caster.receiveShadow = false;
    caster.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map,
      alphaTest: 0.08,
      side: THREE.DoubleSide,
    });
    caster.customDistanceMaterial = new THREE.MeshDistanceMaterial({
      map,
      alphaTest: 0.08,
      side: THREE.DoubleSide,
    });
    actorRoot.add(caster);

    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: '#010203',
      transparent: true,
      opacity: 0.42,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    const shadowGeometry = new THREE.CircleGeometry(1, 16);
    shadowGeometry.rotateX(-Math.PI / 2);
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.renderOrder = 1;
    actorRoot.add(shadow);
    return { caster, shadow, sprite };
  };

  const removeActorEntry = (key) => {
    const entry = actorEntries.get(key);
    if (!entry) return;
    actorRoot.remove(entry.sprite, entry.shadow, entry.caster);
    entry.sprite.material.dispose();
    entry.shadow.material.dispose();
    entry.shadow.geometry.dispose();
    entry.caster.material.dispose();
    entry.caster.geometry.dispose();
    entry.caster.customDepthMaterial.dispose();
    entry.caster.customDistanceMaterial.dispose();
    actorEntries.delete(key);
  };

  const placeActor = (entry, actor) => {
    const planeScale = (actor.size * groundVerticalScale) / tileSize;
    const verticalPixelsPerUnit =
      (tileSize * Math.cos(elevationRadians)) / groundVerticalScale;
    /**
     * A sprite sorts by the cell it stands on, not by how high it was lifted.
     *
     * `screenOffsetY` raises a sprite, and in a tilted view raising something
     * brings it closer to the camera — so the taller and higher a prop was
     * drawn, the more it won the depth test against things genuinely in front
     * of it. The tavern hearth is lifted twenty pixels and ninety-two tall,
     * and it painted over a hero standing a whole cell nearer the camera:
     * «камин рисуется поверх персонажей, стоишь как будто слоем ниже».
     *
     * `depthBias` moves a sprite along the view axis, which changes depth
     * without moving it on screen. Cancelling exactly the depth the lift
     * introduced leaves the picture untouched and puts the order back on the
     * ground, where the player reads it.
     */
    const lift = -actor.screenOffsetY / verticalPixelsPerUnit;
    const depthBias = WORLD_BILLBOARD_DEPTH_BIAS
      + (actor.depthBias ?? 0)
      - lift * Math.sin(elevationRadians);
    entry.sprite.position.set(
      (actor.x / tileSize) * groundVerticalScale,
      lift + depthBias * Math.sin(elevationRadians),
      actor.y / tileSize + depthBias * Math.cos(elevationRadians),
    );
    entry.sprite.scale.set(
      planeScale * (actor.facing ?? 1) * (actor.scaleX ?? 1),
      planeScale * (actor.scaleY ?? 1),
      1,
    );
    entry.sprite.material.opacity = actor.opacity;
    entry.sprite.material.rotation = actor.rotation ?? 0;
    entry.sprite.material.color.copy(actor.hit ? actorHitTint : actorTint);
    entry.sprite.visible = actor.opacity > 0.01;

    entry.caster.position.copy(entry.sprite.position);
    entry.caster.scale.copy(entry.sprite.scale);
    entry.caster.visible = actor.opacity > 0.04;

    const shadowScale = (actor.size / 82) * (actor.shadowScale ?? 1);
    entry.shadow.position.set(
      (actor.x / tileSize) * groundVerticalScale,
      0.012,
      actor.y / tileSize,
    );
    entry.shadow.scale.set(0.31 * shadowScale, 1, 0.14 * shadowScale);
    entry.shadow.material.opacity = (actor.shadowOpacity ?? 0.42) * actor.opacity;
    entry.shadow.visible = actor.opacity > 0.04 && (actor.shadowOpacity ?? 0.42) > 0;
  };

  const syncActors = ({ hero, ghost = null, monsters, decorations = [], imageForPath, spriteFilter }) => {
    heroFigure.compose(hero.layers, imageForPath, spriteFilter);
    const activeKeys = new Set(['hero']);
    let heroEntry = actorEntries.get('hero');
    if (!heroEntry) {
      heroEntry = createActorEntry(heroFigure.texture);
      actorEntries.set('hero', heroEntry);
    }
    placeActor(heroEntry, hero);

    // The ghost is built the same way the hero is, because it is the hero — it
    // only wears the room's light differently, which is what `filter` is for.
    if (ghost) {
      ghostFigure.compose(
        ghost.layers,
        imageForPath,
        ghost.filter ? `${spriteFilter} ${ghost.filter}` : spriteFilter,
      );
      activeKeys.add('ghost');
      let ghostEntry = actorEntries.get('ghost');
      if (!ghostEntry) {
        ghostEntry = createActorEntry(ghostFigure.texture);
        actorEntries.set('ghost', ghostEntry);
      }
      placeActor(ghostEntry, ghost);
    }

    for (const monster of monsters) {
      const key = `monster:${monster.id}`;
      activeKeys.add(key);
      // A marked creature wears its own tint on top of the room's light, and
      // the texture cache is keyed by both — two goblins, one marked, are two
      // different pictures.
      const filter = monster.filter ? `${spriteFilter} ${monster.filter}` : spriteFilter;
      const texture = actorTextureFor(monster.path, imageForPath, filter);
      if (!texture) {
        activeKeys.delete(key);
        continue;
      }
      let entry = actorEntries.get(key);
      if (!entry) {
        entry = createActorEntry(texture);
        entry.path = monster.path;
        entry.filter = filter;
        actorEntries.set(key, entry);
      } else if (entry.path !== monster.path || entry.filter !== filter) {
        entry.filter = filter;
        entry.sprite.material.map = texture;
        entry.sprite.material.needsUpdate = true;
        entry.caster.material.map = texture;
        entry.caster.material.needsUpdate = true;
        entry.caster.customDepthMaterial.map = texture;
        entry.caster.customDepthMaterial.needsUpdate = true;
        entry.caster.customDistanceMaterial.map = texture;
        entry.caster.customDistanceMaterial.needsUpdate = true;
        entry.path = monster.path;
      }
      placeActor(entry, monster);
    }

    for (const decoration of decorations) {
      const key = `decoration:${decoration.id}`;
      const placement = {
        ...decoration,
        depthBias: (decoration.depthBias ?? 0) - WORLD_SCENERY_DEPTH_STEP,
      };
      activeKeys.add(key);
      const texture = actorTextureFor(decoration.path, imageForPath, spriteFilter);
      if (!texture) {
        activeKeys.delete(key);
        continue;
      }
      let entry = actorEntries.get(key);
      if (!entry) {
        entry = createActorEntry(texture);
        entry.path = decoration.path;
        actorEntries.set(key, entry);
      } else if (entry.path !== decoration.path) {
        entry.sprite.material.map = texture;
        entry.sprite.material.needsUpdate = true;
        entry.caster.material.map = texture;
        entry.caster.material.needsUpdate = true;
        entry.caster.customDepthMaterial.map = texture;
        entry.caster.customDepthMaterial.needsUpdate = true;
        entry.caster.customDistanceMaterial.map = texture;
        entry.caster.customDistanceMaterial.needsUpdate = true;
        entry.path = decoration.path;
      }
      placeActor(entry, placement);
    }

    for (const key of actorEntries.keys()) {
      if (!activeKeys.has(key)) removeActorEntry(key);
    }
  };

  const rebuild = ({
    grid, doors = [], floorPathAt, wallPathAt, imageForPath, theme, skipWallAt = null,
  }) => {
    disposeObject(worldRoot);
    doorEntries.clear();
    for (const material of materialCache.values()) material.dispose();
    materialCache.clear();

    const floorRecords = [];
    const wallRecords = [];
    const doorRecords = [];
    const doorByCell = new Map(doors.map((door) => [`${door.x},${door.y}`, door]));
    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < grid[0].length; x += 1) {
        floorRecords.push({ x, y, path: floorPathAt(x, y, grid[y][x]) });
        // Standing timber blocks the way without being a block of stone: the
        // floor keeps its ground and the tree itself is drawn in the prop pass.
        if (grid[y][x] === '#' && skipWallAt?.(x, y)) continue;
        if (grid[y][x] === '#') {
          wallRecords.push({
            x,
            y,
            height: WORLD_WALL_HEIGHT / 2,
            path: wallPathAt(x, y, grid[y][x]),
          });
        } else if (grid[y][x] === 'D' || doorByCell.has(`${x},${y}`)) {
          const definition = doorByCell.get(`${x},${y}`);
          const horizontalPassage = grid[y]?.[x - 1] === '.' || grid[y]?.[x + 1] === '.';
          const axis = definition?.axis ?? (horizontalPassage ? 'x' : 'y');
          const frameCells = axis === 'x'
            ? [{ x, y: y - 1 }, { x, y: y + 1 }]
            : [{ x: x - 1, y }, { x: x + 1, y }];
          const frameCell = frameCells.find((cell) => grid[cell.y]?.[cell.x] === '#')
            ?? { x, y };
          doorRecords.push({
            x,
            y,
            axis,
            open: grid[y][x] === '.',
            // Keep the wooden door material when its cell becomes walkable.
            path: wallPathAt(x, y, 'D'),
            // The fixed frame belongs to the masonry, not to the moving door sprite.
            framePath: wallPathAt(frameCell.x, frameCell.y, '#'),
          });
        }
      }
    }

    const materialFor = (kind) => (path) => {
      const cacheKey = `${kind}:${path}`;
      if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);
      const tint = kind === 'floor' ? theme.world3d.floorTint : theme.world3d.wallTint;
      const texture = textureFor(path, imageForPath);
      const material = new THREE.MeshLambertMaterial({
        map: texture,
        color: tint,
      });
      materialCache.set(cacheKey, material);
      return material;
    };

    const wallFaceMaterialFor = (path) => {
      const cacheKey = `wall-face:${path}`;
      if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);
      const material = new THREE.MeshLambertMaterial({
        map: wallFaceTextureFor(path, imageForPath),
        color: theme.world3d.wallTint,
      });
      materialCache.set(cacheKey, material);
      return material;
    };
    const wallMaterialSetFor = (path) => {
      const topMaterial = materialFor('wall-top')(path);
      const faceMaterial = wallFaceMaterialFor(path);
      return [
        faceMaterial,
        faceMaterial,
        topMaterial,
        faceMaterial,
        faceMaterial,
        faceMaterial,
      ];
    };
    const doorPanelMaterialFor = (path) => {
      const cacheKey = `door-panel:${path}`;
      if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);
      const material = new THREE.MeshLambertMaterial({
        map: doorPanelTextureFor(path, imageForPath),
        color: theme.world3d.wallTint,
      });
      materialCache.set(cacheKey, material);
      return material;
    };

    const floorGeometry = new THREE.PlaneGeometry(groundVerticalScale, 1);
    floorGeometry.rotateX(-Math.PI / 2);
    addInstancedTiles({
      root: worldRoot,
      records: floorRecords,
      geometry: floorGeometry,
      materialFor: materialFor('floor'),
      castShadow: false,
      receiveShadow: true,
    });
    floorGeometry.dispose();

    const wallGeometry = new THREE.BoxGeometry(groundVerticalScale, WORLD_WALL_HEIGHT, 1);
    addInstancedTiles({
      root: worldRoot,
      records: wallRecords,
      geometry: wallGeometry,
      materialFor: wallMaterialSetFor,
      castShadow: true,
      receiveShadow: true,
    });
    wallGeometry.dispose();

    for (const door of doorRecords) {
      const entry = createDoorAssembly({
        door,
        panelMaterial: doorPanelMaterialFor(door.path),
        frameMaterial: wallMaterialSetFor(door.framePath),
      });
      worldRoot.add(entry.group);
      doorEntries.set(`${door.x},${door.y}`, entry);
    }

    scene.background.set(theme.world3d.background);
    scene.fog = new THREE.FogExp2(theme.world3d.fog, theme.world3d.fogDensity);
    actorTint.set(theme.world3d.actorTint);
    hemisphere.color.set(theme.world3d.ambient);
    // How bright a place is before any lamp is lit. A cave is dark and that is
    // the point; a town is not a cave, and its streets had decoration on them
    // that nobody could make out. Places that do not say otherwise keep the
    // dungeon's own dark.
    ambient.intensity = theme.world3d.ambientIntensity ?? WORLD_AMBIENT_INTENSITY;
    keyLight.color.set(theme.world3d.keyLight);
  };

  const setDoorOpenProgress = (x, y, progress) => {
    const entry = doorEntries.get(`${x},${y}`);
    if (!entry) return false;
    setDoorAssemblyOpenProgress(entry, progress);
    return true;
  };

  const resize = (width, height) => {
    viewportWidth = Math.max(1, width);
    viewportHeight = Math.max(1, height);
    renderer.setPixelRatio(1);
    renderer.setSize(
      Math.max(1, Math.ceil(viewportWidth / WORLD_RENDER_PIXEL_SIZE)),
      Math.max(1, Math.ceil(viewportHeight / WORLD_RENDER_PIXEL_SIZE)),
      false,
    );
    const halfHeight = ((viewportHeight / tileSize) * groundVerticalScale) / 2;
    const halfWidth = ((viewportWidth / tileSize) * groundVerticalScale) / 2;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  };

  const setCamera = (worldX, worldY) => {
    cameraCenterX = Math.round(worldX / WORLD_RENDER_PIXEL_SIZE) * WORLD_RENDER_PIXEL_SIZE;
    cameraCenterY = Math.round(worldY / WORLD_RENDER_PIXEL_SIZE) * WORLD_RENDER_PIXEL_SIZE;
    const targetX = (cameraCenterX / tileSize) * groundVerticalScale;
    const targetZ = cameraCenterY / tileSize;
    camera.position.set(targetX, cameraHeight, targetZ + cameraDistance);
    camera.lookAt(targetX, 0, targetZ);
    camera.updateMatrixWorld();
    keyLight.position.set(targetX - 7, 12, targetZ + 8);
    keyLight.target.position.set(targetX, 0, targetZ);
    keyLight.target.updateMatrixWorld();
  };

  const render = ({ worldX, worldY }) => {
    setCamera(worldX, worldY);
    for (const entry of actorEntries.values()) entry.caster.quaternion.copy(camera.quaternion);
    renderer.render(scene, camera);
  };

  const project = (worldX, worldY, height = 0) => {
    projected.set((worldX / tileSize) * groundVerticalScale, height, worldY / tileSize);
    projected.project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * viewportWidth,
      y: (-projected.y * 0.5 + 0.5) * viewportHeight,
    };
  };

  /**
   * The canvas the hero is composed onto. The overlay needs it to rub its own
   * paint back off him — see `eraseWashAboveWaterline` in the adapter — and a
   * composed figure has no single sprite path to look up.
   */
  const heroSilhouette = () => heroFigure.texture.image;

  const unprojectGround = (clientX, clientY) => {
    const pointer = new THREE.Vector2(
      (clientX / viewportWidth) * 2 - 1,
      -(clientY / viewportHeight) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      return { x: cameraCenterX, y: cameraCenterY };
    }
    return {
      x: (hitPoint.x / groundVerticalScale) * tileSize,
      y: hitPoint.z * tileSize,
    };
  };

  const dispose = () => {
    disposeObject(worldRoot);
    disposeObject(actorRoot);
    disposeObject(volumetricLightRoot);
    for (const material of materialCache.values()) material.dispose();
    for (const texture of textureCache.values()) texture.dispose();
    for (const texture of actorTextureCache.values()) texture.dispose();
    heroFigure.texture.dispose();
    ghostFigure.texture.dispose();
    materialCache.clear();
    textureCache.clear();
    actorTextureCache.clear();
    actorEntries.clear();
    doorEntries.clear();
    worldLightEntries.clear();
    renderer.dispose();
  };

  return Object.freeze({
    dispose,
    project,
    rebuild,
    render,
    resize,
    setCamera,
    setDoorOpenProgress,
    syncActors,
    syncLights,
    unprojectGround,
    heroSilhouette,
  });
}
