import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import { initScene, syncRendererSize } from "./scene.js";

const WORLD_SIZE = 64;
const WORLD_HEIGHT = 28;
const SEA_LEVEL = 8;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.35;
const MAX_STACK = 999;
const MAX_HEALTH = 100;
const EAT_HEAL = 20;
const EAT_ITEM_ID = 20;
const ANIMAL_COUNT = 14;
const MOB_TARGET = 2;
const PLAYER_ATTACK_DAMAGE = 22;
const ENTITY_HIT_RANGE = 4.5;
const SKELETON_ARROW_SPEED = 17;
const SKELETON_ARROW_DAMAGE = 10;
const SKELETON_ARROW_LIFE = 2.6;
const CAVE_MIN_Y = 3;
const WATER_BLOCK_ID = 25;
const LAVA_BLOCK_ID = 26;
const TOOL_ORDER = ["hand", "wood", "stone", "iron", "diamond"];
const ARMOR_ORDER = ["none", "leather", "iron", "diamond"];
const TOOL_DAMAGE_MULT = { hand: 1, wood: 1.15, stone: 1.35, iron: 1.6, diamond: 1.9 };
const ARMOR_REDUCTION = { none: 0, leather: 0.16, iron: 0.34, diamond: 0.5 };

const BLOCK_TYPES = {
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
const HOTBAR_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
let hotbar = [...HOTBAR_IDS];

const PLANT_BLOCK_IDS = new Set([17, 18, 19, 20]);
const ORE_BLOCK_IDS = new Set([21, 22, 23, 24]);
const LIQUID_BLOCK_IDS = new Set([WATER_BLOCK_ID, LAVA_BLOCK_ID]);

const RECIPES = [
  { id: "planks", name: "Planks x4", in: { 6: 1 }, out: { 8: 4 } },
  { id: "cobble", name: "Cobble x2", in: { 3: 2 }, out: { 5: 2 } },
  { id: "brick", name: "Brick x2", in: { 4: 2, 3: 1 }, out: { 9: 2 } },
  { id: "dirt", name: "Dirt x2", in: { 7: 2 }, out: { 2: 2 } },
  { id: "grass", name: "Grass x1", in: { 2: 2, 7: 1 }, out: { 1: 1 } },
  { id: "snow", name: "Snow x2", in: { 11: 1 }, out: { 10: 2 } },
  { id: "moss", name: "Moss x2", in: { 2: 1, 7: 1 }, out: { 15: 2 } },
];

const BIOMES = {
  DESERT: "desert",
  PLAINS: "plains",
  TAIGA: "taiga",
  ROCKY: "rocky",
};

const { scene, camera, renderer, sun, moonLight, ambient, sunVisual, moonVisual } = initScene();
const DAY_SKY_COLOR = new THREE.Color(0x8fd0ff);
const NIGHT_SKY_COLOR = new THREE.Color(0x101c36);
const currentSkyColor = new THREE.Color();

const world = new Map();
const meshes = new Map();
const blockGroup = new THREE.Group();
scene.add(blockGroup);
const entityGroup = new THREE.Group();
scene.add(entityGroup);

const materials = {};
const hotbarPreviews = {};

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

function makeMaterial(texture, transparent = false, opacity = 1, side = THREE.FrontSide) {
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
    hotbarPreviews[id] = textures[previewKey].image.toDataURL();
  });
}

createMaterials();

const playerSkinData = (() => {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 48;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 32, 48);

  ctx.fillStyle = "#4b2c1b"; // hair
  ctx.fillRect(9, 2, 14, 4);
  ctx.fillStyle = "#f3c89f"; // face
  ctx.fillRect(9, 6, 14, 10);
  ctx.fillStyle = "#13243f"; // eyes
  ctx.fillRect(13, 10, 2, 2);
  ctx.fillRect(17, 10, 2, 2);

  ctx.fillStyle = "#2a6fd1"; // shirt
  ctx.fillRect(8, 16, 16, 14);
  ctx.fillStyle = "#2257a4";
  ctx.fillRect(8, 22, 16, 2);

  ctx.fillStyle = "#f3c89f"; // arms
  ctx.fillRect(4, 17, 4, 12);
  ctx.fillRect(24, 17, 4, 12);

  ctx.fillStyle = "#1d4f9c"; // legs
  ctx.fillRect(9, 30, 6, 16);
  ctx.fillRect(17, 30, 6, 16);
  ctx.fillStyle = "#163f7b";
  ctx.fillRect(9, 40, 6, 2);
  ctx.fillRect(17, 40, 6, 2);

  const facePx = ctx.getImageData(12, 8, 1, 1).data;
  const shirtPx = ctx.getImageData(10, 20, 1, 1).data;
  const skinColor = rgbToHex({ r: facePx[0], g: facePx[1], b: facePx[2] });
  const sleeveColor = rgbToHex({ r: shirtPx[0], g: shirtPx[1], b: shirtPx[2] });

  return {
    previewUrl: canvas.toDataURL(),
    skinColor,
    sleeveColor,
  };
})();
const playerSkinPreviewUrl = playerSkinData.previewUrl;

function createPlayerHands() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshLambertMaterial({
    color: playerSkinData.skinColor,
    depthTest: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const sleeveMat = new THREE.MeshLambertMaterial({
    color: playerSkinData.sleeveColor,
    depthTest: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const armGeo = new THREE.BoxGeometry(0.14, 0.28, 0.14);
  const cuffGeo = new THREE.BoxGeometry(0.15, 0.1, 0.15);

  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.set(-0.28, -0.34, -0.45);
  leftArm.rotation.set(-0.35, 0.18, 0.1);
  leftArm.renderOrder = 1000;

  const rightArm = new THREE.Mesh(armGeo, skinMat);
  rightArm.position.set(0.28, -0.34, -0.45);
  rightArm.rotation.set(-0.35, -0.18, -0.1);
  rightArm.renderOrder = 1000;

  const leftCuff = new THREE.Mesh(cuffGeo, sleeveMat);
  leftCuff.position.set(-0.28, -0.22, -0.44);
  leftCuff.rotation.copy(leftArm.rotation);
  leftCuff.renderOrder = 1001;

  const rightCuff = new THREE.Mesh(cuffGeo, sleeveMat);
  rightCuff.position.set(0.28, -0.22, -0.44);
  rightCuff.rotation.copy(rightArm.rotation);
  rightCuff.renderOrder = 1001;

  group.add(leftArm, rightArm, leftCuff, rightCuff);
  return { group, leftArm, rightArm, leftCuff, rightCuff };
}

function makeBoxMaterials(sideTex, topTex, bottomTex, frontTex, backTex = sideTex) {
  return [
    makeMaterial(sideTex),
    makeMaterial(sideTex),
    makeMaterial(topTex),
    makeMaterial(bottomTex),
    makeMaterial(frontTex),
    makeMaterial(backTex),
  ];
}

const cowBodyTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x7e4f2a, 10, 0x643b1f, 0.2);
  ctx.fillStyle = "#f4f1e6";
  ctx.fillRect(1, 3, 7, 6);
  ctx.fillRect(10, 8, 5, 5);
  ctx.fillRect(5, 11, 4, 4);
  ctx.fillStyle = "#3a2412";
  ctx.fillRect(3, 5, 3, 2);
});
const cowHeadSideTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x7a4b28, 9, 0x643a1e, 0.2);
  ctx.fillStyle = "#f4f1e6";
  ctx.fillRect(2, 3, 6, 5);
});
const cowHeadFrontTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x875732, 8, 0x6d4324, 0.2);
  ctx.fillStyle = "#171717";
  ctx.fillRect(4, 5, 2, 2);
  ctx.fillRect(10, 5, 2, 2);
  ctx.fillStyle = "#cfa3a0";
  ctx.fillRect(3, 9, 10, 5);
  ctx.fillStyle = "#6b4c4b";
  ctx.fillRect(5, 10, 1, 2);
  ctx.fillRect(10, 10, 1, 2);
});
const cowLegTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x684126, 8, 0x54331c, 0.24);
  ctx.fillStyle = "#2b1d13";
  ctx.fillRect(0, 12, 16, 4);
});
const cowBodyMaterials = makeBoxMaterials(cowBodyTexture, cowBodyTexture, cowBodyTexture, cowBodyTexture);
const cowHeadMaterials = makeBoxMaterials(cowHeadSideTexture, cowHeadSideTexture, cowHeadSideTexture, cowHeadFrontTexture);
const cowLegMaterials = makeBoxMaterials(cowLegTexture, cowLegTexture, cowLegTexture, cowLegTexture);

const sheepWoolTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xe8e8e8, 9, 0xd2d2d2, 0.24);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(2, 2, 4, 3);
  ctx.fillRect(9, 7, 4, 4);
});
const sheepFaceSideTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xb7a38d, 8, 0x9e8a76, 0.22);
});
const sheepFaceFrontTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xbba791, 7, 0xa5907d, 0.2);
  ctx.fillStyle = "#131313";
  ctx.fillRect(4, 5, 2, 2);
  ctx.fillRect(10, 5, 2, 2);
  ctx.fillStyle = "#8b7560";
  ctx.fillRect(6, 9, 4, 2);
});
const sheepLegTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xddd7cf, 7, 0xcfc8be, 0.18);
  ctx.fillStyle = "#b3a79a";
  ctx.fillRect(0, 12, 16, 4);
});
const sheepBodyMaterials = makeBoxMaterials(sheepWoolTexture, sheepWoolTexture, sheepWoolTexture, sheepWoolTexture);
const sheepHeadMaterials = makeBoxMaterials(sheepFaceSideTexture, sheepFaceSideTexture, sheepFaceSideTexture, sheepFaceFrontTexture);
const sheepLegMaterials = makeBoxMaterials(sheepLegTexture, sheepLegTexture, sheepLegTexture, sheepLegTexture);

const chickenBodyTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xf0efe9, 8, 0xdedcd4, 0.2);
  ctx.fillStyle = "#d2d2d2";
  ctx.fillRect(2, 4, 3, 4);
  ctx.fillRect(11, 6, 3, 4);
});
const chickenHeadFrontTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xf2f2ec, 6, 0xe2e2da, 0.18);
  ctx.fillStyle = "#171717";
  ctx.fillRect(4, 5, 2, 2);
  ctx.fillRect(10, 5, 2, 2);
  ctx.fillStyle = "#f0b12d";
  ctx.fillRect(6, 8, 4, 2);
  ctx.fillStyle = "#c43b30";
  ctx.fillRect(7, 10, 2, 2);
});
const chickenHeadSideTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xf0f0ea, 6, 0xe2e1d8, 0.18);
});
const chickenLegTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xe6a938, 8, 0xcf952f, 0.2);
  ctx.fillStyle = "#bd7e28";
  ctx.fillRect(0, 10, 16, 2);
});
const chickenBodyMaterials = makeBoxMaterials(chickenBodyTexture, chickenBodyTexture, chickenBodyTexture, chickenBodyTexture);
const chickenHeadMaterials = makeBoxMaterials(chickenHeadSideTexture, chickenHeadSideTexture, chickenHeadSideTexture, chickenHeadFrontTexture);
const chickenLegMaterials = makeBoxMaterials(chickenLegTexture, chickenLegTexture, chickenLegTexture, chickenLegTexture);

const zombieHeadSideTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x5aa05a, 8, 0x4a8e4f, 0.22);
});
const zombieHeadTopTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x69b36c, 8, 0x589e5f, 0.2);
});
const zombieHeadFrontTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x5ea862, 7, 0x4f9554, 0.2);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(4, 6, 3, 2);
  ctx.fillRect(9, 6, 3, 2);
  ctx.fillStyle = "#e1e85e";
  ctx.fillRect(5, 6, 1, 1);
  ctx.fillRect(10, 6, 1, 1);
  ctx.fillStyle = "#335f35";
  ctx.fillRect(6, 10, 4, 2);
});
const zombieTorsoSideTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x415f90, 7, 0x334e7c, 0.22);
});
const zombieTorsoFrontTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x47689a, 6, 0x385682, 0.24);
  ctx.fillStyle = "#314a72";
  ctx.fillRect(5, 4, 6, 1);
  ctx.fillRect(4, 11, 8, 1);
});
const zombieTorsoTopTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x5477ab, 6, 0x446394, 0.2);
});
const zombieArmTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x5aa05a, 8, 0x4a8f4d, 0.24);
  ctx.fillStyle = "#3d743d";
  for (let y = 2; y < 16; y += 4) ctx.fillRect(0, y, 16, 1);
});
const zombieLegTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x3f3f78, 8, 0x323263, 0.24);
  ctx.fillStyle = "#2b2b58";
  for (let y = 3; y < 16; y += 5) ctx.fillRect(0, y, 16, 1);
});
const zombieHeadMaterials = makeBoxMaterials(zombieHeadSideTexture, zombieHeadTopTexture, zombieHeadTopTexture, zombieHeadFrontTexture);
const zombieBodyMaterials = makeBoxMaterials(zombieTorsoSideTexture, zombieTorsoTopTexture, zombieTorsoTopTexture, zombieTorsoFrontTexture);
const zombieArmMaterials = makeBoxMaterials(zombieArmTexture, zombieArmTexture, zombieArmTexture, zombieArmTexture);
const zombieLegMaterials = makeBoxMaterials(zombieLegTexture, zombieLegTexture, zombieLegTexture, zombieLegTexture);
const skeletonBoneTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xe6e6e1, 9, 0xcfcfc8, 0.22);
  ctx.fillStyle = "#c2c2bb";
  for (let y = 2; y < 16; y += 4) ctx.fillRect(0, y, 16, 1);
});
const skeletonHeadFrontTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xe9e8e2, 7, 0xd3d2ca, 0.2);
  ctx.fillStyle = "#161616";
  ctx.fillRect(4, 5, 2, 2);
  ctx.fillRect(10, 5, 2, 2);
  ctx.fillRect(5, 10, 6, 2);
});
const skeletonRibTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xdededa, 7, 0xc5c5be, 0.2);
  ctx.fillStyle = "#b7b7b0";
  for (let x = 2; x < 16; x += 4) ctx.fillRect(x, 3, 1, 10);
  ctx.fillRect(1, 4, 14, 1);
  ctx.fillRect(1, 11, 14, 1);
});
const skeletonHeadMaterials = makeBoxMaterials(skeletonBoneTexture, skeletonBoneTexture, skeletonBoneTexture, skeletonHeadFrontTexture);
const skeletonBodyMaterials = makeBoxMaterials(skeletonRibTexture, skeletonBoneTexture, skeletonBoneTexture, skeletonRibTexture);
const skeletonArmMaterials = makeBoxMaterials(skeletonBoneTexture, skeletonBoneTexture, skeletonBoneTexture, skeletonBoneTexture);
const skeletonLegMaterials = makeBoxMaterials(skeletonBoneTexture, skeletonBoneTexture, skeletonBoneTexture, skeletonBoneTexture);
const bowWoodTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x8d6034, 8, 0x744b27, 0.22);
});
const bowStringTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xd9d9d9, 5, 0xc6c6c6, 0.18);
});
const arrowShaftTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x9b7b54, 7, 0x7f6141, 0.2);
});
const arrowTipTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0xbec2c8, 6, 0x9ea4ad, 0.2);
});
const bowWoodMaterials = makeBoxMaterials(bowWoodTexture, bowWoodTexture, bowWoodTexture, bowWoodTexture);
const bowStringMaterials = makeBoxMaterials(bowStringTexture, bowStringTexture, bowStringTexture, bowStringTexture);
const arrowShaftMaterials = makeBoxMaterials(arrowShaftTexture, arrowShaftTexture, arrowShaftTexture, arrowShaftTexture);
const arrowTipMaterials = makeBoxMaterials(arrowTipTexture, arrowTipTexture, arrowTipTexture, arrowTipTexture);
const creeperSkinTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x4aa84b, 10, 0x3f9240, 0.24);
  ctx.fillStyle = "#5fbe5d";
  ctx.fillRect(2, 3, 4, 3);
  ctx.fillRect(9, 9, 4, 4);
});
const creeperHeadFrontTexture = createCanvasTexture((ctx) => {
  fillNoise(ctx, 0x4faa50, 8, 0x3f9340, 0.24);
  ctx.fillStyle = "#121212";
  ctx.fillRect(3, 4, 3, 3);
  ctx.fillRect(10, 4, 3, 3);
  ctx.fillRect(6, 7, 4, 3);
  ctx.fillRect(5, 10, 2, 3);
  ctx.fillRect(9, 10, 2, 3);
});
const creeperBodyMaterials = makeBoxMaterials(creeperSkinTexture, creeperSkinTexture, creeperSkinTexture, creeperSkinTexture);
const creeperHeadMaterials = makeBoxMaterials(creeperSkinTexture, creeperSkinTexture, creeperSkinTexture, creeperHeadFrontTexture);
const creeperLegMaterials = makeBoxMaterials(creeperSkinTexture, creeperSkinTexture, creeperSkinTexture, creeperSkinTexture);

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const plantGeo = new THREE.PlaneGeometry(1, 1);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const hitOutline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)),
  new THREE.LineBasicMaterial({ color: 0x000000 })
);
hitOutline.visible = false;
scene.add(hitOutline);

const keys = new Set();
let selectedType = 1;
let equippedTool = "hand";
let equippedArmor = "none";
let canJump = false;
const velocity = new THREE.Vector3();
const spawnPoint = new THREE.Vector3(0.5, 12, 0.5);
let inventoryOpen = false;
const inventory = {};
let playerHealth = MAX_HEALTH;
const entities = [];
const skeletonArrows = [];
const PASSIVE_KINDS = ["cow", "sheep", "chicken"];
const HOSTILE_KINDS = ["zombie", "skeleton", "creeper"];
const ENTITY_STATS = {
  cow: { speed: 1.35, hp: 38 },
  sheep: { speed: 1.45, hp: 32 },
  chicken: { speed: 1.8, hp: 18 },
  zombie: { speed: 1.85, hp: 44 },
  skeleton: { speed: 2.05, hp: 34 },
  creeper: { speed: 1.95, hp: 38 },
};
let nextEntityId = 1;
let dayTime = 0.25;
let mobSpawnTimer = 0;
let wasNight = false;
let footstepTimer = 0;
let handSwingTime = 0;
let handActionTime = 0;
let handActionDuration = 0.15;
let handActionStrength = 0;
let handActionSide = "right";
let audioCtx = null;
const SFX_VOLUME_BOOST = 1.9;

const yaw = new THREE.Object3D();
const pitch = new THREE.Object3D();
yaw.add(pitch);
pitch.position.y = PLAYER_HEIGHT;
pitch.add(camera);
const handRig = createPlayerHands();
camera.add(handRig.group);
scene.add(yaw);

const hudHotbar = document.getElementById("hotbar");
const statusHud = document.getElementById("status");
const inventoryPanel = document.getElementById("inventory");
initializeInventory();
renderInventory();

function initializeInventory() {
  Object.keys(BLOCK_TYPES).forEach((id) => {
    inventory[id] = 0;
  });
  inventory[1] = 64;
  inventory[2] = 64;
  inventory[3] = 64;
  inventory[4] = 48;
  inventory[5] = 40;
  inventory[6] = 32;
  inventory[7] = 32;
  inventory[8] = 48;
  inventory[9] = 32;
  inventory[10] = 24;
  inventory[11] = 16;
  inventory[12] = 24;
  inventory[13] = 20;
  inventory[14] = 24;
  inventory[15] = 20;
  inventory[16] = 16;
}

