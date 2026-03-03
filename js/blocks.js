import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

export const WATER_BLOCK_ID = 25;
export const LAVA_BLOCK_ID = 26;

export const BLOCK_TYPES = {
  1: { name: "Grass", material: "grass", preview: "grassTop" },
  2: { name: "Dirt", material: "dirt", preview: "dirt" },
  3: { name: "Stone", material: "stone", preview: "stone" },
  4: { name: "Sand", material: "sand", preview: "sand" },
  5: { name: "Cobble", material: "cobble", preview: "cobble" },
  6: { name: "Log", material: "log", preview: "logSide" },
  7: { name: "Leaves", material: "leaves", preview: "leaves" },
  8: { name: "Planks", material: "planks", preview: "planks" },
  9: { name: "Brick", material: "brick", preview: "brick" },
  10: { name: "Snow", material: "snow", preview: "snow" },
  11: { name: "Ice", material: "ice", preview: "ice" },
  12: { name: "Clay", material: "clay", preview: "clay" },
  13: { name: "Basalt", material: "basalt", preview: "basalt" },
  14: { name: "RedSand", material: "redSand", preview: "redSand" },
  15: { name: "Moss", material: "moss", preview: "moss" },
  16: { name: "Cactus", material: "cactus", preview: "cactusSide" },
  17: { name: "TallGrass", material: "plantGrass", preview: "plantGrass" },
  18: { name: "RedFlower", material: "redFlower", preview: "redFlower" },
  19: { name: "YellowFlower", material: "yellowFlower", preview: "yellowFlower" },
  20: { name: "Mushroom", material: "mushroom", preview: "mushroom" },
  21: { name: "CoalOre", material: "coalOre", preview: "coalOre" },
  22: { name: "IronOre", material: "ironOre", preview: "ironOre" },
  23: { name: "GoldOre", material: "goldOre", preview: "goldOre" },
  24: { name: "DiamondOre", material: "diamondOre", preview: "diamondOre" },
  25: { name: "Water", material: "water", preview: "water" },
  26: { name: "Lava", material: "lava", preview: "lava" },
};

export const PLANT_BLOCK_IDS = new Set([17, 18, 19, 20]);
export const ORE_BLOCK_IDS = new Set([21, 22, 23, 24]);
export const LIQUID_BLOCK_IDS = new Set([WATER_BLOCK_ID, LAVA_BLOCK_ID]);

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const plantGeo = new THREE.PlaneGeometry(1, 1);
const materials = {};
const previews = {};
let initialized = false;

function hexToRgb(hex) {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255,
  };
}

function clamp(v) {
  return Math.max(0, Math.min(255, v));
}

