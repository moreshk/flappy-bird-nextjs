// import { supabase } from '../lib/supabaseClient';

const RAD = Math.PI / 180;
const scrn = document.getElementById("canvas");
const sctx = scrn.getContext("2d");
scrn.tabIndex = 1;
// At the beginning of the file
let highScore = 0;

// Add this event listener
window.addEventListener('highScoreUpdated', (event) => {
  highScore = event.detail;
  console.log('High score updated:', highScore);
});

let totalScore = 0;
let attemptsCount = 0;

window.addEventListener('statsUpdated', (event) => {
  totalScore = event.detail.total_score;
  attemptsCount = event.detail.attempts_count;
  console.log('Stats updated:', totalScore, attemptsCount);
});

function resizeCanvas() {
  const windowRatio = window.innerWidth / window.innerHeight;
  const gameRatio = 414 / 736; // Original game aspect ratio

  if (windowRatio < gameRatio) {
    scrn.width = window.innerWidth;
    scrn.height = window.innerWidth / gameRatio;
  } else {
    scrn.height = window.innerHeight;
    scrn.width = window.innerHeight * gameRatio;
  }

  // Center the canvas
  scrn.style.position = "absolute";
  scrn.style.left = `${(window.innerWidth - scrn.width) / 2}px`;
  scrn.style.top = `${(window.innerHeight - scrn.height) / 2}px`;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
scrn.addEventListener("click", () => {
  switch (state.curr) {
    case state.getReady:
      state.curr = state.Play;
      SFX.start.play();
      break;
    case state.Play:
      bird.flap();
      break;
    case state.gameOver:
      resetGame();
      break;
  }
});

scrn.onkeydown = function keyDown(e) {
  if (e.keyCode == 32 || e.keyCode == 87 || e.keyCode == 38) {
    // Space Key or W key or arrow up
    switch (state.curr) {
      case state.getReady:
        state.curr = state.Play;
        SFX.start.play();
        break;
      case state.Play:
        bird.flap();
        break;
      case state.gameOver:
        resetGame();
        break;
    }
  }
};

function resetGame() {
  state.curr = state.getReady;
  bird.speed = 0;
  bird.y = 100;
  pipe.pipes = [];
  UI.score.curr = 0;
  SFX.played = false;
  gameOverHandled = false;
}

let frames = 0;
let dx = 2;
const state = {
  curr: 0,
  getReady: 0,
  Play: 1,
  gameOver: 2,
};
const SFX = {
  start: new Audio(),
  flap: new Audio(),
  score: new Audio(),
  hit: new Audio(),
  die: new Audio(),
  played: false,
};
const gnd = {
  sprite: new Image(),
  x: 0,
  y: 0,
  draw: function () {
    this.y = parseFloat(scrn.height - this.sprite.height);

    // Draw two ground images side by side
    sctx.drawImage(this.sprite, this.x, this.y);
    sctx.drawImage(this.sprite, this.x + this.sprite.width, this.y);

    // If the first image is completely off screen, reset the position
    if (this.x <= -this.sprite.width) {
      this.x = 0;
    }
  },
  update: function () {
    if (state.curr != state.Play) return;
    this.x -= dx; // Use the same speed as the pipes for consistency
  },
};
const bg = {
  sprite: new Image(),
  x: 0,
  y: 0,
  draw: function () {
    let scale = Math.max(
      scrn.width / this.sprite.width,
      scrn.height / this.sprite.height
    );
    let scaledWidth = this.sprite.width * scale;
    let scaledHeight = this.sprite.height * scale;

    // Calculate the position to center the image
    let xOffset = (scrn.width - scaledWidth) / 2;
    let yOffset = (scrn.height - scaledHeight) / 2;

    // Draw two images side by side for seamless scrolling
    sctx.drawImage(
      this.sprite,
      this.x + xOffset,
      yOffset,
      scaledWidth,
      scaledHeight
    );
    sctx.drawImage(
      this.sprite,
      this.x + xOffset + scaledWidth,
      yOffset,
      scaledWidth,
      scaledHeight
    );

    // Reset position when the first image is fully off-screen
    if (this.x <= -scaledWidth) {
      this.x = 0;
    }
  },
  update: function () {
    this.x -= 0.5; // Adjust this value to change scroll speed
  },
};
const pipe = {
  top: { sprite: new Image() },
  bot: { sprite: new Image() },
  gap: 200, // Start with a large gap
  moved: true,
  pipes: [],
  minGap: 65, // Minimum gap size
  draw: function () {
    for (let i = 0; i < this.pipes.length; i++) {
      let p = this.pipes[i];
      sctx.drawImage(this.top.sprite, p.x, p.y);
      sctx.drawImage(
        this.bot.sprite,
        p.x,
        p.y + parseFloat(this.top.sprite.height) + this.gap
      );
    }
  },
  update: function () {
    if (state.curr != state.Play) return;
    if (frames % 100 == 0) {
      this.pipes.push({
        x: parseFloat(scrn.width),
        y: -210 * Math.min(Math.random() + 1, 1.8),
      });
    }
    this.pipes.forEach((pipe) => {
      pipe.x -= dx;
    });

    if (this.pipes.length && this.pipes[0].x < -this.top.sprite.width) {
      this.pipes.shift();
      this.moved = true;
    }

    // Update gap size based on score
    this.updateDifficulty();
  },
  updateDifficulty: function () {
    // Gradually decrease gap size as score increases
    let newGap = 200 - Math.floor(UI.score.curr / 5) * 5;
    this.gap = Math.max(newGap, this.minGap);
  },
};
const bird = {
  animations: [
    { sprite: new Image() },
    { sprite: new Image() },
    { sprite: new Image() },
    { sprite: new Image() },
  ],
  rotatation: 0,
  x: 50,
  y: 100,
  speed: 0,
  gravity: 0.125,
  thrust: 3.6,
  frame: 0,
  draw: function () {
    let h = this.animations[this.frame].sprite.height;
    let w = this.animations[this.frame].sprite.width;
    sctx.save();
    sctx.translate(this.x, this.y);
    sctx.rotate(this.rotatation * RAD);
    sctx.drawImage(this.animations[this.frame].sprite, -w / 2, -h / 2);
    sctx.restore();
  },
  update: function () {
    this.updatePath();
    let r = parseFloat(this.animations[0].sprite.width) / 2;
    switch (state.curr) {
      case state.getReady:
        this.rotatation = 0;
        this.y += frames % 10 == 0 ? Math.sin(frames * RAD) : 0;
        this.frame += frames % 10 == 0 ? 1 : 0;
        break;
      case state.Play:
        this.frame += frames % 5 == 0 ? 1 : 0;
        this.y += this.speed;
        this.setRotation();
        this.speed += this.gravity;
        if (this.y + r >= gnd.y || this.collisioned()) {
          state.curr = state.gameOver;
        }

        break;
      case state.gameOver:
        this.frame = 1;
        if (this.y + r < gnd.y) {
          this.y += this.speed;
          this.setRotation();
          this.speed += this.gravity * 2;
        } else {
          this.speed = 0;
          this.y = gnd.y - r;
          this.rotatation = 90;
          if (!SFX.played) {
            SFX.die.play();
            SFX.played = true;
          }
        }

        break;
    }
    this.frame = this.frame % this.animations.length;
  },
  flap: function () {
    if (this.y > 0) {
      SFX.flap.play();
      this.speed = -this.thrust;
    }
  },
  setRotation: function () {
    if (this.speed <= 0) {
      this.rotatation = Math.max(-25, (-25 * this.speed) / (-1 * this.thrust));
    } else if (this.speed > 0) {
      this.rotatation = Math.min(90, (90 * this.speed) / (this.thrust * 2));
    }
  },
  collisioned: function () {
    if (!pipe.pipes.length) return;
    let bird = this.animations[0].sprite;
    let x = pipe.pipes[0].x;
    let y = pipe.pipes[0].y;
    let r = bird.height / 4 + bird.width / 4;
    let roof = y + parseFloat(pipe.top.sprite.height);
    let floor = roof + pipe.gap; // Use the dynamic gap size
    let w = parseFloat(pipe.top.sprite.width);
    if (this.x + r >= x) {
      if (this.x + r < x + w) {
        if (this.y - r <= roof || this.y + r >= floor) {
          SFX.hit.play();
          return true;
        }
      } else if (pipe.moved) {
        UI.score.curr++;
        SFX.score.play();
        pipe.moved = false;
      }
    }
  },
  path: [],
  maxPathLength: 20,

  updatePath: function () {
    this.path.unshift({ x: this.x, y: this.y });
    if (this.path.length > this.maxPathLength) {
      this.path.pop();
    }
  },

  drawTail: function () {
    sctx.beginPath();
    sctx.moveTo(this.x, this.y);
    for (let i = 0; i < this.path.length; i++) {
      let point = this.path[i];
      let x = this.x - i * 3; // Move each point 3 pixels to the left
      sctx.lineTo(x, point.y);
    }
    sctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    sctx.lineWidth = 3;
    sctx.stroke();
  },
};
const UI = {
  getReady: { sprite: new Image() },
  gameOver: { sprite: new Image() },
  tap: [{ sprite: new Image() }, { sprite: new Image() }],
  score: {
    curr: 0,
    best: 0,
  },
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
  frame: 0,
  draw: function () {
    switch (state.curr) {
      case state.getReady:
        this.y = parseFloat(scrn.height - this.getReady.sprite.height) / 2;
        this.x = parseFloat(scrn.width - this.getReady.sprite.width) / 2;
        this.tx = parseFloat(scrn.width - this.tap[0].sprite.width) / 2;
        this.ty =
          this.y + this.getReady.sprite.height - this.tap[0].sprite.height;
        sctx.drawImage(this.getReady.sprite, this.x, this.y);
        sctx.drawImage(this.tap[this.frame].sprite, this.tx, this.ty);
        break;
      case state.gameOver:
        this.y = parseFloat(scrn.height - this.gameOver.sprite.height) / 2;
        this.x = parseFloat(scrn.width - this.gameOver.sprite.width) / 2;
        sctx.drawImage(this.gameOver.sprite, this.x, this.y);
        this.drawScore();
        // Draw tap icons below the scores
        this.tx = parseFloat(scrn.width - this.tap[0].sprite.width) / 2;
        this.ty = this.y + this.gameOver.sprite.height + 100; // Adjust this value as needed
        sctx.drawImage(this.tap[this.frame].sprite, this.tx, this.ty);
        break;
    }
    if (state.curr !== state.gameOver) {
      this.drawScore();
    }

    // Replace the Total: text with mogul_coin image
  let coinImage = new Image();
  coinImage.src = "/mogul_coin.png";
  let coinSize = 40; // Adjust this value to change the size of the coin image
  sctx.drawImage(coinImage, scrn.width / 2 - 30, scrn.height - 52, coinSize, coinSize);
  //scrn.height - 52 helps adjust vertical position

    // Add this block to draw the total score at the bottom
    sctx.fillStyle = "#FFFFFF";
    sctx.strokeStyle = "#000000";
    sctx.lineWidth = "2";
    sctx.font = "40px Squada One";
    let ts = `${totalScore}`;
    sctx.fillText(ts, scrn.width / 2 + 20, scrn.height - 20);
    sctx.strokeText(ts, scrn.width / 2 + 20, scrn.height - 20);

  },
  drawScore: function () {
    sctx.fillStyle = "#FFFFFF";
    sctx.strokeStyle = "#000000";
    switch (state.curr) {
      case state.Play:
        sctx.lineWidth = "2";
        sctx.font = "35px Squada One";
        sctx.fillText(this.score.curr, scrn.width / 2 - 5, 50);
        sctx.strokeText(this.score.curr, scrn.width / 2 - 5, 50);
        break;
      case state.gameOver:
        sctx.lineWidth = "2";
        sctx.font = "40px Squada One";
        let sc = `SCORE :     ${this.score.curr}`;
        let bs = `BEST  :     ${highScore}`;
        let ts = `TOTAL :     ${totalScore}`;
        let ac = `TRIES :     ${attemptsCount}`;
        let yPos = scrn.height / 2; // Start higher up
        sctx.fillText(sc, scrn.width / 2 - 80, yPos);
        sctx.strokeText(sc, scrn.width / 2 - 80, yPos);
        yPos += 30;
        sctx.fillText(bs, scrn.width / 2 - 80, yPos);
        sctx.strokeText(bs, scrn.width / 2 - 80, yPos);
        yPos += 30;
        sctx.fillText(ts, scrn.width / 2 - 80, yPos);
        sctx.strokeText(ts, scrn.width / 2 - 80, yPos);
        yPos += 30;
        sctx.fillText(ac, scrn.width / 2 - 80, yPos);
        sctx.strokeText(ac, scrn.width / 2 - 80, yPos);
        break;
    }
  },
  update: function () {
    if (state.curr == state.Play) return;
    this.frame += frames % 10 == 0 ? 1 : 0;
    this.frame = this.frame % this.tap.length;
  },
};
gnd.sprite.src = "/img/ground.png";
bg.sprite.src = "/img/BG.png";
pipe.top.sprite.src = "/img/toppipe.png";
pipe.bot.sprite.src = "/img/botpipe.png";
UI.gameOver.sprite.src = "/img/go.png";
UI.getReady.sprite.src = "/img/getready.png";
UI.tap[0].sprite.src = "/img/tap/t0.png";
UI.tap[1].sprite.src = "/img/tap/t1.png";
bird.animations[0].sprite.src = "/img/bird/b0.png";
bird.animations[1].sprite.src = "/img/bird/b1.png";
bird.animations[2].sprite.src = "/img/bird/b2.png";
bird.animations[3].sprite.src = "/img/bird/b0.png";
SFX.start.src = "sfx/start.wav";
SFX.flap.src = "sfx/flap.wav";
SFX.score.src = "sfx/score.wav";
SFX.hit.src = "sfx/hit.wav";
SFX.die.src = "sfx/die.wav";

function gameLoop() {
  update();
  draw();
  frames++;
  handleGameOver();
}

function update() {
  bird.update();
  gnd.update();
  pipe.update();
  UI.update();
  bg.update();
  updateSpeed();
  totalScore = window.totalScore || 0;
}

function draw() {
  sctx.fillStyle = "#30c0df";
  sctx.fillRect(0, 0, scrn.width, scrn.height);
  bg.draw();
  pipe.draw();
  bird.drawTail(); // Add this line
  bird.draw();
  gnd.draw();
  UI.draw();
}

// Add the new function here
function updateSpeed() {
  // Increase speed every 10 points, up to a maximum
  dx = Math.min(2 + Math.floor(UI.score.curr / 10) * 0.5, 5);
}

// Update the handleGameOver function
let gameOverHandled = false;

async function handleGameOver() {
  if (state.curr === state.gameOver && !gameOverHandled) {
    gameOverHandled = true;
    const score = UI.score.curr;
    try {
      await window.upsertPlayer(score);
      // The high score will be updated via the 'highScoreUpdated' event
    } catch (error) {
      console.error('Error updating score:', error);
    }
  }
}

setInterval(gameLoop, 20);
resizeCanvas();