function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playTone({
  type = "square",
  freq = 440,
  duration = 0.08,
  volume = 0.04,
  slide = 1,
  when = 0,
}) {
  if (!audioCtx || audioCtx.state !== "running") return;
  const start = audioCtx.currentTime + when;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  const loudness = Math.min(0.12, volume * SFX_VOLUME_BOOST);
  gain.gain.exponentialRampToValueAtTime(loudness, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.01);
}

function playNoise({ duration = 0.05, volume = 0.03, when = 0, filterType = "lowpass", cutoff = 1600 }) {
  if (!audioCtx || audioCtx.state !== "running") return;
  const length = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = cutoff;
  const gain = audioCtx.createGain();
  const start = audioCtx.currentTime + when;
  gain.gain.setValueAtTime(0.0001, start);
  const loudness = Math.min(0.12, volume * SFX_VOLUME_BOOST);
  gain.gain.exponentialRampToValueAtTime(loudness, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function playSfx(name) {
  if (!audioCtx || audioCtx.state !== "running") return;
  if (name === "break") {
    playNoise({ duration: 0.045, volume: 0.03, filterType: "highpass", cutoff: 780 });
    playNoise({ duration: 0.055, volume: 0.022, when: 0.012, filterType: "lowpass", cutoff: 1100 });
    playTone({ type: "square", freq: 140, duration: 0.045, volume: 0.016, slide: 0.65 });
  } else if (name === "place") {
    playTone({ type: "square", freq: 185, duration: 0.055, volume: 0.02, slide: 0.82 });
    playNoise({ duration: 0.03, volume: 0.012, filterType: "lowpass", cutoff: 620 });
  } else if (name === "jump") {
    return;
  } else if (name === "hurt") {
    playTone({ type: "square", freq: 170, duration: 0.08, volume: 0.03, slide: 0.52 });
    playTone({ type: "square", freq: 140, duration: 0.08, volume: 0.02, slide: 0.5, when: 0.035 });
  } else if (name === "craft") {
    playTone({ type: "square", freq: 390, duration: 0.06, volume: 0.02, slide: 1.25 });
    playTone({ type: "square", freq: 530, duration: 0.06, volume: 0.018, slide: 1.16, when: 0.045 });
  } else if (name === "inventoryOpen") {
    playTone({ type: "square", freq: 240, duration: 0.055, volume: 0.015, slide: 1.2 });
    playTone({ type: "triangle", freq: 340, duration: 0.06, volume: 0.012, slide: 1.12, when: 0.03 });
  } else if (name === "inventoryClose") {
    playTone({ type: "square", freq: 280, duration: 0.05, volume: 0.014, slide: 0.78 });
    playTone({ type: "triangle", freq: 210, duration: 0.05, volume: 0.011, slide: 0.82, when: 0.02 });
  } else if (name === "click") {
    playTone({ type: "square", freq: 520, duration: 0.03, volume: 0.01, slide: 0.9 });
  } else if (name === "daybreak") {
    playTone({ type: "triangle", freq: 320, duration: 0.1, volume: 0.02, slide: 1.12 });
    playTone({ type: "triangle", freq: 430, duration: 0.12, volume: 0.016, slide: 1.09, when: 0.06 });
  } else if (name === "nightfall") {
    playTone({ type: "triangle", freq: 220, duration: 0.11, volume: 0.02, slide: 0.82 });
    playTone({ type: "triangle", freq: 170, duration: 0.12, volume: 0.016, slide: 0.84, when: 0.05 });
  } else if (name === "footstep") {
    playNoise({ duration: 0.035, volume: 0.03, filterType: "bandpass", cutoff: 520 });
    playTone({ type: "sine", freq: 76, duration: 0.07, volume: 0.022, slide: 0.72 });
  } else if (name === "respawn") {
    playTone({ type: "triangle", freq: 230, duration: 0.08, volume: 0.02, slide: 1.18 });
    playTone({ type: "triangle", freq: 320, duration: 0.1, volume: 0.018, slide: 1.2, when: 0.05 });
  } else if (name === "eat") {
    for (let i = 0; i < 4; i++) {
      const t = i * 0.11;
      playNoise({ duration: 0.045, volume: 0.015, when: t, filterType: "bandpass", cutoff: 900 });
      playTone({ type: "triangle", freq: 140, duration: 0.04, volume: 0.01, slide: 0.92, when: t + 0.01 });
    }
    playTone({ type: "sine", freq: 220, duration: 0.08, volume: 0.012, slide: 1.08, when: 0.47 });
  }
}

function eatFood() {
  if ((inventory[String(EAT_ITEM_ID)] ?? 0) <= 0) return;
  if (playerHealth >= MAX_HEALTH) return;
  if (!removeFromInventory(EAT_ITEM_ID, 1)) return;

  playerHealth = Math.min(MAX_HEALTH, playerHealth + EAT_HEAL);
  triggerHandAction("both", 0.9, 0.24);
  playSfx("eat");
  updateStatusHud();
  refreshUI();
}

function addToInventory(type, amount = 1) {
  const id = String(type);
  if (!inventory[id] && inventory[id] !== 0) return;
  inventory[id] = Math.min(MAX_STACK, inventory[id] + amount);
}

function removeFromInventory(type, amount = 1) {
  const id = String(type);
  if (!inventory[id]) return false;
  if (inventory[id] < amount) return false;
  inventory[id] -= amount;
  return true;
}

function hasIngredients(recipe) {
  return Object.entries(recipe.in).every(([id, amount]) => (inventory[id] ?? 0) >= amount);
}

function hasOutputCapacity(recipe) {
  return Object.entries(recipe.out).every(([id, amount]) => (inventory[id] ?? 0) + amount <= MAX_STACK);
}

function canCraft(recipe) {
  return hasIngredients(recipe) && hasOutputCapacity(recipe);
}

function recipeText(itemMap) {
  return Object.entries(itemMap)
    .map(([id, amount]) => `${BLOCK_TYPES[id].name} x${amount}`)
    .join(" + ");
}

function craftRecipe(recipeId) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe || !canCraft(recipe)) return;

  Object.entries(recipe.in).forEach(([id, amount]) => removeFromInventory(Number(id), amount));
  Object.entries(recipe.out).forEach(([id, amount]) => addToInventory(Number(id), amount));

  const firstOutput = Number(Object.keys(recipe.out)[0]);
  if (BLOCK_TYPES[firstOutput]) selectedType = firstOutput;
  playSfx("craft");
  refreshUI();
}

function keyOf(x, y, z) {
  return `${x}|${y}|${z}`;
}

function getBlock(x, y, z) {
  return world.get(keyOf(x, y, z)) ?? 0;
}

function setBlock(x, y, z, type) {
  const k = keyOf(x, y, z);
  if (type <= 0) {
    world.delete(k);
    removeMesh(k);
    return;
  }
  world.set(k, type);
  upsertMesh(x, y, z, type);
}

function upsertMesh(x, y, z, type) {
  const k = keyOf(x, y, z);
  removeMesh(k);
  const isPlant = PLANT_BLOCK_IDS.has(type);
  let mesh;
  if (isPlant) {
    const group = new THREE.Group();
    const p1 = new THREE.Mesh(plantGeo, materials[type]);
    const p2 = new THREE.Mesh(plantGeo, materials[type]);
    p1.position.y = 0.5;
    p2.position.y = 0.5;
    p1.rotation.y = Math.PI / 4;
    p2.rotation.y = -Math.PI / 4;
    p1.userData.block = { x, y, z };
    p2.userData.block = { x, y, z };
    group.add(p1, p2);
    group.position.set(x + 0.5, y, z + 0.5);
    group.userData.block = { x, y, z };
    mesh = group;
  } else {
    mesh = new THREE.Mesh(boxGeo, materials[type]);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.block = { x, y, z };
  }
  meshes.set(k, mesh);
  blockGroup.add(mesh);
}

function removeMesh(k) {
  const mesh = meshes.get(k);
  if (!mesh) return;
  blockGroup.remove(mesh);
  meshes.delete(k);
}

function terrainHeight(x, z) {
  const macro = Math.sin(x * 0.09) * 1.8 + Math.cos(z * 0.1) * 1.6 + Math.sin((x + z) * 0.05) * 1.4;
  const detail = Math.sin(x * 0.28) * 0.9 + Math.cos(z * 0.25) * 0.8 + Math.sin((x - z) * 0.35) * 0.7;
  return macro + detail;
}

function biomeNoise(x, z) {
  return (
    Math.sin(x * 0.042) * 0.55 +
    Math.cos(z * 0.037) * 0.45 +
    Math.sin((x - z) * 0.02) * 0.35 +
    Math.cos((x + z) * 0.018) * 0.3
  );
}

function caveNoise(x, y, z) {
  return (
    Math.sin(x * 0.19 + y * 0.16 + z * 0.17) +
    Math.cos(x * 0.13 - y * 0.21 + z * 0.11) +
    Math.sin((x - z) * 0.09 + y * 0.29)
  );
}

function shouldCarveCave(x, y, z, surfaceY) {
  if (y < CAVE_MIN_Y) return false;
  if (y >= surfaceY - 1) return false;
  const depth = (surfaceY - y) / Math.max(1, surfaceY);
  const threshold = 1.16 - Math.min(0.25, depth * 0.22);
  if (caveNoise(x, y, z) <= threshold) return false;
  // Secondary check keeps caves more tunnel-like instead of hollowing entire chunks.
  return Math.sin(x * 0.045 + z * 0.045 + y * 0.31) > -0.45;
}

function hasCaveAirNeighbor(x, y, z) {
  const neighbors = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  return neighbors.some(([dx, dy, dz]) => getBlock(x + dx, y + dy, z + dz) === 0);
}

function reduceExposedCaveOres(x, z, surfaceY, fillType) {
  for (let y = CAVE_MIN_Y; y <= surfaceY - 2; y++) {
    const b = getBlock(x, y, z);
    if (!ORE_BLOCK_IDS.has(b)) continue;
    if (!hasCaveAirNeighbor(x, y, z)) continue;
    setBlock(x, y, z, fillType);
  }
}