function rgbToHex({ r, g, b }) {
  return (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
}

function shade(hex, amount) {
  const c = hexToRgb(hex);
  return rgbToHex({ r: c.r + amount, g: c.g + amount, b: c.b + amount });
}

function createCanvasTexture(drawFn) {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  drawFn(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

function fillNoise(ctx, baseHex, spread, accentHex, accentRate) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = Math.floor((Math.random() * 2 - 1) * spread);
      let color = shade(baseHex, n);
      if (accentHex && Math.random() < accentRate) color = accentHex;
      ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

const textures = {
  dirt: createCanvasTexture((ctx) => fillNoise(ctx, 0x8a5c34, 20, 0x6c4424, 0.18)),
  stone: createCanvasTexture((ctx) => fillNoise(ctx, 0x8c8c8c, 18, 0x747474, 0.2)),
  sand: createCanvasTexture((ctx) => fillNoise(ctx, 0xd8c488, 14, 0xe8d8a2, 0.12)),
  water: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0x3e8fd6, 12, 0x62b6ff, 0.24);
    ctx.fillStyle = "#89d2ff";
    for (let y = 2; y < 16; y += 4) ctx.fillRect(0, y, 16, 1);
  }),
  lava: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0xd86219, 18, 0xffb02f, 0.34);
    ctx.fillStyle = "#ffde69";
    for (let x = 1; x < 16; x += 5) ctx.fillRect(x, 0, 1, 16);
  }),
  grassTop: createCanvasTexture((ctx) => fillNoise(ctx, 0x62a742, 22, 0x4c8c33, 0.2)),
  grassSide: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0x8a5c34, 18, 0x6e4726, 0.12);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 16; x++) {
        const c = Math.random() < 0.35 ? 0x4f9036 : 0x66aa43;
        ctx.fillStyle = `#${c.toString(16)}`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }),
  cobble: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0x7a7a7a, 20, 0x666666, 0.3);
    ctx.fillStyle = "#5b5b5b";
    for (let i = 0; i < 16; i += 4) {
      ctx.fillRect(i, 0, 1, 16);
      ctx.fillRect(0, i, 16, 1);
    }
  }),
  logSide: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0x8f623b, 14, 0x6f4827, 0.2);
    ctx.fillStyle = "#6f4827";
    for (let x = 2; x < 16; x += 4) ctx.fillRect(x, 0, 1, 16);
  }),
  logTop: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0xa0744d, 10, 0x8b5f39, 0.16);
    ctx.strokeStyle = "#6b4425";
    ctx.lineWidth = 1;
    ctx.strokeRect(1.5, 1.5, 13, 13);
    ctx.strokeRect(4.5, 4.5, 7, 7);
  }),
  leaves: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0x3d7d2d, 22, 0x2e6121, 0.35);
    ctx.clearRect(2, 1, 1, 1);
    ctx.clearRect(13, 3, 1, 1);
    ctx.clearRect(8, 9, 1, 1);
  }),
  planks: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0xc18b54, 8, 0xa77342, 0.1);
    ctx.fillStyle = "#9c6a3c";
    for (let y = 3; y < 16; y += 4) ctx.fillRect(0, y, 16, 1);
  }),
  brick: createCanvasTexture((ctx) => {
    ctx.fillStyle = "#7a2f25";
    ctx.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = Math.floor(Math.random() * 18) - 9;
        const c = shade(0x9a4436, n);
        ctx.fillStyle = `#${c.toString(16).padStart(6, "0")}`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = "#c2b8ad";
    for (let y = 0; y < 16; y += 4) ctx.fillRect(0, y, 16, 1);
    for (let y = 0; y < 16; y += 8) {
      const offset = y % 8 === 0 ? 0 : 4;
      for (let x = offset; x < 16; x += 8) ctx.fillRect(x, y, 1, 4);
    }
  }),
  snow: createCanvasTexture((ctx) => fillNoise(ctx, 0xf2f8ff, 8, 0xd9e8f6, 0.2)),
  ice: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0xb9ddf5, 18, 0x9bcde9, 0.18);
    ctx.fillStyle = "#d9f0ff";
    for (let i = 0; i < 16; i += 5) ctx.fillRect(i, 0, 1, 16);
  }),
  clay: createCanvasTexture((ctx) => fillNoise(ctx, 0xb59e8b, 12, 0x9f8a79, 0.22)),
  basalt: createCanvasTexture((ctx) => fillNoise(ctx, 0x4d5059, 14, 0x3f424b, 0.24)),
  redSand: createCanvasTexture((ctx) => fillNoise(ctx, 0xc66e3c, 16, 0xb4562d, 0.18)),
  moss: createCanvasTexture((ctx) => fillNoise(ctx, 0x54834a, 16, 0x3c6a34, 0.28)),
  cactusSide: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0x4e9c43, 14, 0x387b31, 0.26);
    ctx.fillStyle = "#2d5f29";
    for (let x = 1; x < 16; x += 5) ctx.fillRect(x, 0, 1, 16);
  }),
  cactusTop: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0x60ad54, 10, 0x4a8f40, 0.2);
    ctx.strokeStyle = "#2f6d2a";
    ctx.lineWidth = 1;
    ctx.strokeRect(1.5, 1.5, 13, 13);
  }),
  plantGrass: createCanvasTexture((ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(Math.random() * 16);
      const y = 5 + Math.floor(Math.random() * 11);
      const c = Math.random() < 0.4 ? 0x4d8f3f : 0x67aa56;
      ctx.fillStyle = `#${c.toString(16).padStart(6, "0")}`;
      ctx.fillRect(x, y, 1, 1);
      if (y > 6 && Math.random() < 0.35) ctx.fillRect(Math.max(0, x - 1), y - 1, 1, 1);
    }
  }),
  redFlower: createCanvasTexture((ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = "#4f8d3f";
    ctx.fillRect(7, 6, 2, 10);
    ctx.fillStyle = "#cc2a2a";
    ctx.fillRect(5, 2, 6, 4);
    ctx.fillStyle = "#e35b5b";
    ctx.fillRect(7, 1, 2, 1);
  }),
  yellowFlower: createCanvasTexture((ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = "#4f8d3f";
    ctx.fillRect(7, 6, 2, 10);
    ctx.fillStyle = "#d9be30";
    ctx.fillRect(5, 2, 6, 4);
    ctx.fillStyle = "#f4df73";
    ctx.fillRect(7, 1, 2, 1);
  }),
  mushroom: createCanvasTexture((ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = "#d8d1c5";
    ctx.fillRect(7, 8, 2, 8);
    ctx.fillStyle = "#a64a2e";
    ctx.fillRect(4, 4, 8, 4);
    ctx.fillStyle = "#d68b6d";
    ctx.fillRect(6, 3, 4, 1);
  }),
  coalOre: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0x7f7f7f, 12, 0x6b6b6b, 0.2);
    ctx.fillStyle = "#1e1e1e";
    for (let i = 0; i < 14; i++) ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 2, 2);
  }),
  ironOre: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0x7f7f7f, 12, 0x6b6b6b, 0.2);
    ctx.fillStyle = "#c08962";
    for (let i = 0; i < 12; i++) ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 2, 2);
  }),
  goldOre: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0x7f7f7f, 12, 0x6b6b6b, 0.2);
    ctx.fillStyle = "#d7b83f";
    for (let i = 0; i < 10; i++) ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 2, 2);
  }),
  diamondOre: createCanvasTexture((ctx) => {
    fillNoise(ctx, 0x7f7f7f, 12, 0x6b6b6b, 0.2);
    ctx.fillStyle = "#47cfd5";
    for (let i = 0; i < 8; i++) ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 2, 2);
  }),
};

