const UINT_RANGE = 0x100000000;

const hashUnit = (seed, index, salt) => {
  let value = Math.imul((seed ^ salt) + index * 0x9e3779b1, 0x45d9f3b);
  value ^= value >>> 16;
  value = Math.imul(value, 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / UINT_RANGE;
};

const freezeStars = (stars) => Object.freeze(stars.map((star) => Object.freeze(star)));

export const VOID_STAR_SCALE = 2;

export const VOID_STAR_LAYER_CONFIGS = Object.freeze([
  Object.freeze({
    id: 'far',
    tileSize: 208,
    count: 9,
    parallaxX: 1.2,
    parallaxY: 0.8,
    opacity: 0.34,
  }),
  Object.freeze({
    id: 'near',
    tileSize: 296,
    count: 11,
    parallaxX: 2.6,
    parallaxY: 1.7,
    opacity: 0.62,
  }),
]);

export function createVoidStarLayers(seed) {
  if (!Number.isInteger(seed)) throw new TypeError('Void stars require an integer seed');
  return Object.freeze(
    VOID_STAR_LAYER_CONFIGS.map((config, layerIndex) => {
      const columns = Math.ceil(Math.sqrt(config.count));
      const rows = Math.ceil(config.count / columns);
      const stars = Array.from({ length: config.count }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        return {
          x:
            ((column + 0.16 + hashUnit(seed, index, 11 + layerIndex * 29) * 0.68) /
              columns) *
            config.tileSize,
          y:
            ((row + 0.16 + hashUnit(seed, index, 47 + layerIndex * 31) * 0.68) / rows) *
            config.tileSize,
          alpha: 0.54 + hashUnit(seed, index, 83 + layerIndex * 37) * 0.46,
          phase: Math.floor(hashUnit(seed, index, 131 + layerIndex * 41) * 4),
          cross: hashUnit(seed, index, 181 + layerIndex * 43) > 0.88,
        };
      });
      return Object.freeze({ ...config, stars: freezeStars(stars) });
    }),
  );
}

const positiveModulo = (value, divisor) => ((value % divisor) + divisor) % divisor;

export function voidParallaxOffset(cameraCellX, cameraCellY, layer) {
  if (!Number.isFinite(cameraCellX) || !Number.isFinite(cameraCellY) || !layer) {
    throw new TypeError('Void parallax requires a camera position and layer');
  }
  return Object.freeze({
    x: positiveModulo(-cameraCellX * layer.parallaxX, layer.tileSize),
    y: positiveModulo(-cameraCellY * layer.parallaxY, layer.tileSize),
  });
}