function placeCaveFall(x, startY, z, liquidType, maxLength) {
  for (let i = 0; i < maxLength; i++) {
    const y = startY - i;
    if (y <= 0) break;
    const b = getBlock(x, y, z);
    if (b !== 0 && !LIQUID_BLOCK_IDS.has(b)) break;
    setBlock(x, y, z, liquidType);
    const below = getBlock(x, y - 1, z);
    if (below !== 0 && !LIQUID_BLOCK_IDS.has(below)) break;
  }
}

function surfaceKey(x, z) {
  return `${x}|${z}`;
}

function caveCellKey(x, y, z) {
  return `${x}|${y}|${z}`;
}

function placeCaveFallsByRegion(surfaceHeights) {
  const visited = new Set();
  const dirs = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  for (let x = -WORLD_SIZE / 2; x < WORLD_SIZE / 2; x++) {
    for (let z = -WORLD_SIZE / 2; z < WORLD_SIZE / 2; z++) {
      const surfaceY = surfaceHeights.get(surfaceKey(x, z));
      if (surfaceY == null) continue;

      for (let y = CAVE_MIN_Y + 1; y <= surfaceY - 2; y++) {
        if (getBlock(x, y, z) !== 0) continue;
        const startKey = caveCellKey(x, y, z);
        if (visited.has(startKey)) continue;

        const queue = [{ x, y, z }];
        visited.add(startKey);
        const waterCandidates = [];
        const lavaCandidates = [];

        while (queue.length > 0) {
          const cur = queue.pop();
          const curSurface = surfaceHeights.get(surfaceKey(cur.x, cur.z));
          if (curSurface != null && cur.y <= curSurface - 2) {
            const roof = getBlock(cur.x, cur.y + 1, cur.z);
            const below = getBlock(cur.x, cur.y - 1, cur.z);
            if (roof !== 0 && below === 0) {
              const depth = curSurface - cur.y;
              if (depth > 3) waterCandidates.push({ x: cur.x, y: cur.y, z: cur.z });
              if (cur.y < 11 || depth > 11) lavaCandidates.push({ x: cur.x, y: cur.y, z: cur.z });
            }
          }

          for (const [dx, dy, dz] of dirs) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            const nz = cur.z + dz;
            if (nx < -WORLD_SIZE / 2 || nx >= WORLD_SIZE / 2 || nz < -WORLD_SIZE / 2 || nz >= WORLD_SIZE / 2) continue;
            const ns = surfaceHeights.get(surfaceKey(nx, nz));
            if (ns == null || ny < CAVE_MIN_Y + 1 || ny > ns - 2) continue;
            if (getBlock(nx, ny, nz) !== 0) continue;
            const nk = caveCellKey(nx, ny, nz);
            if (visited.has(nk)) continue;
            visited.add(nk);
            queue.push({ x: nx, y: ny, z: nz });
          }
        }

        if (waterCandidates.length > 0 && Math.random() < 0.35) {
          const c = waterCandidates[Math.floor(Math.random() * waterCandidates.length)];
          placeCaveFall(c.x, c.y, c.z, WATER_BLOCK_ID, 11);
        }
        if (lavaCandidates.length > 0 && Math.random() < 0.28) {
          const c = lavaCandidates[Math.floor(Math.random() * lavaCandidates.length)];
          placeCaveFall(c.x, c.y, c.z, LAVA_BLOCK_ID, 7);
        }
      }
    }
  }
}

function biomeAt(x, z) {
  const n = biomeNoise(x, z);
  if (n < -0.25) {
    return {
      kind: BIOMES.DESERT,
      surface: 14,
      subsurface: 4,
      deep: 12,
      treeChance: 0,
      cactusChance: 0.06,
      heightBoost: -0.5,
    };
  }
  if (n < 0.2) {
    return {
      kind: BIOMES.PLAINS,
      surface: 1,
      subsurface: 2,
      deep: 3,
      treeChance: 0.05,
      cactusChance: 0,
      heightBoost: 0.2,
    };
  }
  if (n < 0.7) {
    return {
      kind: BIOMES.TAIGA,
      surface: 10,
      subsurface: 2,
      deep: 3,
      treeChance: 0.06,
      cactusChance: 0,
      heightBoost: 1.2,
    };
  }
  return {
    kind: BIOMES.ROCKY,
    surface: 15,
    subsurface: 13,
    deep: 13,
    treeChance: 0.01,
    cactusChance: 0,
    heightBoost: 2.1,
  };
}

function biomeHeight(x, z, biome) {
  const h = 7 + terrainHeight(x, z) + biome.heightBoost;
  return Math.max(2, Math.min(WORLD_HEIGHT - 2, Math.floor(h)));
}

function chooseOreType(y) {
  const roll = Math.random();
  if (y < 6 && roll < 0.03) return 24;
  if (y < 10 && roll < 0.06) return 23;
  if (y < 16 && roll < 0.12) return 22;
  if (y < 22 && roll < 0.2) return 21;
  return 0;
}

function generateWorld() {
  const surfaceHeights = new Map();
  for (let x = -WORLD_SIZE / 2; x < WORLD_SIZE / 2; x++) {
    for (let z = -WORLD_SIZE / 2; z < WORLD_SIZE / 2; z++) {
      const biome = biomeAt(x, z);
      const h = biomeHeight(x, z, biome);
      surfaceHeights.set(surfaceKey(x, z), h);
      for (let y = 0; y <= h; y++) {
        let type = biome.surface;
        if (y === h) {
          if (h <= SEA_LEVEL) type = 4;
          else if (biome.kind === BIOMES.PLAINS && Math.random() < 0.03) type = 5;
          else if (biome.kind === BIOMES.ROCKY && Math.random() < 0.18) type = 13;
          else if (biome.kind === BIOMES.ROCKY && Math.random() < 0.2) type = 15;
          else type = biome.surface;
        } else if (y > h - 2) {
          type = biome.subsurface;
        } else {
          type = biome.deep;
        }
        if (y < h - 2 && (type === 3 || type === 13 || type === 12)) {
          const ore = chooseOreType(y);
          if (ore) type = ore;
        }
        setBlock(x, y, z, type);
      }
      for (let y = CAVE_MIN_Y; y <= h - 2; y++) {
        if (shouldCarveCave(x, y, z, h)) setBlock(x, y, z, 0);
      }
      reduceExposedCaveOres(x, z, h, biome.deep);
      if (h > SEA_LEVEL + 1 && biome.treeChance > 0 && Math.random() < biome.treeChance) {
        const style = biome.kind === BIOMES.TAIGA ? "taiga" : "oak";
        placeTree(x, h + 1, z, style);
      }
      if (h > SEA_LEVEL && biome.cactusChance > 0 && Math.random() < biome.cactusChance) placeCactus(x, h + 1, z);
      if (
        h > SEA_LEVEL &&
        (biome.kind === BIOMES.PLAINS || biome.kind === BIOMES.TAIGA || biome.kind === BIOMES.ROCKY) &&
        Math.random() < (biome.kind === BIOMES.PLAINS ? 0.12 : biome.kind === BIOMES.TAIGA ? 0.08 : 0.04)
      ) {
        placePlant(x, h + 1, z, biome.kind);
      }
    }
  }
  placeCaveFallsByRegion(surfaceHeights);
}

function placeTree(x, y, z, style = "oak") {
  const trunkH = style === "taiga" ? 4 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < trunkH; i++) setBlock(x, y + i, z, 6);

  const range = style === "taiga" ? 1 : 2;
  const yStart = style === "taiga" ? 0 : -1;
  const yEnd = style === "taiga" ? 3 : 2;
  for (let lx = -range; lx <= range; lx++) {
    for (let ly = yStart; ly <= yEnd; ly++) {
      for (let lz = -range; lz <= range; lz++) {
        const dist = Math.abs(lx) + Math.abs(lz) + (style === "taiga" ? Math.abs(ly - 1) : Math.abs(ly));
        const maxDist = style === "taiga" ? 3 : 3;
        if (dist <= maxDist) {
          const leafType = style === "taiga" && Math.random() < 0.2 ? 10 : 7;
          setBlock(x + lx, y + trunkH - 1 + ly, z + lz, leafType);
        }
      }
    }
  }
}

function placeCactus(x, y, z) {
  const h = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < h; i++) {
    if (getBlock(x, y + i, z) === 0) setBlock(x, y + i, z, 16);
  }
}

function placePlant(x, y, z, biomeKind) {
  if (getBlock(x, y, z) !== 0) return;
  let type = 17;
  if (biomeKind === BIOMES.TAIGA) {
    type = Math.random() < 0.32 ? 20 : 17;
  } else if (biomeKind === BIOMES.PLAINS) {
    const r = Math.random();
    type = r < 0.12 ? 18 : r < 0.24 ? 19 : 17;
  } else if (biomeKind === BIOMES.ROCKY) {
    type = Math.random() < 0.45 ? 20 : 17;
  }
  setBlock(x, y, z, type);
}

function refreshUI() {
  buildHotbar();
  if (inventoryOpen) renderInventory();
}

function setSelectedType(type) {
  if (!BLOCK_TYPES[type]) return false;
  selectedType = type;
  refreshUI();
  return true;
}

function cycleHotbar(step) {
  const total = hotbar.length;
  if (total <= 0) return false;

  let index = hotbar.indexOf(selectedType);
  if (index < 0) index = step > 0 ? -1 : 0;
  const nextIndex = (index + step + total) % total;
  const nextType = hotbar[nextIndex];
  if (!BLOCK_TYPES[nextType]) return false;

  selectedType = nextType;
  refreshUI();
  return true;
}

