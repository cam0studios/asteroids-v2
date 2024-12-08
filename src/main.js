import p5 from "p5";
import { Vector } from "../vector-library/vector";
import weapons from "./weapon-types";
import enemyTypes from "./enemy-types";
import levels from "./levels";
import projectileTypes, { explode } from "./projectile-types";
import { signOut, pb, getScores, postScore, user, getUsers, postFeed, signedIn, signIn, signInWithGoogle, updateStats } from "./pocketbase";
import { gamepad, gamepadConnected, rumble, updateGamepad } from "./gamepad";

export const version = "v0.4.2";

export var keys = {};
"qwertyuiopasdfghjklzxcvbnm ".split("").forEach(e => {
  keys[e] = false;
});

// global vars
export var clampTime, enemies, player, projectiles, sketch, size = new Vector(innerWidth, innerHeight), cam, currentLevel, settings, mouseDown, time, fpsTime, fps, nextFps, deltaTime, mouse = Vector.zero, screenshake, cursorContract, devMode = false, paused, score, posted;

// setup base html

setTimeout(() => startGame(0), 100);

function startGame(level) {
  currentLevel = levels[level];
  let p5Inst = new p5(s);
}
function stopGame() {
  sketch.noLoop();
  document.getElementById("defaultCanvas0").remove();
}

var playerUpgrades = [
  { name: "Speed", desc: "Makes you faster", func: () => player.speed += 100, max: 5, weight: 1 },
  { name: "Health", desc: "Increase max health", func: () => { player.maxHp *= 1.15; player.hp += 20 }, max: 5, weight: 0.8 },
  { name: "Shield", desc: "Make shield better", func: () => { player.maxShield += 10; player.shieldRegenTime--; player.shieldRegenSpeed++ }, max: 5, weight: 0.8 },
  // { name: "", desc: "", func: () => {}, max: 0 }
];

