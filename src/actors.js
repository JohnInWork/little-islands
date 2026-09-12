import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const ASSETS = {
  hero: `${import.meta.env.BASE_URL}KayKit_Character_Pack_Adventurers_1.0_FREE/Knight.glb`,
  enemy: `${import.meta.env.BASE_URL}KayKit_Character_Pack_Skeletons_1.0_FREE/Skeleton_Minion.glb`,
  pickaxe: `${import.meta.env.BASE_URL}tools/tool-pickaxe-upgraded.glb`,
};

const loader = new GLTFLoader();
const assets = new Map();
const cleanName = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const equipmentPattern = /^(?:1h|2h)|shield|pickaxe/i;
const LOOPING = new Set(['idle', 'walk', 'run']);

function objectNamed(root, name) {
  const exact = root.getObjectByName(name);
  if (exact) return exact;
  const target = cleanName(name);
  let match;
  root.traverse((object) => {
    if (!match && cleanName(object.name) === target) match = object;
  });
  return match;
}

async function loadActorAsset(type) {
  if (!assets.has(type)) {
    const promise = loader.loadAsync(ASSETS[type]).then((gltf) => {
      // Keep all skeleton motion, but leave travel to the actor's outer group.
      const clips = gltf.animations.map((original) => {
        const clip = original.clone();
        for (const track of clip.tracks) {
          if (track.name !== 'root.position') continue;
          for (let index = 0; index < track.values.length; index += 3) {
            track.values[index] = 0;
            track.values[index + 2] = 0;
          }
        }
        return clip;
      });
      return { scene: gltf.scene, clips };
    }).catch((error) => {
      assets.delete(type);
      throw error;
    });
    assets.set(type, promise);
  }
  return assets.get(type);
}

function configureEquipment(model, heroTemplate, type, boss, variant, pickaxeTemplate) {
  if (type === 'hero') {
    const shield = ['Badge_Shield', 'Round_Shield', 'Rectangle_Shield'][variant % 3];
    model.traverse((object) => {
      if (!equipmentPattern.test(object.name)) return;
      object.visible = object.name === '1H_Sword' || object.name === shield;
    });
    const hand = objectNamed(model, 'handslot.r');
    const sword = objectNamed(model, '1H_Sword');
    if (hand && sword && pickaxeTemplate) {
      const pickaxe = pickaxeTemplate.clone(true);
      pickaxe.name = '1H_Pickaxe';
      // Kenney's tool is 0.24 units tall, whereas KayKit's skeleton is about
      // 2.4. Grip the lower fifth of the handle along the sword's local +Y.
      pickaxe.scale.setScalar(5.4);
      pickaxe.position.copy(sword.position);
      pickaxe.position.y -= 0.22;
      pickaxe.quaternion.copy(sword.quaternion);
      pickaxe.visible = false;
      hand.add(pickaxe);
    }
    return;
  }

  // KayKit uses matching hand slots across packs. Copy the original weapon's
  // local transform as well as its mesh so it stays in the animated hand.
  const weapon = objectNamed(heroTemplate, boss ? '2H_Sword' : '1H_Sword');
  const hand = objectNamed(model, 'handslot.r');
  if (weapon && hand) {
    const copy = weapon.clone(true);
    copy.visible = true;
    hand.add(copy);
  }
  if (!boss && variant % 3 === 2) {
    const shield = objectNamed(heroTemplate, 'Spike_Shield');
    const offhand = objectNamed(model, 'handslot.l');
    if (shield && offhand) {
      const copy = shield.clone(true);
      copy.visible = true;
      offhand.add(copy);
    }
  }
}

function cloneActorMaterials(model, type, boss, variant) {
  const copies = new Map();
  const eyes = [0xffb65d, 0x77ecdb, 0xff7273];
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (object.isSkinnedMesh) object.frustumCulled = false;
    const cloneMaterial = (source) => {
      // The hero atlas is shared by body, sword, and shields. The equipped
      // sword needs its own material so upgrades never tint the whole knight.
      const key = type === 'hero' && object.name === '1H_Sword'
        ? `${source.uuid}:equipped-sword` : source;
      if (!copies.has(key)) {
        const material = source.clone();
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
        if (material.roughness !== undefined) material.roughness = 0.67;
        if (type === 'enemy' && source.name === 'Glow') {
          material.color.set(boss ? 0xffd476 : eyes[variant % eyes.length]);
          material.emissive.copy(material.color);
          material.emissiveIntensity = boss ? 2.8 : 1.4;
        }
        copies.set(key, material);
      }
      return copies.get(key);
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial)
      : cloneMaterial(object.material);
  });
  return [...copies.values()];
}