function buildHotbar() {
  if (!hudHotbar) return;

  hudHotbar.innerHTML = "";

  hotbar.forEach((numericId) => {
    const id = String(numericId);
    const count = inventory[id] ?? 0;

    const slot = document.createElement("div");
    slot.classList.add("slot");

    if (numericId === selectedType) {
      slot.classList.add("active");
    }

    if (count <= 0) {
      slot.classList.add("empty");
    }

    const swatch = document.createElement("div");
    swatch.classList.add("swatch");
    swatch.style.backgroundImage = `url(${hotbarPreviews[numericId]})`;

    slot.appendChild(swatch);

    if (count > 0) {
      const countLabel = document.createElement("div");
      countLabel.classList.add("count");
      countLabel.textContent = count;
      slot.appendChild(countLabel);
    }

    hudHotbar.appendChild(slot);
  });
}

function renderInventory() {
  const selectedName = BLOCK_TYPES[selectedType]?.name ?? "";
  const rows = Object.entries(BLOCK_TYPES)
    .map(([id, block]) => {
      const count = inventory[id] ?? 0;
      const activeClass = Number(id) === selectedType ? "active" : "";
      const emptyClass = count <= 0 ? "empty" : "";
      return `
        <div class="inv-slot ${activeClass} ${emptyClass}" data-id="${id}" title="${id}: ${block.name}">
          <div class="inv-slot-id">${id}</div>
          <div class="swatch" style="background-image:url('${hotbarPreviews[id]}')"></div>
          <div class="inv-count">${count}</div>
        </div>
      `;
    })
    .join("");

  const recipeRows = RECIPES.map((recipe) => {
    const disabled = canCraft(recipe) ? "" : "disabled";
    return `
      <button class="craft-btn" data-recipe="${recipe.id}" ${disabled}>
        <div class="craft-name">${recipe.name}</div>
        <div class="craft-line">${recipeText(recipe.in)} -> ${recipeText(recipe.out)}</div>
      </button>
    `;
  }).join("");
  const toolRows = TOOL_ORDER.map(
    (tool) =>
      `<button class="equip-btn ${equippedTool === tool ? "active" : ""}" data-tool="${tool}">${getToolLabel(tool)}</button>`
  ).join("");
  const armorRows = ARMOR_ORDER.map(
    (armor) =>
      `<button class="equip-btn ${equippedArmor === armor ? "active" : ""}" data-armor="${armor}">${getArmorLabel(armor)}</button>`
  ).join("");

  inventoryPanel.innerHTML = `
    <h2>Inventory (E to close)</h2>
    <div class="player-preview">
      <div class="skin-swatch" style="background-image:url('${playerSkinPreviewUrl}')"></div>
      <div class="skin-label">Your Skin</div>
    </div>
    <div class="inv-meta">Selected: ${selectedType} - ${selectedName}</div>
    <div class="inventory-grid">${rows}</div>
    <h3 class="craft-title">Crafting</h3>
    <div class="craft-grid">${recipeRows}</div>
    <h3 class="craft-title">Gear</h3>
    <div class="equip-group">
      <div class="equip-label">Tool</div>
      <div class="equip-grid">${toolRows}</div>
      <div class="equip-label">Armor</div>
      <div class="equip-grid">${armorRows}</div>
    </div>
  `;
  inventoryPanel.querySelectorAll(".inv-slot").forEach((el) => {
    el.addEventListener("click", () => {
      playSfx("click");
      setSelectedType(Number(el.dataset.id));
    });
  });
  inventoryPanel.querySelectorAll(".craft-btn").forEach((el) => {
    el.addEventListener("click", () => {
      playSfx("click");
      craftRecipe(el.dataset.recipe);
    });
  });
  inventoryPanel.querySelectorAll("[data-tool]").forEach((el) => {
    el.addEventListener("click", () => {
      playSfx("click");
      equippedTool = el.dataset.tool;
      updateStatusHud();
      refreshUI();
    });
  });
  inventoryPanel.querySelectorAll("[data-armor]").forEach((el) => {
    el.addEventListener("click", () => {
      playSfx("click");
      equippedArmor = el.dataset.armor;
      updateStatusHud();
      refreshUI();
    });
  });
}

function setInventoryOpen(open) {
  inventoryOpen = open;
  if (open) keys.clear();
  playSfx(open ? "inventoryOpen" : "inventoryClose");
  inventoryPanel.classList.toggle("hidden", !open);
  refreshUI();
}

function updateOverlayState() {
  return;
}

function getToolLabel(tool) {
  const labels = { hand: "Hand", wood: "Wood", stone: "Stone", iron: "Iron", diamond: "Diamond" };
  return labels[tool] ?? "Hand";
}

function getArmorLabel(armor) {
  const labels = { none: "None", leather: "Leather", iron: "Iron", diamond: "Diamond" };
  return labels[armor] ?? "None";
}

function getAttackDamage() {
  const mult = TOOL_DAMAGE_MULT[equippedTool] ?? 1;
  return Math.round(PLAYER_ATTACK_DAMAGE * mult);
}

function applyIncomingDamage(rawDamage) {
  const reduction = ARMOR_REDUCTION[equippedArmor] ?? 0;
  return Math.max(1, Math.round(rawDamage * (1 - reduction)));
}

function updateStatusHud() {
  const heartSlots = 10;
  const fullHearts = Math.max(0, Math.min(heartSlots, Math.ceil((playerHealth / MAX_HEALTH) * heartSlots)));
  const hearts = "&#10084;".repeat(fullHearts);
  const emptyHearts = "&#9825;".repeat(heartSlots - fullHearts);
  const showGear = equippedTool !== "hand" || equippedArmor !== "none";
  const gearText = showGear ? `<span class="equip-hud">Tool: ${getToolLabel(equippedTool)} | Armor: ${getArmorLabel(equippedArmor)}</span>` : "";
  statusHud.innerHTML = `<div class="hearts">${hearts}<span class="empty-hearts">${emptyHearts}</span></div>${gearText}`;
}

function findEntityById(id) {
  return entities.find((e) => e.id === id) ?? null;
}

function tagEntityMesh(mesh, id) {
  mesh.userData.entityId = id;
  mesh.traverse((child) => {
    child.userData.entityId = id;
  });
}

function removeEntity(entity) {
  entityGroup.remove(entity.mesh);
  const idx = entities.indexOf(entity);
  if (idx >= 0) entities.splice(idx, 1);
}

function killEntity(entity, giveDrops = true) {
  if (giveDrops) {
    if (PASSIVE_KINDS.includes(entity.kind)) addToInventory(8, 1 + Math.floor(Math.random() * 2));
    else addToInventory(5, 1 + Math.floor(Math.random() * 2));
  }
  playSfx("break");
  removeEntity(entity);
  refreshUI();
}

function hitEntity(entity, damage) {
  entity.hp -= damage;
  playSfx("hurt");
  if (entity.hp <= 0) {
    killEntity(entity);
    return;
  }

  const away = new THREE.Vector2(entity.mesh.position.x - yaw.position.x, entity.mesh.position.z - yaw.position.z);
  if (away.lengthSq() > 0.01) {
    away.normalize().multiplyScalar(0.35);
    const nx = entity.mesh.position.x + away.x;
    const nz = entity.mesh.position.z + away.y;
    if (canEntityMoveTo(entity, nx, nz)) {
      entity.mesh.position.x = nx;
      entity.mesh.position.z = nz;
    }
  }
}

function shootSkeletonArrow(entity, targetPos) {
  const origin = entity.mesh.position.clone().add(new THREE.Vector3(0, 1.22, 0));
  const target = targetPos.clone().add(new THREE.Vector3(0, 1.1, 0));
  const dir = target.sub(origin).normalize();

  const arrow = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.34), arrowShaftMaterials);
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.08), arrowTipMaterials);
  tip.position.z = 0.2;
  tip.castShadow = true;
  tip.receiveShadow = true;
  arrow.add(shaft, tip);

  arrow.position.copy(origin);
  arrow.lookAt(origin.clone().add(dir));
  scene.add(arrow);
  skeletonArrows.push({
    mesh: arrow,
    vel: dir.multiplyScalar(SKELETON_ARROW_SPEED),
    life: SKELETON_ARROW_LIFE,
  });
}

function updateSkeletonArrows(dt) {
  let tookDamage = false;
  for (let i = skeletonArrows.length - 1; i >= 0; i--) {
    const arrow = skeletonArrows[i];
    arrow.life -= dt;
    if (arrow.life <= 0) {
      scene.remove(arrow.mesh);
      skeletonArrows.splice(i, 1);
      continue;
    }

    const step = arrow.vel.clone().multiplyScalar(dt);
    arrow.mesh.position.add(step);
    arrow.mesh.lookAt(arrow.mesh.position.clone().add(arrow.vel));

    const bx = Math.floor(arrow.mesh.position.x);
    const by = Math.floor(arrow.mesh.position.y);
    const bz = Math.floor(arrow.mesh.position.z);
    if (isSolidAt(bx, by, bz)) {
      scene.remove(arrow.mesh);
      skeletonArrows.splice(i, 1);
      continue;
    }

    const toPlayer = arrow.mesh.position.clone().sub(yaw.position);
    const horiz = Math.hypot(toPlayer.x, toPlayer.z);
    const inY = toPlayer.y > 0.2 && toPlayer.y < PLAYER_HEIGHT + 0.2;
    if (horiz < PLAYER_RADIUS + 0.12 && inY) {
      playerHealth -= applyIncomingDamage(SKELETON_ARROW_DAMAGE);
      playSfx("hurt");
      tookDamage = true;
      scene.remove(arrow.mesh);
      skeletonArrows.splice(i, 1);
    }
  }
  if (tookDamage) updateStatusHud();
}

