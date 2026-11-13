// The PixiJS canvas is behind the page and draw two things. 
// The first thing it draws is a field of dots that mouse pointer pushes through and when clicked ripples through. 
// The second thing is that a generative image is drawn inside every project tile. 


// Under sets up the PixiJS. 

const app = new PIXI.Application();
await app.init({
  resizeTo: window,
  backgroundAlpha: 0,           // It's transpaarent so the colour of the page shows through. 
  antialias: true,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  autoDensity: true,
});
document.getElementById("stage").appendChild(app.canvas);

// There are two layers draw so that the dots are covered by the tiles. 
const fieldLayer = new PIXI.Graphics();
const artLayer = new PIXI.Graphics();
app.stage.addChild(fieldLayer, artLayer);

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;


// Under it reads from the CSS variables so it can recreate the colors. 

const colours = {};

function readColours() {
  const css = getComputedStyle(document.documentElement);
  for (const name of ["ink", "muted", "accent", "tile"]) {
    colours[name] = new PIXI.Color(css.getPropertyValue(`--${name}`).trim()).toNumber();
  }
}

readColours();


// Under is the code for the input. 

const pointer = { x: -9999, y: -9999 };
const ripples = [];   // On every click it adds one "x, y and born". 

window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

window.addEventListener("pointerdown", (e) => {
  ripples.push({ x: e.clientX, y: e.clientY, born: performance.now() });
});

// All of the titles have a hover value that eases between the numbers of 0 and 1. 
const tiles = [...document.querySelectorAll(".tile")].map((el) => {
  const tile = {
    box: el.querySelector(".art"),
    motif: el.querySelector(".art").dataset.motif,
    hover: 0,
    target: 0,
  };
  el.addEventListener("pointerenter", () => { tile.target = 1; });
  el.addEventListener("pointerleave", () => { tile.target = 0; });
  return tile;
});

// The dots in the canvas have a current and home position. 
// With a force it is pushed away. But with a springs it is pulled home. 

const SPACING = 28;
const PUSH_RADIUS = 150;
const RIPPLE_SPEED = 500;     // The speed is in pixels per second. 
const RIPPLE_LIFE = 2000;     // The time measaurement is in milliseconds.

let dots = [];

function buildField() {
  dots = [];
  for (let x = SPACING / 2; x < window.innerWidth; x += SPACING) {
    for (let y = SPACING / 2; y < window.innerHeight; y += SPACING) {
      dots.push({ homeX: x, homeY: y, x, y, vx: 0, vy: 0 });
    }
  }
}

// Under pushes a dot away from a points and it is stronger the closer it is to the mouse pointer.  
function pushAway(dot, fromX, fromY, radius, strength) {
  const dx = dot.x - fromX;
  const dy = dot.y - fromY;
  const distance = Math.hypot(dx, dy) || 1;
  if (distance < radius) {
    const force = (1 - distance / radius) * strength;
    dot.vx += (dx / distance) * force;
    dot.vy += (dy / distance) * force;
  }
}

function updateField(now) {
  // The ripples that have faded out are forgotten. 
  while (ripples.length && now - ripples[0].born > RIPPLE_LIFE) ripples.shift();

  for (const dot of dots) {
    pushAway(dot, pointer.x, pointer.y, PUSH_RADIUS, 1.2);

    // There is a ring that is a ripple that grows. The dota that near the ring get pushed. 
    for (const ripple of ripples) {
      const age = now - ripple.born;
      const ringRadius = (age / 1000) * RIPPLE_SPEED;
      const fromRing = Math.abs(Math.hypot(dot.x - ripple.x, dot.y - ripple.y) - ringRadius);
      if (fromRing < 20) pushAway(dot, ripple.x, ripple.y, ringRadius + 20, 3 * (1 - age / RIPPLE_LIFE));
    }

    // This under makes is spring home and it uses friction for it to settle. 
    dot.vx = (dot.vx + (dot.homeX - dot.x) * 0.06) * 0.82;
    dot.vy = (dot.vy + (dot.homeY - dot.y) * 0.06) * 0.82;
    dot.x += dot.vx;
    dot.y += dot.vy;
  }
}

function drawField() {
  fieldLayer.clear();

  // The dots that are not moving are in grey. The color of the dots that are moving is yellow. 
  const moving = [];
  for (const dot of dots) {
    const offset = Math.abs(dot.x - dot.homeX) + Math.abs(dot.y - dot.homeY);
    if (offset > 3) moving.push(dot);
    else fieldLayer.rect(dot.x - 1, dot.y - 1, 2, 2);
  }
  fieldLayer.fill({ color: colours.muted, alpha: 0.4 });

  for (const dot of moving) fieldLayer.rect(dot.x - 1.5, dot.y - 1.5, 3, 3);
  fieldLayer.fill(colours.accent);
}

buildField();
window.addEventListener("resize", buildField);

// It draws one function per function. It means they all take the same argument. 

// All the generated images in the data-motif won't be visible because they have been replaced with actual images.