function getBodyBounds(model) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  const part = new THREE.Box3();
  model.traverse((object) => {
    if (!object.isMesh || equipmentPattern.test(object.name)) return;
    // Equipment can extend far above the head; it must not shrink the body.
    part.setFromObject(object, true);
    bounds.union(part);
  });
  return bounds;
}

/**
 * Animated KayKit actor. root.position is the feet, and root faces +Z.
 * Face a target with root.rotation.y = Math.atan2(deltaX, deltaZ).
 * play accepts { speed, fade, loop, restart, hold, onComplete } and returns
 * the THREE.AnimationAction. One-shots return to idle unless hold is true;
 * death holds its final pose. update takes elapsed seconds, not milliseconds.
 * setTier(attackUpgrades) changes built-in equipment without changing the rig.
 */
export async function createActor(type = 'hero', options = {}) {
  const kind = type === 'hero' ? 'hero' : 'enemy';
  const boss = Boolean(options.boss);
  const variant = Math.abs(Math.floor(options.variant || 0));
  const [asset, heroAsset, pickaxeAsset] = await Promise.all([
    loadActorAsset(kind),
    loadActorAsset('hero'),
    kind === 'hero' ? loadActorAsset('pickaxe') : null,
  ]);
  const model = cloneSkeleton(asset.scene);
  const root = new THREE.Group();
  root.name = kind === 'hero' ? 'hero-actor' : boss ? 'boss-actor' : 'enemy-actor';
  root.userData.actorType = kind;
  root.userData.facing = '+Z';
  root.add(model);
  configureEquipment(model, heroAsset.scene, kind, boss, variant, pickaxeAsset?.scene);
  const materials = cloneActorMaterials(model, kind, boss, variant);
  const mixer = new THREE.AnimationMixer(model);
  const names = {
    idle: kind === 'enemy' ? ['Idle_Combat', 'Idle'] : ['Idle'],
    walk: kind === 'enemy' ? ['Walking_D_Skeletons', 'Walking_A'] : ['Walking_A'],
    run: ['Running_A', 'Walking_A'],
    attack: boss ? ['2H_Melee_Attack_Slice', '1H_Melee_Attack_Chop']
      : kind === 'enemy' ? ['1H_Melee_Attack_Chop'] : ['1H_Melee_Attack_Slice_Horizontal'],
    hit: ['Hit_A'],
    death: ['Death_A'],
    interact: ['Interact', 'PickUp'],
    mine: ['1H_Melee_Attack_Chop'],
    celebrate: ['Cheer'],
  };
  const clips = new Map(asset.clips.map((clip) => [clip.name, clip]));
  const actions = new Map();
  const durations = {};
  for (const [name, candidates] of Object.entries(names)) {
    const clip = candidates.map((candidate) => clips.get(candidate)).find(Boolean);
    if (!clip) continue;
    // Separate aliases can use the same clip but need independent loop state.
    const action = mixer.clipAction(clip.clone());
    actions.set(name, action);
    durations[name] = clip.duration;
  }

  // Measure in a grounded idle pose, before applying world height scaling.
  const groundingClip = names.idle.map((name) => clips.get(name)).find(Boolean);
  const groundingAction = mixer.clipAction(groundingClip);
  groundingAction.play();
  mixer.update(0);
  const bounds = getBodyBounds(model);
  groundingAction.stop();
  const height = options.height ?? (kind === 'hero' ? 1.6 : boss ? 1.9 : 1.4);
  const scale = height / Math.max(0.01, bounds.max.y - bounds.min.y);
  model.scale.setScalar(scale);
  model.position.y = -bounds.min.y * scale;
  root.userData.height = height;

  const emissiveDefaults = materials.filter((material) => material.emissive).map((material) => ({
    material,
    emissive: material.emissive.clone(),
    intensity: material.emissiveIntensity,
  }));
  const sword = kind === 'hero' ? objectNamed(model, '1H_Sword') : null;
  const pickaxe = kind === 'hero' ? objectNamed(model, '1H_Pickaxe') : null;
  const swordMaterials = sword ? [sword.material].flat() : [];
  const swordDefaults = swordMaterials.map((material) => ({
    material,
    emissive: material.emissive?.clone(),
    intensity: material.emissiveIntensity,
    color: material.color.clone(),
  }));
  const shieldTiers = ['Badge_Shield', 'Round_Shield', 'Rectangle_Shield', 'Spike_Shield'];
  let equipmentTier = -1;
  let activeAction = null;
  let activeName = '';
  let completion = null;
  let holdPose = false;
  let flashRemaining = 0;
  let disposed = false;
  const flashColor = new THREE.Color(0xff6a59);

  function setTier(upgrades = 0) {
    if (disposed || kind !== 'hero') return;
    const value = Number(upgrades);
    const tier = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    if (tier === equipmentTier) return;
    equipmentTier = tier;
    root.userData.equipmentTier = tier;
    const selectedShield = shieldTiers[Math.min(shieldTiers.length - 1, Math.floor(tier / 3))];
    model.traverse((object) => {
      if (/shield/i.test(object.name)) object.visible = object.name === selectedShield;
    });
    for (const original of swordDefaults) {
      const { material } = original;
      material.color.copy(original.color);
      if (tier >= 3) material.color.multiply(new THREE.Color(0xfff1cf));
      if (!material.emissive) continue;
      material.emissive.copy(original.emissive);
      material.emissiveIntensity = original.intensity;
      if (tier >= 3) {
        material.emissive.set(0xffc778);
        material.emissiveIntensity = 0.14 + Math.min(9, tier - 3) * 0.014;
      }
      // Flash recovery must return to the upgraded glow, not the initial one.
      const baseline = emissiveDefaults.find((saved) => saved.material === material);
      baseline.emissive.copy(material.emissive);
      baseline.intensity = material.emissiveIntensity;
    }
  }

  function play(name = 'idle', settings = {}) {
    if (disposed) return null;
    const action = actions.get(name) || actions.get('idle');
    if (!action) return null;
    if (pickaxe && sword) {
      pickaxe.visible = name === 'mine';
      sword.visible = name !== 'mine';
    }
    const loop = settings.loop ?? LOOPING.has(name);
    const speed = Math.max(0.01, settings.speed ?? 1);
    const fade = Math.max(0, settings.fade ?? (name === 'hit' ? 0.055 : name === 'attack' ? 0.09 : 0.16));
    // Repeated locomotion calls never reset the gait. Attacks always restart.
    if (activeAction === action && loop && !settings.restart) {
      action.setEffectiveTimeScale(speed);
      return action;
    }
    completion = typeof settings.onComplete === 'function' ? settings.onComplete : null;
    holdPose = settings.hold ?? name === 'death';
    action.reset();
    action.enabled = true;
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.setEffectiveTimeScale(speed);
    action.setEffectiveWeight(1);
    action.play();
    if (activeAction && activeAction !== action && fade > 0) {
      activeAction.crossFadeTo(action, fade, false);
    } else if (activeAction && activeAction !== action) {
      activeAction.stop();
    }
    activeAction = action;
    activeName = name;
    return action;
  }

  function onFinished(event) {
    if (event.action !== activeAction) return;
    const callback = completion;
    completion = null;
    if (!holdPose) play('idle', { fade: 0.16 });
    callback?.();
  }
  mixer.addEventListener('finished', onFinished);
  play('idle');
  // A small phase offset keeps groups of enemies from breathing in unison.
  if (kind === 'enemy') {
    activeAction.time = (variant * 0.271) % activeAction.getClip().duration;
    mixer.update(0);
  }

  function flash(color = 0xff6a59) {
    if (disposed) return;
    flashColor.set(color);
    flashRemaining = 0.18;
  }

  function update(dt) {
    if (disposed) return;
    const delta = Math.min(Math.max(dt, 0), 0.1);
    mixer.update(delta);
    if (flashRemaining > 0) {
      flashRemaining = Math.max(0, flashRemaining - delta);
      const strength = (flashRemaining / 0.18) ** 1.5;
      for (const saved of emissiveDefaults) {
        saved.material.emissive.copy(saved.emissive).lerp(flashColor, strength);
        saved.material.emissiveIntensity = saved.intensity + strength * 0.85;
      }
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    mixer.removeEventListener('finished', onFinished);
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    const skeletons = new Set();
    model.traverse((object) => {
      if (object.isSkinnedMesh) skeletons.add(object.skeleton);
    });
    for (const skeleton of skeletons) skeleton.dispose();
    for (const material of materials) material.dispose();
    // Geometry/textures belong to the asset cache and other live actors.
    root.removeFromParent();
  }

  return {
    root, model, mixer, height, materials, durations, play, update, flash, setTier, dispose,
    duration: (name, speed = 1) => (durations[name] || 0) / Math.max(0.01, speed),
    get action() { return activeName; },
  };
}