function triggerCreeperExplosion(entity) {
  const ex = entity.mesh.position.x;
  const ey = entity.mesh.position.y;
  const ez = entity.mesh.position.z;
  const blastRadius = 4.2;

  for (let x = Math.floor(ex - blastRadius); x <= Math.floor(ex + blastRadius); x++) {
    for (let y = Math.floor(ey - blastRadius); y <= Math.floor(ey + blastRadius); y++) {
      for (let z = Math.floor(ez - blastRadius); z <= Math.floor(ez + blastRadius); z++) {
        const dx = x + 0.5 - ex;
        const dy = y + 0.5 - (ey + 0.6);
        const dz = z + 0.5 - ez;
        if (Math.hypot(dx, dy, dz) > blastRadius) continue;
        const b = getBlock(x, y, z);
        if (b === 0) continue;
        setBlock(x, y, z, 0);
      }
    }
  }

  const playerDist = Math.hypot(yaw.position.x - ex, yaw.position.z - ez);
  if (playerDist < blastRadius + 0.5) {
    const scale = 1 - Math.min(1, playerDist / (blastRadius + 0.5));
    const dmg = Math.max(1, Math.round(26 * scale));
    playerHealth -= applyIncomingDamage(dmg);
    playSfx("hurt");
  }
  killEntity(entity, false);
}

function getEntitySelection() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(entityGroup.children, true);
  for (const hit of hits) {
    if (hit.distance > ENTITY_HIT_RANGE) continue;
    const id = hit.object.userData.entityId;
    if (id == null) continue;
    const entity = findEntityById(id);
    if (entity) return { entity, hit };
  }
  return null;
}

function isNightTime() {
  return false;
}

function updateDayNight(dt) {
  dayTime = 0.25;
  const angle = dayTime * Math.PI * 2;
  const sunHeight = Math.sin(angle);
  const daylight = 1;

  sun.position.set(Math.cos(angle) * 60, sunHeight * 70 + 8, Math.sin(angle) * 24);
  moonLight.position.set(-Math.cos(angle) * 60, -sunHeight * 70 + 8, -Math.sin(angle) * 24);
  sunVisual.position.copy(sun.position);
  moonVisual.position.copy(moonLight.position);
  sun.intensity = 1.22;
  moonLight.intensity = 0;
  ambient.intensity = 0.71;
  moonVisual.material.opacity = 0;
  moonVisual.material.transparent = true;
  sunVisual.material.opacity = 1;
  sunVisual.material.transparent = true;

  currentSkyColor.copy(NIGHT_SKY_COLOR).lerp(DAY_SKY_COLOR, daylight);
  scene.background.copy(currentSkyColor);
  scene.fog.color.copy(currentSkyColor);
  scene.fog.near = 20 + daylight * 20;
  scene.fog.far = 85 + daylight * 65;
}

function triggerHandAction(side = "right", strength = 1, duration = 0.15) {
  handActionSide = side;
  handActionStrength = Math.max(0.1, strength);
  handActionDuration = Math.max(0.06, duration);
  handActionTime = handActionDuration;
}

function updatePlayerHands(dt) {
  const isActive = document.pointerLockElement === renderer.domElement && !inventoryOpen;
  handRig.group.visible = isActive;
  if (!isActive) return;

  const speed = Math.hypot(velocity.x, velocity.z);
  const moving = canJump && speed > 0.25;
  if (moving) handSwingTime += dt * Math.min(18, 6 + speed * 2.5);
  handActionTime = Math.max(0, handActionTime - dt);
  const idle = performance.now() * 0.0025;

  const swing = moving ? Math.sin(handSwingTime) * 0.06 : Math.sin(idle) * 0.01;
  const rise = moving ? Math.abs(Math.sin(handSwingTime)) * 0.028 : Math.abs(Math.sin(idle)) * 0.007;
  const roll = moving ? Math.sin(handSwingTime * 0.5) * 0.015 : Math.sin(idle * 1.4) * 0.008;
  const actionPhase = handActionDuration > 0 ? 1 - handActionTime / handActionDuration : 1;
  const actionCurve = handActionTime > 0 ? Math.sin(actionPhase * Math.PI) * handActionStrength : 0;
  const rightPunch = handActionSide !== "left" ? actionCurve : 0;
  const leftPunch = handActionSide !== "right" ? actionCurve : 0;
  handRig.group.position.y = moving ? -Math.abs(Math.sin(handSwingTime * 0.5)) * 0.01 : -Math.abs(Math.sin(idle)) * 0.004;

  handRig.leftArm.position.y = -0.34 + rise;
  handRig.rightArm.position.y = -0.34 + rise;
  handRig.leftArm.rotation.x = -0.35 + swing - leftPunch * 0.45;
  handRig.rightArm.rotation.x = -0.35 - swing - rightPunch * 0.45;
  handRig.leftArm.rotation.z = 0.1 + roll + leftPunch * 0.04;
  handRig.rightArm.rotation.z = -0.1 - roll - rightPunch * 0.04;

  handRig.leftCuff.position.y = -0.22 + rise;
  handRig.rightCuff.position.y = -0.22 + rise;
  handRig.leftCuff.rotation.x = handRig.leftArm.rotation.x;
  handRig.rightCuff.rotation.x = handRig.rightArm.rotation.x;
  handRig.leftCuff.rotation.z = handRig.leftArm.rotation.z;
  handRig.rightCuff.rotation.z = handRig.rightArm.rotation.z;
}

function findSurfaceY(x, z) {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  for (let y = WORLD_HEIGHT + 20; y >= 0; y--) {
    if (isSolidAt(bx, y, bz)) return y + 1;
  }
  return 1;
}

function findSpawnPoint() {
  const candidate = new THREE.Vector3();
  for (let radius = 0; radius <= WORLD_SIZE / 2; radius += 2) {
    const checks = Math.max(8, radius * 6);
    for (let i = 0; i < checks; i++) {
      const a = (i / checks) * Math.PI * 2;
      const x = Math.round(Math.cos(a) * radius);
      const z = Math.round(Math.sin(a) * radius);
      const y = findSurfaceY(x, z) + 0.05;
      if (y <= SEA_LEVEL + 0.5) continue;
      candidate.set(x + 0.5, y, z + 0.5);
      if (!collidesAt(candidate)) return candidate;
    }
  }
  return new THREE.Vector3(0.5, findSurfaceY(0, 0) + 0.05, 0.5);
}

function makeQuadrupedMesh(bodyMat, headMat, legMat, bodySize, bodyY, headSize, headPos, legSize, legPos) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodySize[0], bodySize[1], bodySize[2]), bodyMat);
  body.position.y = bodyY;
  body.castShadow = true;
  body.receiveShadow = true;

  const head = new THREE.Mesh(new THREE.BoxGeometry(headSize[0], headSize[1], headSize[2]), headMat);
  head.position.set(headPos[0], headPos[1], headPos[2]);
  head.castShadow = true;
  head.receiveShadow = true;

  const legs = [];
  legPos.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(legSize[0], legSize[1], legSize[2]), legMat);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    legs.push(leg);
    root.add(leg);
  });

  root.add(body, head);
  root.userData.body = body;
  root.userData.head = head;
  root.userData.legs = legs;
  root.userData.legSwingSigns = [1, -1, -1, 1];
  return root;
}

function makeCowMesh() {
  return makeQuadrupedMesh(
    cowBodyMaterials,
    cowHeadMaterials,
    cowLegMaterials,
    [1.14, 0.68, 0.68],
    0.95,
    [0.52, 0.48, 0.54],
    [0, 1.12, 0.5],
    [0.18, 0.66, 0.18],
    [
      [-0.34, 0.33, -0.22],
      [0.34, 0.33, -0.22],
      [-0.34, 0.33, 0.22],
      [0.34, 0.33, 0.22],
    ]
  );
}

function makeSheepMesh() {
  return makeQuadrupedMesh(
    sheepBodyMaterials,
    sheepHeadMaterials,
    sheepLegMaterials,
    [1.02, 0.7, 0.68],
    0.9,
    [0.48, 0.44, 0.48],
    [0, 1.07, 0.5],
    [0.16, 0.58, 0.16],
    [
      [-0.29, 0.31, -0.21],
      [0.29, 0.31, -0.21],
      [-0.29, 0.31, 0.21],
      [0.29, 0.31, 0.21],
    ]
  );
}

function makeChickenMesh() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.52), chickenBodyMaterials);
  body.position.y = 0.8;
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), chickenHeadMaterials);
  head.position.set(0, 1.08, 0.31);
  head.castShadow = true;
  head.receiveShadow = true;
  root.add(head);

  const legLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.08), chickenLegMaterials);
  legLeft.position.set(-0.16, 0.31, 0.03);
  legLeft.castShadow = true;
  legLeft.receiveShadow = true;
  root.add(legLeft);

  const legRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.08), chickenLegMaterials);
  legRight.position.set(0.16, 0.31, 0.03);
  legRight.castShadow = true;
  legRight.receiveShadow = true;
  root.add(legRight);

  root.userData.body = body;
  root.userData.head = head;
  root.userData.legs = [legLeft, legRight];
  root.userData.legSwingSigns = [1, -1];
  return root;
}

function makeZombieMesh() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.74, 0.34), zombieBodyMaterials);
  body.position.y = 0.94;
  body.castShadow = true;
  body.receiveShadow = true;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), zombieHeadMaterials);
  head.position.set(0, 1.56, 0);
  head.castShadow = true;
  head.receiveShadow = true;

  const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.74, 0.2), zombieArmMaterials);
  armLeft.position.set(-0.42, 0.94, 0);
  armLeft.castShadow = true;
  armLeft.receiveShadow = true;

  const armRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.74, 0.2), zombieArmMaterials);
  armRight.position.set(0.42, 0.94, 0);
  armRight.castShadow = true;
  armRight.receiveShadow = true;

  const legLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.22), zombieLegMaterials);
  legLeft.position.set(-0.14, 0.36, 0);
  legLeft.castShadow = true;
  legLeft.receiveShadow = true;

  const legRight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.22), zombieLegMaterials);
  legRight.position.set(0.14, 0.36, 0);
  legRight.castShadow = true;
  legRight.receiveShadow = true;

  root.add(body, head, armLeft, armRight, legLeft, legRight);
  root.userData.body = body;
  root.userData.head = head;
  root.userData.arms = [armLeft, armRight];
  root.userData.legs = [legLeft, legRight];
  root.userData.legSwingSigns = [1, -1];
  return root;
}

