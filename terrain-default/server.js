// Default Terrain Generator — builtin mod
// Replaces the C# BlockNoiseTerrainGenerator with a JavaScript implementation.
// Uses FBM (Fractional Brownian Motion) noise built from dot-product permutation Perlin.

// ── Noise implementation ──────────────────────────────────────────────────────

var PERM = [];
(function buildPerm() {
    var p = [];
    for (var i = 0; i < 256; i++) p[i] = i;
    // Shuffle using seed 31337 (fixed; world seed injected per-chunk via chunkSeed)
    for (var i = 255; i > 0; i--) {
        var j = Math.floor((i * 1664525 + 1013904223) & 0x7FFFFFFF) % (i + 1);
        var t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (var i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function grad(hash, x, y) {
    var h = hash & 3;
    var u = h < 2 ? x : y;
    var v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

function perlin(x, y, seed) {
    // Offset by seed
    x += (seed & 0xFF) * 0.137;
    y += ((seed >> 8) & 0xFF) * 0.137;
    var X = Math.floor(x) & 255;
    var Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    var u = fade(x), v = fade(y);
    var a = PERM[X] + Y, aa = PERM[a], ab = PERM[a + 1];
    var b = PERM[X + 1] + Y, ba = PERM[b], bb = PERM[b + 1];
    return lerp(lerp(grad(PERM[aa], x, y), grad(PERM[ba], x - 1, y), u),
                lerp(grad(PERM[ab], x, y - 1), grad(PERM[bb], x - 1, y - 1), u), v);
}

function fbm(x, y, seed, octaves, lacunarity, gain) {
    octaves = octaves || 6;
    lacunarity = lacunarity || 2.0;
    gain = gain || 0.5;
    var value = 0, amplitude = 0.5, frequency = 1;
    for (var i = 0; i < octaves; i++) {
        value += amplitude * perlin(x * frequency, y * frequency, seed + i * 31);
        amplitude *= gain;
        frequency *= lacunarity;
    }
    return value;
}

function ridged(x, y, seed) {
    return 1.0 - Math.abs(perlin(x, y, seed));
}

function domainWarp(x, y, seed, strength) {
    strength = strength || 1.5;
    var dx = fbm(x + 1.7, y + 9.2, seed, 4, 2, 0.5);
    var dy = fbm(x + 8.3, y + 2.8, seed + 53, 4, 2, 0.5);
    return fbm(x + strength * dx, y + strength * dy, seed, 6, 2, 0.5);
}

// ── Block catalog ─────────────────────────────────────────────────────────────
// Part numbers: 3001=2x4, 3003=2x2, 3004=1x2, 3005=1x1, 3010=1x4, 3002=2x3
var SURFACE_PARTS = ["3001", "3003", "3004", "3005"];
var SUBSURFACE_PART = "3001"; // 2x4 for fill
var SURFACE_COLOR  = 28;  // Dark tan
var SUBSURFACE_COLOR = 85; // Dark brown

// ── Height function ───────────────────────────────────────────────────────────
function getHeight(worldX, worldZ, seed) {
    var scale = 0.008;
    var n = domainWarp(worldX * scale, worldZ * scale, seed & 0xFFFF, 1.8);
    var baseH = 4;
    var variance = 22;
    return Math.round(baseH + n * variance);
}

// ── Chunk generation ──────────────────────────────────────────────────────────
function generateChunk(ctx) {
    var cx = ctx.chunkX(), cz = ctx.chunkZ();
    var seed = ctx.seed();
    var studSpacing = ctx.studSpacing();    // world units per stud
    var plateH = ctx.plateHeight();         // world units per plate
    var ox = ctx.originX(), oy = ctx.originY(), oz = ctx.originZ();
    var sizeStuds = ctx.chunkSizeStuds();

    ctx.clear();

    for (var ix = 0; ix < sizeStuds; ix++) {
        for (var iz = 0; iz < sizeStuds; iz++) {
            var wx = ox + ix * studSpacing;
            var wz = oz + iz * studSpacing;
            var height = getHeight(wx, wz, seed);

            // Surface block
            var partNum = SURFACE_PARTS[Math.abs((ix * 7 + iz * 13) % SURFACE_PARTS.length)];
            var wy = oy + height * plateH;
            ctx.addPart(partNum, SURFACE_COLOR, wx, wy, wz);

            // Fill downward
            for (var h = height - 1; h >= 0; h--) {
                ctx.addPart(SUBSURFACE_PART, SUBSURFACE_COLOR, wx, oy + h * plateH, wz);
            }
        }
    }

    ctx.markGenerated();
    return true;
}

// ── Registration ──────────────────────────────────────────────────────────────
mod.registerTerrainGenerator(
    "terrain-default",
    "Default (FBM Noise)",
    generateChunk,
    getHeight
);

log("Default terrain generator registered.");