export function makeMaterial(texture, transparent = false, opacity = 1, side = THREE.FrontSide) {
  return new THREE.MeshLambertMaterial({
    map: texture,
    transparent,
    opacity,
    side,
    alphaTest: transparent ? 0.3 : 0,
  });
}

function createMaterials() {
  Object.entries(BLOCK_TYPES).forEach(([id, def]) => {
    if (def.material === "grass") {
      materials[id] = [
        makeMaterial(textures.grassSide),
        makeMaterial(textures.grassSide),
        makeMaterial(textures.grassTop),
        makeMaterial(textures.dirt),
        makeMaterial(textures.grassSide),
        makeMaterial(textures.grassSide),
      ];
    } else if (def.material === "log") {
      materials[id] = [
        makeMaterial(textures.logSide),
        makeMaterial(textures.logSide),
        makeMaterial(textures.logTop),
        makeMaterial(textures.logTop),
        makeMaterial(textures.logSide),
        makeMaterial(textures.logSide),
      ];
    } else if (def.material === "leaves") {
      materials[id] = makeMaterial(textures.leaves, true);
    } else if (def.material === "ice") {
      materials[id] = makeMaterial(textures.ice, true, 0.7);
    } else if (def.material === "water") {
      materials[id] = new THREE.MeshLambertMaterial({
        map: textures.water,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
      });
    } else if (def.material === "lava") {
      materials[id] = new THREE.MeshLambertMaterial({
        map: textures.lava,
        emissive: new THREE.Color(0xff5a00),
        emissiveIntensity: 0.45,
      });
    } else if (def.material === "cactus") {
      materials[id] = [
        makeMaterial(textures.cactusSide),
        makeMaterial(textures.cactusSide),
        makeMaterial(textures.cactusTop),
        makeMaterial(textures.cactusTop),
        makeMaterial(textures.cactusSide),
        makeMaterial(textures.cactusSide),
      ];
    } else if (PLANT_BLOCK_IDS.has(Number(id))) {
      materials[id] = makeMaterial(textures[def.material], true, 1, THREE.DoubleSide);
    } else {
      materials[id] = makeMaterial(textures[def.material]);
    }

    const previewKey = def.preview || def.material;
    previews[id] = textures[previewKey].image.toDataURL();
  });
}

function ensureInit() {
  if (initialized) return;
  createMaterials();
  initialized = true;
}

export function getBlockPreview(type) {
  ensureInit();
  return previews[String(type)] ?? "";
}

export function createBlock(type, x, y, z) {
  ensureInit();
  const blockType = Number(type);
  const mat = materials[String(blockType)];
  if (!mat) return null;

  const isPlant = PLANT_BLOCK_IDS.has(blockType);
  if (isPlant) {
    const group = new THREE.Group();
    const p1 = new THREE.Mesh(plantGeo, mat);
    const p2 = new THREE.Mesh(plantGeo, mat);
    p1.position.y = 0.5;
    p2.position.y = 0.5;
    p1.rotation.y = Math.PI / 4;
    p2.rotation.y = -Math.PI / 4;
    p1.userData.block = { x, y, z };
    p2.userData.block = { x, y, z };
    group.add(p1, p2);
    group.position.set(x + 0.5, y, z + 0.5);
    group.userData.block = { x, y, z };
    return group;
  }

  const mesh = new THREE.Mesh(boxGeo, mat);
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.block = { x, y, z };
  return mesh;
}