function makeSkeletonMesh() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.74, 0.24), skeletonBodyMaterials);
  body.position.y = 0.94;
  body.castShadow = true;
  body.receiveShadow = true;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skeletonHeadMaterials);
  head.position.set(0, 1.54, 0);
  head.castShadow = true;
  head.receiveShadow = true;

  const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.74, 0.12), skeletonArmMaterials);
  armLeft.position.set(-0.31, 0.94, 0);
  armLeft.castShadow = true;
  armLeft.receiveShadow = true;

  const armRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.74, 0.12), skeletonArmMaterials);
  armRight.position.set(0.31, 0.94, 0);
  armRight.castShadow = true;
  armRight.receiveShadow = true;

  const bow = new THREE.Group();
  const bowCore = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.04), bowWoodMaterials);
  bowCore.castShadow = true;
  bowCore.receiveShadow = true;
  const bowTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), bowWoodMaterials);
  bowTop.position.y = 0.25;
  const bowBottom = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), bowWoodMaterials);
  bowBottom.position.y = -0.25;
  const bowString = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.58, 0.01), bowStringMaterials);
  bowString.position.x = 0.05;
  bow.add(bowCore, bowTop, bowBottom, bowString);
  bow.position.set(0.1, 0, 0.08);
  bow.rotation.z = 0.25;
  armRight.add(bow);

  const legLeft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 0.14), skeletonLegMaterials);
  legLeft.position.set(-0.1, 0.36, 0);
  legLeft.castShadow = true;
  legLeft.receiveShadow = true;

  const legRight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 0.14), skeletonLegMaterials);
  legRight.position.set(0.1, 0.36, 0);
  legRight.castShadow = true;
  legRight.receiveShadow = true;

  root.add(body, head, armLeft, armRight, legLeft, legRight);
  root.userData.body = body;
  root.userData.head = head;
  root.userData.arms = [armLeft, armRight];
  root.userData.legs = [legLeft, legRight];
  root.userData.legSwingSigns = [1, -1];
  return root;
}

function makeCreeperMesh() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.86, 0.34), creeperBodyMaterials);
  body.position.y = 0.98;
  body.castShadow = true;
  body.receiveShadow = true;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), creeperHeadMaterials);
  head.position.set(0, 1.67, 0);
  head.castShadow = true;
  head.receiveShadow = true;

  const legs = [];
  const legPositions = [
    [-0.17, 0.36, -0.11],
    [0.17, 0.36, -0.11],
    [-0.17, 0.36, 0.11],
    [0.17, 0.36, 0.11],
  ];
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), creeperLegMaterials);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    legs.push(leg);
    root.add(leg);
  });

  root.add(body, head);
  root.userData.body = body;
  root.userData.head = head;
  root.userData.legs = legs;
  root.userData.legSwingSigns = [1, -1, -1, 1];
  return root;
}

function makeEntityMesh(kind) {
  if (kind === "cow") return makeCowMesh();
  if (kind === "sheep") return makeSheepMesh();
  if (kind === "chicken") return makeChickenMesh();
  if (kind === "zombie") return makeZombieMesh();
  if (kind === "skeleton") return makeSkeletonMesh();
  return makeCreeperMesh();
}

function canEntityMoveTo(entity, x, z) {
  if (x < -WORLD_SIZE / 2 + 1 || x > WORLD_SIZE / 2 - 1 || z < -WORLD_SIZE / 2 + 1 || z > WORLD_SIZE / 2 - 1) return false;
  const y = findSurfaceY(x, z);
  const by = Math.floor(y);
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  if (isSolidAt(bx, by, bz)) return false;
  if (isSolidAt(bx, by + 1, bz)) return false;
  if (Math.abs(y - entity.mesh.position.y) > 1.2) return false;
  return true;
}

function spawnEntity(kind) {
  for (let tries = 0; tries < 100; tries++) {
    const x = (Math.random() - 0.5) * (WORLD_SIZE - 8);
    const z = (Math.random() - 0.5) * (WORLD_SIZE - 8);
    if (Math.hypot(x - yaw.position.x, z - yaw.position.z) < 8) continue;
    const y = findSurfaceY(x, z);
    if (y < SEA_LEVEL) continue;

    const mesh = makeEntityMesh(kind);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    entityGroup.add(mesh);
    const stats = ENTITY_STATS[kind] ?? ENTITY_STATS.cow;
    const entity = {
      id: nextEntityId++,
      kind,
      mesh,
      dir: Math.random() * Math.PI * 2,
      changeTimer: 0.4 + Math.random() * 2.4,
      speed: stats.speed,
      baseSpeed: stats.speed,
      attackCooldown: 0,
      animPhase: Math.random() * Math.PI * 2,
      hp: stats.hp,
      bodyBaseY: mesh.userData.body?.position.y ?? null,
      headBaseY: mesh.userData.head?.position.y ?? null,
      armBaseY: (mesh.userData.arms ?? []).map((arm) => arm.position.y),
    };
    tagEntityMesh(mesh, entity.id);
    entities.push(entity);
    return;
  }
}

function spawnEntities() {
  for (let i = 0; i < ANIMAL_COUNT; i++) spawnEntity(PASSIVE_KINDS[Math.floor(Math.random() * PASSIVE_KINDS.length)]);
  for (let i = 0; i < MOB_TARGET; i++) spawnEntity(HOSTILE_KINDS[Math.floor(Math.random() * HOSTILE_KINDS.length)]);
  updateStatusHud();
}

function despawnMobs() {
  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];
    if (!HOSTILE_KINDS.includes(entity.kind)) continue;
    entityGroup.remove(entity.mesh);
    entities.splice(i, 1);
  }
}

function manageMobPopulation(dt) {
  mobSpawnTimer -= dt;
  const mobCount = entities.filter((e) => HOSTILE_KINDS.includes(e.kind)).length;
  if (mobCount >= MOB_TARGET || mobSpawnTimer > 0) return;

  spawnEntity(HOSTILE_KINDS[Math.floor(Math.random() * HOSTILE_KINDS.length)]);
  mobSpawnTimer = 0.9;
}

function animateEntityPose(entity, moved, playerDist, dt) {
  const meshData = entity.mesh.userData;
  const pace = moved ? Math.min(10, 4 + entity.speed * 2.2) : 1.6;
  entity.animPhase += dt * pace;
  const phase = entity.animPhase;
  const idleWave = Math.sin(phase * 0.4 + entity.id * 0.17) * 0.02;
  const walkBob = moved ? Math.abs(Math.sin(phase)) * 0.055 : Math.abs(idleWave) * 0.45;
  const gait = Math.sin(phase) * (moved ? 0.45 : 0.08);

  if (meshData.legs) {
    const signs = meshData.legSwingSigns ?? [];
    meshData.legs.forEach((leg, idx) => {
      leg.rotation.x = gait * (signs[idx] ?? 1);
    });
  }

  if (meshData.body && entity.bodyBaseY != null) {
    meshData.body.position.y = entity.bodyBaseY + walkBob * 0.55;
    meshData.body.rotation.x = moved ? Math.sin(phase * 0.5) * 0.03 : idleWave * 0.5;
  }

  if (meshData.head && entity.headBaseY != null) {
    meshData.head.position.y = entity.headBaseY + walkBob * 0.7;
    const lookTilt = moved ? Math.sin(phase * 0.5 + 1) * 0.05 : idleWave * 0.7;
    meshData.head.rotation.x = lookTilt;
  }

  if (meshData.arms && meshData.arms.length >= 2) {
    const armSwing = moved ? Math.sin(phase) * 0.65 : Math.sin(phase * 0.6) * 0.12;
    const [leftArm, rightArm] = meshData.arms;
    leftArm.position.y = (entity.armBaseY[0] ?? leftArm.position.y) + walkBob * 0.35;
    rightArm.position.y = (entity.armBaseY[1] ?? rightArm.position.y) + walkBob * 0.35;

    if (entity.kind === "zombie") {
      leftArm.rotation.x = -0.72 - armSwing * 0.45;
      rightArm.rotation.x = -0.72 + armSwing * 0.45;
    } else if (entity.kind === "skeleton" && playerDist < 18) {
      leftArm.rotation.x = -0.95 - armSwing * 0.25;
      rightArm.rotation.x = -1.2 + Math.sin(phase * 1.4) * 0.12;
    } else {
      leftArm.rotation.x = armSwing;
      rightArm.rotation.x = -armSwing;
    }
  }
}