// ********************  p5  ******************** //
const s = (sk) => {
  sketch = sk;
  enemies = [];
  posted = false;
  player = {
    pos: Vector.zero,
    vel: Vector.zero,
    dir: 0,
    weapons: [],
    speed: 350,
    xp: 200,
    levelUp: 200,
    hp: 100,
    maxHp: 100,
    shield: 0,
    maxShield: 30,
    shieldRegenTime: 10,
    shieldRegenSpeed: 5,
    shieldRegenTimeLeft: 0,
    level: -1,
    kills: 0,
    score: 0,
    died: false,
    dodgeCooldown: 0,
    dodgeVel: Vector.zero,
    dodgeTime: 0,
  };
  paused = false;
  score = 0;
  playerUpgrades.forEach(e => e.times = 0);

  if (!location.href.includes("https://cam0studios.github.io/")) {
    window.playerLink = player;
    window.setTime = (val) => time = val;
    devMode = true;
  }

  settings = {
    toggleFire: false,
    doScreenShake: true,
    emojiMovie: false,
  }
  currentLevel.start.forEach(e => {
    for (let i = 0; i < e.count; i++) {
      let props = { mode: 0, index: i, max: e.count };
      for (let prop in e.props) {
        props[prop] = e.props[prop];
      }
      new enemyTypes[e.type](props);
    }
  });
  addWeapon("gun");
  projectiles = [];
  size = new Vector(innerWidth, innerHeight);
  cam = Vector.zero;
  time = 0;
  fpsTime = 0;
  fps = 0;
  nextFps = [];
  screenshake = 0;
  mouseDown = false;
  cursorContract = 0;
  sketch.setup = () => {
    sketch.createCanvas(size.x, size.y);
    sketch.frameRate(144);
    document.getElementById("defaultCanvas0").focus();
  }
  sketch.draw = () => {
    // ********************  vars  ******************** //
    deltaTime = sketch.deltaTime / 1000;
    clampTime = sketch.deltaTime;
    if (clampTime > 100) clampTime = 100;
    clampTime /= 1000;

    if (!player.died) time += clampTime;

    // cam["="](player.pos);
    let camMove = Math.pow(1e-3, clampTime);
    cam["*="](camMove);
    cam["+="]((player.pos)["*"](1 - camMove));

    // cam["+="](mouse["/"](10));

    if (settings.doScreenShake) cam["+="](new Vector(screenshake, 0).rotate(Math.random() * 2 * Math.PI));
    screenshake *= Math.pow(5e-5, clampTime);

    // fps
    if (fpsTime < 0) {
      fps = 0;
      nextFps.forEach(next => {
        fps += next / nextFps.length;
      });
      nextFps = [];
      fpsTime = 0.2;
    } else {
      fpsTime -= deltaTime;
      nextFps.push(1 / deltaTime);
    }

    // waves
    currentLevel.waves.forEach(wave => {
      if (!("passed" in wave)) wave.passed = false;
      if (!wave.passed) {
        if (time > wave.time) {
          wave.passed = true;
          wave.enemies.forEach(e => {
            for (let i = 0; i < e.count; i++) {
              let props = { mode: 1, index: i, max: e.count };
              for (let prop in e.props) {
                props[prop] = e.props[prop];
              }
              new enemyTypes[e.type](props);
            }
          });
        }
      }
    });

    // ********************  physics  ******************** //
    // player movement
    if (player.hp > 0) {
      player.pos["+="]((player.vel)["*"](clampTime));

      let joy = new Vector(keys["d"] - keys["a"], keys["s"] - keys["w"]);
      joy["+="](gamepad.leftStick);
      if (joy.mag > 1) joy.mag = 1;
      joy["*="](player.speed * clampTime);
      player.vel["+="](joy);
      player.vel["*="](Math.pow(0.3, clampTime));

      if (gamepadConnected) {
        if (gamepad.rightStick.mag > 0.1) {
          let dir = gamepad.rightStick.copy;
          dir.mag = 200;
          mouse["="](dir);
        }
      }

      if (player.dodgeTime <= 0) {
        player.dodgeCooldown -= clampTime;
        if ((keys[" "] || gamepad.leftTrigger) && player.dodgeCooldown <= 0 && joy.mag > 0) {
          player.dodgeCooldown = 0.2;
          let v = joy.copy;
          v.mag = 1000;
          player.dodgeVel = v;
          player.dodgeTime = .15;
        }
      } else {
        player.dodgeTime -= clampTime;
        if (player.dodgeTime <= 0) {
          player.dodgeVel = Vector.zero;
        }
        player.vel["="](player.dodgeVel);
        new projectileTypes[3]({ pos: player.pos.copy });
      }

      player.dir = mouse.heading;
      applyBorder(player);

      // level up
      if (player.xp >= player.levelUp) {
        player.level++;
        sketch.noLoop();
        paused = true;
        player.xp -= player.levelUp;
        player.levelUp *= 1.2;
        document.getElementById("upgradeMenu").showModal();

        let content = "";
        let choices = [];
        playerUpgrades.filter(e => e.times < e.max).forEach(e => { for (let n = 0; n < e.weight; n += 0.05) choices.push({ type: 0, val: e }) });
        player.weapons.forEach((w, i) => {
          w.upgrades.filter(e => e.times < e.max).forEach(e => { for (let n = 0; n < e.weight; n += 0.05) choices.push({ type: 1, val: e, i }) });
        });

        let chosen = [];
        for (let i = 0; i < 3; i++) {
          if (choices.length > 0) {
            let r = Math.floor(Math.random() * choices.length);
            chosen.push(choices[r]);
            choices = choices.filter(e => JSON.stringify(e) != JSON.stringify(choices[r]));
          }
        }
        if (chosen.length == 0) chosen.push({ type: -1, val: { name: "Recover", desc: "Recover some hp", func: () => player.hp += 40, max: 0, times: 0 } });

        chosen.forEach((opt, i) => {
          content += `<button id="option${i}"><h2>${opt.val.name}</h2><p>${opt.val.desc}</p><p>${opt.val.times}/${opt.val.max}</p></button>`;
        });

        document.getElementById("options").innerHTML = content;

        document.getElementById("options").querySelector("button").focus();

        chosen.forEach((opt, i) => {
          document.getElementById(`option${i}`).addEventListener("click", () => {
            player.hp += 15;
            opt.val.func(function () {
              switch (opt.type) {
                case 0: return player;
                case 1: return player.weapons[opt.i]
              }
            }());
            opt.val.times++;
            document.getElementById("upgradeMenu").close();
            sketch.loop();
            paused = false;
          });
        });
      }

      // player shield
      if (player.shield < player.maxShield) {
        if (player.shieldRegenTimeLeft < player.shieldRegenTime) {
          player.shieldRegenTimeLeft += clampTime;
        } else {
          player.shield += player.shieldRegenSpeed * clampTime;
        }
      } else if (player.shield > player.maxShield) {
        player.shield = player.maxShield;
      }

      if (player.hp > player.maxHp) player.hp = player.maxHp;

      // weapons
      player.weapons.forEach(weapon => {
        weapon.tick(weapon);
      });
    } else {
      player.hp = 0;
      if (!player.died) {
        player.died = true;
        die();
        document.getElementById("gameOver").showModal();
      }
    }

    // projectiles
    projectiles.forEach((projectile, i) => {
      projectile.tick(i);
    });

    // enemies
    enemies.forEach((a, aI) => {
      a.tick(aI);
    });


    // ********************  drawing  ******************** //
    // background
    sketch.background(10);
    sketch.stroke(50);
    sketch.strokeWeight(2);
    sketch.strokeJoin("round");
    let lineSize = 70;
    let off = ((cam)["*"](-1))["%"](lineSize);
    for (let x = 0; x < size.x + lineSize; x += lineSize) {
      let rx = x + off.x;
      sketch.line(rx, 0, rx, size.y);
    }
    for (let y = 0; y < size.y + lineSize; y += lineSize) {
      let ry = y + off.y;
      sketch.line(0, ry, size.x, ry);
    }

    sketch.push();
    sketch.translate(size.x / 2, size.y / 2);

    sketch.translate(-cam.x, -cam.y);

    // world borders
    if (true) {
      sketch.push();
      sketch.noStroke();
      let num = 7;
      let borderSize = 20;
      let borderPow = 0.7;
      let col = "5,5,6";
      let outerSize = new Vector(size.x / 2 + currentLevel.size * 0.5, size.y / 2 + currentLevel.size * 0.5);
      // right
      if (cam.x > currentLevel.size - size.x / 2) {
        for (let i = 0; i < num; i++) {
          sketch.fill(`rgba(${col},${Math.pow((i + 1) / (num + 1), borderPow)})`);
          sketch.rect(currentLevel.size + i * borderSize, cam.y - size.y / 2, borderSize, size.y);
        }

        sketch.fill(`rgb(${col})`);
        sketch.rect(currentLevel.size + num * borderSize, cam.y - size.y / 2, outerSize.x / 2, size.y);
      }
      // left
      if (cam.x < -currentLevel.size + size.x / 2) {
        for (let i = 0; i < num; i++) {
          sketch.fill(`rgba(${col},${Math.pow((i + 1) / (num + 1), borderPow)})`);
          sketch.rect(-currentLevel.size - i * borderSize, cam.y - size.y / 2, -borderSize, size.y);
        }

        sketch.fill(`rgb(${col})`);
        sketch.rect(-currentLevel.size - num * borderSize, cam.y - size.y / 2, -size.x / 2, size.y);
      }
      // bottom
      if (cam.y > currentLevel.size - size.y / 2) {
        for (let i = 0; i < num; i++) {
          sketch.fill(`rgba(${col},${Math.pow((i + 1) / (num + 1), borderPow)})`);
          sketch.rect(cam.x - size.x / 2, currentLevel.size + i * borderSize, size.x, borderSize);
        }

        sketch.fill(`rgb(${col})`);
        sketch.rect(cam.x - size.x / 2, currentLevel.size + num * borderSize, size.x, size.y / 2);
      }
      // top
      if (cam.y < -currentLevel.size + size.y / 2) {
        for (let i = 0; i < num; i++) {
          sketch.fill(`rgba(${col},${Math.pow((i + 1) / (num + 1), borderPow)})`);
          sketch.rect(cam.x - size.x / 2, -currentLevel.size - i * borderSize, size.x, -borderSize);
        }

        sketch.fill(`rgb(${col})`);
        sketch.rect(cam.x - size.x / 2, -currentLevel.size - num * borderSize, size.x, -size.y / 2);
      }
      sketch.pop();
    }

    // enemies before draw
    enemies.forEach((a, i) => {
      sketch.push();
      a.beforeDraw();
      sketch.pop();
    });

    // projectiles
    projectiles.forEach(p => {
      sketch.push();
      p.draw();
      sketch.pop();
    });

    // enemies after draw
    enemies.forEach((a, i) => {
      sketch.push();
      a.afterDraw();
      sketch.pop();
    });

    // player
    if (player.hp > 0) {
      sketch.push();
      sketch.translate(player.pos.x, player.pos.y);

      sketch.rotate(player.dir);
      sketch.stroke(255);
      sketch.strokeWeight(5);
      sketch.fill(0);

      if (settings.emojiMovie) {
        sketch.textAlign("center", "center");
        sketch.rotate(Math.PI / 4);
        sketch.textSize(50);
        sketch.text("🚀", 0, 0);
      } else {
        sketch.triangle(-15, -15, 20, 0, -15, 15);
      }
      sketch.pop();
    }

    sketch.pop();

    // hud
    sketch.push();
    sketch.fill("rgba(0,0,0,0.5)");
    sketch.noStroke();
    sketch.rectMode("corners");
    sketch.rect(12.5, 12.5, 137.5, 85, 12.5);
    sketch.rect(size.x - 12.5, 12.5, size.x - 100, 140, 12.5);
    sketch.pop();

    // minimap
    let minimapSize = 130;
    let minimapBorder = 10
    sketch.push();
    sketch.fill(0);
    sketch.stroke(255);
    sketch.strokeWeight(5);
    sketch.rect(size.x - minimapSize - 20 - minimapBorder / 2, size.y - minimapSize - 20 - minimapBorder / 2, minimapSize + minimapBorder, minimapSize + minimapBorder);
    sketch.translate(size.x - 20 - minimapSize / 2, size.y - 20 - minimapSize / 2);
    sketch.scale(130 / 2, 130 / 2);

    // minimap content
    enemies.forEach(a => {
      sketch.strokeWeight(0.002 * a.size * [1, 2.5, 2.5][a.type]);
      sketch.stroke(["rgb(200,50,0)", "rgb(50,200,0)", "rgb(0,50,200)"][a.type]);
      sketch.point(a.pos.x / currentLevel.size, a.pos.y / currentLevel.size);
    });
    sketch.strokeWeight(0.05);
    sketch.stroke(255);
    sketch.point(player.pos.x / currentLevel.size, player.pos.y / currentLevel.size);
    sketch.pop();

    // enemies left text
    sketch.push();
    sketch.textFont("monospace");
    sketch.noStroke();
    sketch.textSize(20);
    sketch.fill(255);
    sketch.textAlign("right", "bottom");
    let xPos = size.x - 50;
    sketch.text(Math.round(fps), xPos, 40);
    sketch.text(player.kills, xPos, 70);
    sketch.text(enemies.length, xPos, 100);
    sketch.text(player.score, xPos, 130);
    sketch.textAlign("left", "bottom");
    sketch.text("💀", xPos + 5, 70);
    sketch.text("⚔️", xPos + 5, 100);
    sketch.text("🌟", xPos + 5, 130);
    sketch.textSize(15);
    sketch.text("fps", xPos + 5, 40);
    sketch.pop();

    // time
    sketch.textAlign("center", "top");
    sketch.textFont("monospace");
    sketch.fill(255);
    sketch.noStroke();
    sketch.textSize(35);
    sketch.text(formatTime(time), size.x / 2, 10);

    // cursor
    sketch.push();
    sketch.stroke(255);
    sketch.strokeWeight(5);
    sketch.translate(size.x / 2 + mouse.x, size.y / 2 + mouse.y);
    sketch.scale(0.7);

    let d1 = 14 - cursorContract * 3;
    let d2 = 8 - cursorContract * 2;
    sketch.line(d1, 0, d2, 0);
    sketch.line(0, d1, 0, d2);
    sketch.line(-d1, 0, -d2, 0);
    sketch.line(0, -d1, 0, -d2);

    d1 = 20;
    d2 = 10;
    sketch.line(-d1, -d2, -d2, -d1);
    sketch.line(d2, -d1, d1, -d2);
    sketch.line(d1, d2, d2, d1);
    sketch.line(-d2, d1, -d1, d2);
    sketch.pop();

    // health, xp, shield
    bar(new Vector(25, 35), 100, player.hp / player.maxHp, "rgb(50,0,0)", "rgb(250,50,0)", 15);
    bar(new Vector(25, 55), 100, player.xp / player.levelUp, "rgb(40,30,0)", "rgb(220,200,0)", 15);
    bar(new Vector(25, 25), 100, player.shield / player.maxShield, "rgb(0,40,60)", "rgb(0,150,250)", 5);
  }
}