// It's randomly generated but saved in a seed. It's so the scatter looks the same on every visit. 
function seededRandom(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

const random = seededRandom(7);
const scatterPoints = Array.from({ length: 48 }, () => ({ x: random(), y: random(), phase: random() * 6.28 }));

const motifs = {

   // When hovered over the petals open. 
  bloom(g, x, y, w, h, t, hover) {
    const cx = x + w / 2, cy = y + h / 2;
    const petals = 14;
    const open = 0.35 + 0.15 * Math.sin(t * 0.8) + hover * 0.5;
    const length = Math.min(w, h) * 0.4 * open;

    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2 + t * 0.1;
      const side = 0.18;
      g.poly([
        cx, cy,
        cx + Math.cos(angle - side) * length * 0.6, cy + Math.sin(angle - side) * length * 0.6,
        cx + Math.cos(angle) * length, cy + Math.sin(angle) * length,
        cx + Math.cos(angle + side) * length * 0.6, cy + Math.sin(angle + side) * length * 0.6,
      ]);
    }
    g.fill({ color: colours.accent, alpha: hover * 0.25 });
    g.stroke({ width: 1.25, color: colours.ink });
  },

  // The four figures that are made from the stacked bars. Hovering over them makes them stop still in their place. 
  idols(g, x, y, w, h, t, hover) {
    const columns = 4, rows = 12;
    const columnWidth = (w * 0.8) / columns;
    const rowHeight = (h * 0.7) / rows;
    const sway = 1 - hover;

    for (let c = 0; c < columns; c++) {
      const centre = x + w * 0.1 + columnWidth * (c + 0.5);
      for (let r = 0; r < rows; r++) {
        const barWidth = columnWidth * (0.25 + 0.5 * Math.abs(Math.sin(r * 0.7 + c * 1.3)));
        const shift = Math.sin(t * 1.2 + r * 0.4 + c) * columnWidth * 0.15 * sway;
        g.rect(centre - barWidth / 2 + shift, y + h * 0.15 + r * rowHeight, barWidth, rowHeight * 0.6);
      }
    }
    g.fill(hover > 0.5 ? colours.accent : colours.ink);
  },

  // The Unfinder: drifting points that find each other on hover
  scatter(g, x, y, w, h, t, hover) {
    const points = scatterPoints.map((p) => ({
      x: x + w * (0.1 + 0.8 * p.x) + Math.sin(t * 0.7 + p.phase) * 10,
      y: y + h * (0.1 + 0.8 * p.y) + Math.cos(t * 0.5 + p.phase) * 10,
    }));

    if (hover > 0.01) {
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < w * 0.16) {
            g.moveTo(points[i].x, points[i].y).lineTo(points[j].x, points[j].y);
          }
        }
      }
      g.stroke({ width: 1, color: colours.accent, alpha: hover * 0.8 });
    }

    for (const p of points) g.circle(p.x, p.y, 2.5);
    g.fill(colours.ink);
  },

  // These are cells that shrink and grow. They are inside a frame that's fixed. 
  grid(g, x, y, w, h, t, hover) {
    const columns = 8, rows = 6;
    const cellW = (w * 0.8) / columns, cellH = (h * 0.8) / rows;

    for (let i = 0; i < columns; i++) {
      for (let j = 0; j < rows; j++) {
        const size = 0.5 + 0.5 * Math.sin(t * (1 + hover * 2) + i * 0.6 + j * 0.9);
        const cx = x + w * 0.1 + cellW * (i + 0.5);
        const cy = y + h * 0.1 + cellH * (j + 0.5);
        g.rect(cx - (cellW * size) / 2.4, cy - (cellH * size) / 2.4, (cellW * size) / 1.2, (cellH * size) / 1.2);
      }
    }
    g.fill(hover > 0.5 ? colours.accent : colours.ink);
    g.rect(x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.8).stroke({ width: 1.5, color: colours.ink });
  },

  // Under is the ring spreading out like a note going into a microphone. 
  rings(g, x, y, w, h, t, hover) {
    const cx = x + w / 2, cy = y + h / 2;
    const maxRadius = Math.min(w, h) * 0.45;
    const count = 7;

    for (let k = 0; k < count; k++) {
      const radius = (t * (18 + hover * 40) + (k * maxRadius) / count) % maxRadius;
      g.circle(cx, cy, radius).stroke({
        width: 1.5,
        color: hover > 0.5 ? colours.accent : colours.ink,
        alpha: 1 - radius / maxRadius,
      });
    }
    g.circle(cx, cy, 5 + hover * 4).fill(colours.ink);
  },

  // Under it links the nodes between each other. 
  links(g, x, y, w, h, t, hover) {
    const count = 7;
    const cx = x + w / 2, cy = y + h / 2;
    const nodes = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + t * 0.15;
      const radius = Math.min(w, h) * (0.28 + 0.08 * Math.sin(t + i * 2));
      nodes.push({ x: cx + Math.cos(angle) * radius * 1.3, y: cy + Math.sin(angle) * radius });
    }

    // Under every node links to two other nodes. it means no node is on it's own.
    for (let i = 0; i < count; i++) {
      for (const step of [2, 3]) {
        const other = nodes[(i + step) % count];
        g.moveTo(nodes[i].x, nodes[i].y).lineTo(other.x, other.y);
      }
    }
    g.stroke({ width: 1.25, color: hover > 0.5 ? colours.accent : colours.ink, alpha: 0.6 + hover * 0.4 });

    for (const node of nodes) g.rect(node.x - 5, node.y - 5, 10, 10);
    g.fill(colours.ink);
  },
};

function drawTiles(time) {
  artLayer.clear();

  for (const tile of tiles) {
    tile.hover += (tile.target - tile.hover) * 0.1;

    // Where is the tile on screen right now? Skip it if scrolled away.
    const r = tile.box.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) continue;

    artLayer.rect(r.left, r.top, r.width, r.height).fill(colours.tile);
    motifs[tile.motif](artLayer, r.left, r.top, r.width, r.height, time, tile.hover);
  }
}

// Under updates the field every frame. 

let time = 0;

app.ticker.add((ticker) => {
  const anyHover = tiles.some((tile) => tile.target > 0);
  if (!reduceMotion || anyHover) time += ticker.deltaMS / 1000;

  const now = performance.now();
  updateField(now);
  drawField();
  drawTiles(time);
});
