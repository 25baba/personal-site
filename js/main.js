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

  // The dots that are not moving are in grey. The color of the dots that are moving is green. 
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