// ********************  functions  ******************** //
export function addWeapon(id) {
  let weapon = weapons.find(e => e.id == id);
  weapon.givePlayer();
}
export function calcBorder(obj) {
  let vec = Vector.zero;
  if (obj.pos.x > currentLevel.size) {
    d = obj.pos.x - currentLevel.size;
    vec["+="](-d, 0);
  }
  if (obj.pos.x < -currentLevel.size) {
    d = -obj.pos.x - currentLevel.size;
    vec["+="](d, 0);
  }
  if (obj.pos.y > currentLevel.size) {
    d = obj.pos.y - currentLevel.size;
    vec["+="](0, -d);
  }
  if (obj.pos.y < -currentLevel.size) {
    d = -obj.pos.y - currentLevel.size;
    vec["+="](0, d);
  }
  return vec;
}

async function die() {
  paused = true;
  rumble(1, 1);
  explode(player.pos, 100);

  document.getElementById("score").innerText = player.score;
  document.getElementById("scores").innerHTML = "<p> <b> Loading... </b> </p>";
  document.getElementById("stats").innerHTML = "<p> <b> Loading... </b> </p>";
  if (signedIn) {
    document.getElementById("signInDiv").innerHTML = `<p> <b> Signed in as ${user.name} </b> </p> <button id="signOutBtn"> Sign out </button>`;
    setTimeout(() => {
      document.getElementById("signOutBtn").addEventListener("click", () => {
        signOut();
        die();
      });
    }, 100);
    if (!posted) {
      await postFeed({
        type: "death",
        data: {
          score: player.score,
          time: Math.round(time),
          dev: devMode
        },
        user: user.id
      });

      if (player.score > 150 && time > 10) {
        await postScore(player.score, Math.round(time), devMode, version);
      }

      if (!devMode) await updateStats({ score: player.score, level: player.level, kills: player.kills, time: Math.floor(time) });

      posted = true;
    }

    document.getElementById("stats").innerHTML = `
      <p> <b> Deaths: </b> ${user.deaths} </p>
      <p> <b> Total score: </b> ${user.score} </p>
      <p> <b> Total levelups: </b> ${user.levelups} </p>
      <p> <b> Total kills: </b> ${user.kills} </p>
      <p> <b> Highscore: </b> ${user.highscore} </p>
      <p> <b> Highest time: </b> ${formatTime(user.highestTime)} </p>
    `;
  } else {
    document.getElementById("signInDiv").innerHTML = `<p> <b> Sign in to save score </b> </p> <button id="signInBtn"> Sign in </button> <!-- <button id="signInWithGoogleButton"> Sign in with Google </button> -->`;
    document.getElementById("stats").innerHTML = "<p> <b> Sign in to see stats </b> </p>";
    // await new Promise(setTimout(()=>{}, 1000));
    setTimeout(() => {
      document.getElementById("signInBtn").addEventListener("click", async () => {
        let res = await signIn();
        if (res) {
          die();
        } else {
          document.getElementById("signInDiv").querySelector("b").innerText = "Sign in failed";
        }
      });
      // document.getElementById("signInWithGoogleButton").addEventListener("click", async () => await signInWithGoogle());
    }, 100);
  }

  let page = 1;
  const scores = await getScores(page);

  const scoresContainer = document.getElementById("scores");
  scoresContainer.innerHTML = "";

  const appendScore = (score, index, offset = "") => {
    const scoreContainer = document.createElement("p");
    const scoreIndex = document.createTextNode(`${index + 1 + offset} `);
    const scoreAuthorName = document.createElement("b");

    scoreAuthorName.textContent = score.expand.user.name;

    const scoreText = document.createTextNode(` - ${score.score} ${score.version ? ` (${score.version})` : ""} (${score.time > 0 ? formatTime(score.time) : "no time"})`);

    scoreContainer.append(scoreIndex, scoreAuthorName, scoreText);
    scoresContainer.appendChild(scoreContainer);
  }

  scores.forEach((score, index) => appendScore(score, index));

  let loadingScores = false;
  const gameOverElement = document.getElementById("gameOver");

  const loadMoreScores = async () => {
    if (!loadingScores && gameOverElement.scrollTop + gameOverElement.clientHeight >= gameOverElement.scrollHeight - 10) {
      loadingScores = true;
      page++;

      const newScores = await getScores(page);
      if (newScores.length > 0) {
        newScores.forEach((score, index) => appendScore(score, index, (page - 1) * 10));
      } else {
        gameOverElement.removeEventListener("scroll", loadMoreScores);
      }

      loadingScores = false;
    }
  }
  
  gameOverElement.addEventListener("scroll", loadMoreScores);
}