function updateEntities(dt) {
  const playerPos = yaw.position;

  entities.forEach((entity) => {
    entity.changeTimer -= dt;
    entity.attackCooldown -= dt;

    const ex = entity.mesh.position.x;
    const ez = entity.mesh.position.z;
    const toPlayer = new THREE.Vector2(playerPos.x - ex, playerPos.z - ez);
    const playerDist = toPlayer.length();

    if (HOSTILE_KINDS.includes(entity.kind) && playerDist < 22) {
      entity.dir = Math.atan2(toPlayer.x, toPlayer.y);
      if (entity.kind === "skeleton") {
        entity.speed = playerDist < 4 ? 1.7 : 2.4;
        if (playerDist < 18 && entity.attackCooldown <= 0) {
          shootSkeletonArrow(entity, playerPos);
          entity.attackCooldown = 1.25;
        }
        if (playerDist < 1.5 && entity.attackCooldown <= 0.25) {
          playerHealth -= applyIncomingDamage(5);
          playSfx("hurt");
          entity.attackCooldown = 1;
        }
      } else {
        entity.speed = entity.kind === "creeper" ? 2.45 : 2.8;
        if (playerDist < 1.4 && entity.attackCooldown <= 0) {
          if (entity.kind === "creeper") {
            triggerCreeperExplosion(entity);
            return;
          }
          playerHealth -= applyIncomingDamage(8);
          playSfx("hurt");
          entity.attackCooldown = 0.85;
        }
      }
    } else {
      if (entity.changeTimer <= 0) {
        entity.dir += (Math.random() - 0.5) * 2.2;
        entity.changeTimer = 0.8 + Math.random() * 2.8;
      }
      entity.speed = entity.baseSpeed;
    }

    const step = entity.speed * dt;
    const nx = ex + Math.sin(entity.dir) * step;
    const nz = ez + Math.cos(entity.dir) * step;
    let moved = false;
    if (canEntityMoveTo(entity, nx, nz)) {
      entity.mesh.position.x = nx;
      entity.mesh.position.z = nz;
      moved = true;
    } else {
      entity.dir += Math.PI * (0.4 + Math.random() * 0.4);
      entity.changeTimer = 0.4;
    }

    entity.mesh.position.y = findSurfaceY(entity.mesh.position.x, entity.mesh.position.z);
    entity.mesh.rotation.y = entity.dir;
    animateEntityPose(entity, moved, playerDist, dt);
  });

  if (playerHealth <= 0) {
    playerHealth = MAX_HEALTH;
    yaw.position.copy(spawnPoint);
    velocity.set(0, 0, 0);
    playSfx("respawn");
  }
  updateStatusHud();
}

function getSelection() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([...meshes.values()], true);
  if (hits.length === 0) return null;
  return hits[0];
}

function isSolidAt(x, y, z) {
  const b = getBlock(x, y, z);
  return b !== 0 && !PLANT_BLOCK_IDS.has(b) && !LIQUID_BLOCK_IDS.has(b);
}

function collidesAt(pos) {
  const minX = Math.floor(pos.x - PLAYER_RADIUS);
  const maxX = Math.floor(pos.x + PLAYER_RADIUS);
  const minY = Math.floor(pos.y);
  const maxY = Math.floor(pos.y + PLAYER_HEIGHT);
  const minZ = Math.floor(pos.z - PLAYER_RADIUS);
  const maxZ = Math.floor(pos.z + PLAYER_RADIUS);

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (!isSolidAt(x, y, z)) continue;
        if (
          pos.x + PLAYER_RADIUS > x &&
          pos.x - PLAYER_RADIUS < x + 1 &&
          pos.y + PLAYER_HEIGHT > y &&
          pos.y < y + 1 &&
          pos.z + PLAYER_RADIUS > z &&
          pos.z - PLAYER_RADIUS < z + 1
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function canPlaceBlockAt(x, y, z) {
  if (x < -WORLD_SIZE || x > WORLD_SIZE || z < -WORLD_SIZE || z > WORLD_SIZE || y < 0 || y > WORLD_HEIGHT + 20) return false;
  if (getBlock(x, y, z) !== 0) return false;

  const pos = yaw.position;
  const overlapsPlayer =
    pos.x + PLAYER_RADIUS > x &&
    pos.x - PLAYER_RADIUS < x + 1 &&
    pos.y + PLAYER_HEIGHT > y &&
    pos.y < y + 1 &&
    pos.z + PLAYER_RADIUS > z &&
    pos.z - PLAYER_RADIUS < z + 1;
  return !overlapsPlayer;
}

function handleBlockAction(button) {
  if (document.pointerLockElement !== renderer.domElement) return;
  if (button === 0) {
    const entityHit = getEntitySelection();
    if (entityHit) {
      triggerHandAction("right", 1.15, 0.13);
      hitEntity(entityHit.entity, getAttackDamage());
      updateStatusHud();
      return;
    }
  }

  const hit = getSelection();
  if (!hit) return;

  const { x, y, z } = hit.object.userData.block;
  if (button === 0) {
    const brokenType = getBlock(x, y, z);
    setBlock(x, y, z, 0);
    addToInventory(brokenType, 1);
    triggerHandAction("right", 1.1, 0.13);
    playSfx("break");
    refreshUI();
    return;
  }

  if (button === 2) {
    const placePos = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.5)).floor();
    if ((inventory[String(selectedType)] ?? 0) > 0 && canPlaceBlockAt(placePos.x, placePos.y, placePos.z)) {
      setBlock(placePos.x, placePos.y, placePos.z, selectedType);
      removeFromInventory(selectedType, 1);
      triggerHandAction("right", 0.85, 0.11);
      playSfx("place");
      refreshUI();
    }
  }
}

function movePlayer(dt) {
  if (document.pointerLockElement !== renderer.domElement || inventoryOpen) return;

  const speed = keys.has("ShiftLeft") ? 10 : 6;
  const accel = speed * 14;
  const friction = 10;
  const gravity = 20;

  const forward = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
  const strafe = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  const wasX = yaw.position.x;
  const wasZ = yaw.position.z;

  const dir = new THREE.Vector3();
  if (forward || strafe) {
    dir.z = forward;
    dir.x = strafe;
    dir.normalize();
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.rotation.y);
    velocity.x += dir.x * accel * dt;
    velocity.z += dir.z * accel * dt;
  }

  velocity.x -= velocity.x * Math.min(1, friction * dt);
  velocity.z -= velocity.z * Math.min(1, friction * dt);
  velocity.y -= gravity * dt;
  footstepTimer -= dt;

  // Resolve rare cases where player ends up inside a solid block.
  if (collidesAt(yaw.position)) {
    let unstuck = false;
    for (let i = 1; i <= 8; i++) {
      const probe = yaw.position.clone();
      probe.y += i * 0.15;
      if (!collidesAt(probe)) {
        yaw.position.copy(probe);
        unstuck = true;
        break;
      }
    }
    if (!unstuck) {
      yaw.position.copy(spawnPoint);
      velocity.set(0, 0, 0);
    }
  }

  const totalMove = new THREE.Vector3(velocity.x * dt, velocity.y * dt, velocity.z * dt);
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(totalMove.x), Math.abs(totalMove.y), Math.abs(totalMove.z)) / 0.16));
  const stepMove = totalMove.multiplyScalar(1 / steps);
  canJump = false;

  for (let i = 0; i < steps; i++) {
    const next = yaw.position.clone();
    next.x += stepMove.x;
    if (!collidesAt(next)) yaw.position.x = next.x;
    else velocity.x = 0;

    next.copy(yaw.position);
    next.z += stepMove.z;
    if (!collidesAt(next)) yaw.position.z = next.z;
    else velocity.z = 0;

    next.copy(yaw.position);
    next.y += stepMove.y;
    if (!collidesAt(next)) {
      yaw.position.y = next.y;
    } else {
      if (velocity.y < 0) canJump = true;
      velocity.y = 0;
      break;
    }
  }

  if (yaw.position.y < -20) {
    yaw.position.copy(spawnPoint);
    velocity.set(0, 0, 0);
  }

  const movedHoriz = Math.hypot(yaw.position.x - wasX, yaw.position.z - wasZ);
  const isTryingToWalk = forward !== 0 || strafe !== 0;
  if (canJump && isTryingToWalk && movedHoriz > 0.002 && footstepTimer <= 0 && document.pointerLockElement === renderer.domElement) {
    playSfx("footstep");
    footstepTimer = keys.has("ShiftLeft") ? 0.16 : 0.22;
  }
}

document.addEventListener("keydown", (e) => {
  ensureAudio();
  if (e.code === "KeyE") {
    e.preventDefault();
    if (inventoryOpen) {
      setInventoryOpen(false);
    } else {
      setInventoryOpen(true);
      document.exitPointerLock();
    }
    return;
  }

  if (inventoryOpen) return;
  if (document.pointerLockElement !== renderer.domElement) return;
  if (e.code === "KeyF") {
    e.preventDefault();
    eatFood();
    return;
  }
  keys.add(e.code);
  if (e.code === "Space" && canJump) {
    velocity.y = 8;
    playSfx("jump");
  }

  if (e.code.startsWith("Digit")) {
    const num = Number(e.code.slice(-1));
    const hotbarIndex = num === 0 ? 9 : num - 1;
    const slotType = hotbar[hotbarIndex];
    if (slotType && BLOCK_TYPES[slotType]) setSelectedType(slotType);
  }
});

window.addEventListener(
  "wheel",
  (e) => {
    if (inventoryOpen) return;
    ensureAudio();
    const changed = cycleHotbar(e.deltaY > 0 ? 1 : -1);
    if (!changed) return;
    playSfx("click");
    e.preventDefault();
  },
  { passive: false }
);

document.addEventListener("keyup", (e) => keys.delete(e.code));
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("mousedown", (e) => {
  ensureAudio();
  handleBlockAction(e.button);
});

function requestStart() {
  if (inventoryOpen) return;
  ensureAudio();
  renderer.domElement.requestPointerLock();
}

renderer.domElement.addEventListener("click", requestStart);
document.addEventListener("pointerlockchange", updateOverlayState);
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement !== renderer.domElement) {
    keys.clear();
    velocity.set(0, 0, 0);
  }
});

document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw.rotation.y -= e.movementX * 0.0022;
  pitch.rotation.x -= e.movementY * 0.0022;
  pitch.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.rotation.x));
});

generateWorld();
spawnPoint.copy(findSpawnPoint());
yaw.position.copy(spawnPoint);
spawnEntities();
wasNight = isNightTime();
refreshUI();
updateStatusHud();

const clock = new THREE.Clock();
function tick() {
  syncRendererSize();
  const dt = Math.min(clock.getDelta(), 0.033);
  updateDayNight(dt);
  manageMobPopulation(dt);
  movePlayer(dt);
  updatePlayerHands(dt);
  updateEntities(dt);
  updateSkeletonArrows(dt);

  const hit = getSelection();
  if (hit) {
    const b = hit.object.userData.block;
    hitOutline.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5);
    hitOutline.visible = true;
  } else {
    hitOutline.visible = false;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