export function applyBorder(obj) {
  if (obj == player) damagePlayer(calcBorder(obj).mag * clampTime * 0.15);
  obj.vel["+="]((calcBorder(obj))["*"](0.1));
}
export function getRandomBox(size) {
  let d = Math.floor(Math.random() * 4);
  switch (d) {
    case 0: // right
      return new Vector(size, Math.random() * size * 2 - size);
    case 1: // left
      return new Vector(-size, Math.random() * size * 2 - size);
    case 2: // bottom
      return new Vector(Math.random() * size * 2 - size, size);
    case 3: // top
      return new Vector(Math.random() * size * 2 - size, -size);
  }
}
export function formatTime(time = 0) {
  let sec = Math.floor(time);
  let min = Math.floor(time / 60);
  sec -= min * 60;
  let hr = Math.floor(time / 3600);
  min -= hr * 60;
  sec = sec.toString();
  if (sec.length < 2) sec = "0" + sec;
  if (hr > 0 && min.length < 2) min = "0" + min;
  return `${hr > 0 ? hr + ":" : ""}${min}:${sec}`;
}
export function getOnScreen(pos, rad) {
  if (pos.x - cam.x > size.x / 2 + rad) return false;
  if (pos.x - cam.x < -size.x / 2 - rad) return false;
  if (pos.y - cam.y > size.y / 2 + rad) return false;
  if (pos.y - cam.y < -size.y / 2 - rad) return false;
  return true;
}
function bar(p, w, val, bgCol, col, s) {
  sketch.noStroke();
  sketch.fill(bgCol);
  sketch.rect(p.x, p.y, w, s, 5);
  sketch.fill(col);
  sketch.rect(p.x, p.y, w * val, s, 5);
}
export function set(prop, val) {
  // window[prop] = val;
  switch (prop) {
    case "screenshake": return screenshake = val;
    case "cursorContract": return cursorContract = val;
  }
}
export function get(prop) {
  // return window[prop];
  switch (prop) {
    case "screenshake": return screenshake;
    case "cursorContract": return cursorContract;
  }
}
export function damagePlayer(amt) {
  if (amt <= 0) return;
  player.shieldRegenTimeLeft = 0;
  if (player.shield > amt) {
    rumble(0.15, 0.35);
    player.shield -= amt;
    return;
  }
  amt -= player.shield;
  player.shield = 0;
  player.hp -= amt;
  if (player.hp > 0) {
    rumble(0.2, 0.5);
  }
}

export function getVersion(v) {
  v = v.slice(1);
  return v.split(".").map(e => parseInt(e));
}

// ********************  event listeners  ******************** //
[...document.querySelectorAll(".noClose")].forEach(elem => {
  elem.addEventListener("cancel", ev => ev.preventDefault());
});

document.addEventListener("keydown", (key) => setKey(key, true));
document.addEventListener("keyup", (key) => setKey(key, false));
document.addEventListener("mousedown", () => mouseDown = true);
document.addEventListener("mouseup", () => mouseDown = false);
document.addEventListener("click", () => mouseDown = false);
document.addEventListener("mousemove", (e) => {
  mouse = new Vector(e.clientX, e.clientY);
  mouse["-="]((size)["/"](2));
});

document.getElementById("restart").addEventListener("click", restart);
document.getElementById("quit").addEventListener("click", () => {
  player.hp = 0;
  unpause();
});

document.getElementById("pause").addEventListener("cancel", unpause);
document.getElementById("resume").addEventListener("click", unpause);

function pause() {
  if (!paused) {
    setTimeout(() => {
      document.getElementById("pause").showModal();
      sketch.noLoop();
      paused = true;
      document.getElementById("currentUpgrades").innerHTML = [
        `<p> Player Upgrades </p> <div> ${playerUpgrades.map(e => `<p> ${e.name} <span> ${e.times}/${e.max} </span> </p>`).join("")} </div>`,
        ...player.weapons.map(w => `<p> ${w.name} </p> <div>  ${w.upgrades.map(e => `<p> ${e.name} <span> ${e.times}/${e.max} </span> </p>`).join("")} </div>`).join("")
      ].join("");
    }, 100);
  }
}
function unpause() {
  if (paused) {
    sketch.loop();
    document.getElementById("pause").close();
    paused = false;
  }
}
function restart() {
  unpause();
  stopGame();
  startGame(0);
  document.getElementById("gameOver").close();
}

addEventListener("resize", () => { size["="](innerWidth, innerHeight); sketch.resizeCanvas(size.x, size.y) });
addEventListener("blur", pause);

function setKey(ev, val) {
  keys[ev.key] = val;

  //extra keybinds
  if (ev.key == "z" && val) {
    settings.toggleFire = !settings.toggleFire
  }

  if (ev.key == "Escape" && val && !paused) {
    pause();
  }

  if (val && devMode) {
    const mousePos = new Vector(mouse.x + player.pos.x, player.pos.y + mouse.y);
    switch (ev.key) {
      case "x":
        enemies.forEach(e => e.hp = 0);
        break;

      case "c":
        enemies.forEach(e => {
          e.pos.x = mousePos.x
          e.pos.y = mousePos.y
        });
        break;

      case "v":
        player.pos.x = mousePos.x
        player.pos.y = mousePos.y
        break;
      case "P":
        if (paused) unpause();
        if (document.head.querySelector("script[src='https://cdn.jsdelivr.net/npm/eruda']")) break;

        const erudaScript = document.createElement("script");
        erudaScript.src = "https://cdn.jsdelivr.net/npm/eruda";
        document.head.appendChild(erudaScript);
        erudaScript.onload = () => eruda.init();
      case "b":
        settings.emojiMovie = !settings.emojiMovie;
        break;
      default:
        if ("1234567890".split("").includes(ev.key)) {
          if (enemyTypes[parseInt(ev.key)]) new enemyTypes[parseInt(ev.key)]({ mode: 0, index: 0, max: 1, pos: mousePos, vel: new Vector(10 + Math.random() * 30, 0).rotate(Math.random() * 2 * Math.PI), size: 60 });

        }
        break;
    }
  }
}

export function onGamepadButton(button, val) {
  if (button == "rightPause" && val) {
    if (paused) unpause();
    else pause();
  }

  if (button == "dpadUp" && val) {
    let btns = [...document.querySelector("dialog[open]").querySelectorAll("button")];
    let activeI = btns.indexOf(document.activeElement);
    if (activeI == -1) activeI = 0;
    else {
      activeI--;
      if (activeI < 0) {
        activeI = btns.length - 1;
      }
    }
    btns[activeI].focus();
  }
  if (button == "dpadDown" && val) {
    let btns = [...document.querySelector("dialog[open]").querySelectorAll("button")];
    let activeI = btns.indexOf(document.activeElement);
    if (activeI == -1) activeI = 0;
    else {
      activeI++;
      if (activeI > btns.length - 1) {
        activeI = 0;
      }
    }
    btns[activeI].focus();
  }
  if (button == "bottom" && val) {
    document.activeElement.click();
  }

  if (button == "rightBumper" && val) {
    settings.toggleFire = !settings.toggleFire;
  }
}

requestAnimationFrame(updateGamepad);