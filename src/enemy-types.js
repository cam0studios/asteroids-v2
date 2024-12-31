import Vector from "../vector-library/vector";
import { rumble } from "./gamepad";
import { enemies, clampTime, applyBorder, projectiles, player, getOnScreen, sketch, get, set, settings, damagePlayer, currentLevel, getRandomBox, calcBorder } from "./main";
import projectileTypes, { explode, projectileEnums } from "./projectile-types";
import { playSound } from './sound';

const enemyTypes = [
  class {
    //asteroid
    constructor({ mode, pos, vel, size, spawn, hp, speed }) {
      if (mode == 0) {
        if (pos == undefined) pos = getPosAroundPlayer();
        if (speed == undefined) speed = 10 + Math.random() * 30;
        if (vel == undefined) vel = new Vector(speed, 0).rotate(Math.random() * 2 * Math.PI);
        if (spawn == undefined) spawn = false;
      } else if (mode == 1) {
        if (pos == undefined) pos = getRandomBox(currentLevel.size);
        if (speed == undefined) speed = 10 + Math.random() * 30;
        if (vel == undefined) vel = new Vector(speed, 0).rotate(Math.random() * 2 * Math.PI);
        if (spawn == undefined) spawn = true;
      }
      if (hp == undefined) hp = size > 30 ? 5 : size > 15 ? 3 : size > 10 ? 2 : 1;
      this.pos = pos.copy;
      this.vel = vel.copy;
      this.size = size;
      this.hp = hp;
      this.maxHp = hp;
      this.hitDir = Math.random() * 2 * Math.PI;
      this.time = 0;
      this.spawn = spawn;
      this.type = 0;
      this.id = Math.floor(Math.random() * 1e6);
      this.effectTime = 0;
      enemies.push(this);
    }
    tick(i) {
      this.time += clampTime;

      if (this.burning) {
        this.hp -= (this.maxHp / 20 + 0.2) * clampTime;
      }

      this.effectTime -= clampTime;
      if (this.effectTime <= 0) {
        this.frozen = false;
        this.burning = false;
      }

      if (this.time > 1 || !this.spawn) {
        if (!this.frozen) {
          this.pos["+="]((this.vel)["*"](clampTime));
        }

        applyBorder(this);
        

        projectiles.forEach((p, pI) => {
          p.enemyTick(pI, this, i);
        });
        
        let dif = (this.pos)["-"](player.pos);
        if (dif.mag < this.size + 25 && player.dodge.time <= 0 && !this.frozen) {
          let hitStr = (player.vel)["-"](this.vel).mag;
          this.hp--;
          this.pos["-="](player.pos);
          this.pos.mag = this.size + 30;
          this.pos["+="](player.pos);
          let d = dif.copy;
          d.mag = hitStr;
          this.vel["+="](d);
          player.vel["-="](d);
          this.hitDir = dif.heading;

          damagePlayer((this.size > 10 ? 25 : 15) * (hitStr / 250 + 0.5));
        }
        if (this.hp <= 0) {
          enemies.splice(i, 1);
          i--;
          player.kills++;
          playSound("kill")
          if (this.size > 10) {
            for (let r = -1; r <= 1; r += 1) {
              new enemyTypes[0]({ pos: this.pos, vel: (this.vel)["+"](new Vector(50, 0).rotate(this.hitDir + r)), size: this.size * 2 / 3, mode: 0 });
            }
          }
          let newScreenshake = (this.size > 20 ? 12 : 7) / ((this.pos)["-"](player.pos).mag / 500 + 1);
          if (get("screenshake") < newScreenshake) {
            set("screenshake", newScreenshake);
          } else {
            set("screenshake", get("screenshake") + newScreenshake / 5);
          }
          player.xp += this.size > 15 ? 5 : 3;
          player.score += this.size > 15 ? 5 : this.size > 10 ? 3 : 1;
          rumble(this.size > 15 ? 0.15 : this.size > 10 ? 0.1 : 0.05, this.size > 15 ? 0.5 : this.size > 10 ? 0.4 : 0.3);
          explode(this.pos, this.size > 15 ? 30 : this.size > 10 ? 20 : 10);
        }
      }
    }
    beforeDraw() {
      if (getOnScreen(this.pos, this.size)) {
        if (this.time > 1 || !this.spawn) {
          if (settings.emojiMovie) {

          } else {

          }
        } else {
          sketch.fill(`rgba(150,50,0,${this.time * 0.5})`);
          sketch.stroke(`rgba(200,50,0,${this.time * 1})`);
          sketch.strokeWeight(5);
          let s = this.size * 2;
          sketch.ellipse(this.pos.x, this.pos.y, s, s);
        }
      }
    }
    afterDraw() {
      if (getOnScreen(this.pos, this.size)) {
        if (this.time > 1 || !this.spawn) {
          if (settings.emojiMovie) {
            sketch.push();
            sketch.textAlign("center", "center");
            sketch.textSize(this.size * 2);
            sketch.translate(this.pos.x, this.pos.y);
            sketch.rotate(this.vel.heading);
            sketch.text("⭐", 0, 0);
            sketch.pop();
          } else {
            sketch.fill(0);
            sketch.stroke(255);

            if (this.frozen) sketch.stroke(35, 178, 246)
            if (this.burning) sketch.stroke(230, 102, 72)

            sketch.strokeWeight(5);
            sketch.ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
          }
        } else {

        }
      }
    }
  },
  //turret
  class {
    constructor({ mode, pos, vel, spawn, hp, index, max }) {
      if (mode == 0) {
        if (pos == undefined) pos = getPosAroundPlayer();
        if (vel == undefined) vel = new Vector(10 + Math.random() * 30, 0).rotate(Math.random() * 2 * Math.PI);
        if (spawn == undefined) spawn = false;
      } else if (mode == 1) {
        if (pos == undefined) pos = getRandomBox(currentLevel.size);
        if (vel == undefined) vel = new Vector(10 + Math.random() * e.speed, 0).rotate(Math.random() * 2 * Math.PI);
        if (spawn == undefined) spawn = true;
      }
      if (hp == undefined) hp = 15;
      this.pos = pos.copy;
      this.vel = vel.copy;
      this.size = 20;
      this.hp = hp;
      this.maxHp = hp;
      this.hitDir = Math.random() * 2 * Math.PI;
      this.time = 0;
      this.reloadTime = 5;
      this.cooldown = 0;
      this.cooldownTime = 1.3;
      this.reload = ((index + (Math.random() - 0.5) * 0.5) * 2 + 1) / (max * 2) * (this.reloadTime + this.cooldownTime); // evenly spaced shots
      this.spawn = spawn;
      this.type = 1;
      this.dir = 0;
      this.aiming = Vector.zero;
      this.id = Math.floor(Math.random() * 1e6 + 1e6);
      enemies.push(this);
    }
    tick(i) {
      this.time += clampTime;

      if (this.burning) {
        this.hp -= this.maxHp / 20 * clampTime;
      }

      this.effectTime -= clampTime;
      if (this.effectTime <= 0) {
        this.frozen = false;
        this.burning = false;
      }

      if (this.time > 1 || !this.spawn) {
        projectiles.forEach((p, pI) => {
          p.enemyTick(pI, this, i);
        });


        let dif = (this.pos)["-"](player.pos);

        if (dif.mag < this.size + 25 && player.dodge.time <= 0 && !this.frozen) {
          let hitStr = (player.vel)["-"](this.vel).mag;
          this.hp--;
          this.pos["-="](player.pos);
          this.pos.mag = this.size + 30;
          this.pos["+="](player.pos);
          let d = dif.copy;
          d.mag = hitStr;
          this.vel["+="](d);
          player.vel["-="](d);
          this.hitDir = dif.heading;
          damagePlayer((this.size > 10 ? 25 : 15) * (hitStr / 250 + 0.5));
        }

        if (this.cooldown > 0) {
          this.cooldown -= clampTime;
        } else if (this.pos["-"](player.pos).mag < 1000 && !this.frozen) {
          this.reload -= clampTime;
          let d = (player.pos)["-"](this.pos);
          d["+="]((player.vel)["*"](0.7));
          d.mag = 1;
          this.aiming["*="](Math.pow(1e-3, clampTime));
          this.aiming["+="](d);
          this.dir = this.aiming.heading;
          if (this.reload <= 0) {
            this.reload = this.reloadTime;
            this.cooldown = this.cooldownTime;
            new projectileTypes[projectileEnums.enemyLaser]({ pos: this.pos.copy, dir: this.dir, link: this.id });
          }
        }

        if (this.hp <= 0) {
          enemies.splice(i, 1);
          playSound("kill")
          i--;
          player.kills++;
          let newScreenshake = 50 / ((this.pos)["-"](player.pos).mag / 500 + 1);
          if (get("screenshake") < newScreenshake) {
            set("screenshake", newScreenshake);
          } else {
            set("screenshake", get("screenshake") + newScreenshake / 5);
          }
          player.xp += 20;
          player.score += 20;
          rumble(0.2, 0.7);
          explode(this.pos, 60);
        }
      }
    }
    beforeDraw() {
      if (getOnScreen(this.pos, this.size)) {
        if (this.time > 1 || !this.spawn) {
          if (settings.emojiMovie) {

          } else {
            sketch.translate(this.pos.x, this.pos.y);
            sketch.rectMode("center");
            sketch.fill(0);
            sketch.stroke(255);
            sketch.strokeWeight(5);

            if (this.frozen) sketch.stroke(35, 178, 246)
            if (this.burning) sketch.stroke(230, 102, 72)

            sketch.line(-this.size, -this.size, this.size, this.size);
            sketch.line(-this.size, this.size, this.size, -this.size);
            sketch.rect(0, 0, this.size * 1.5, this.size * 1.5);
          }
        } else {
          sketch.fill(`rgba(150,50,0,${this.time * 0.5})`);
          sketch.stroke(`rgba(200,50,0,${this.time * 1})`);
          sketch.strokeWeight(5);
          let s = this.size * 2;
          sketch.ellipse(this.pos.x, this.pos.y, s, s);
        }
      }
    }
    afterDraw() {
      if (getOnScreen(this.pos, this.size)) {
        if (this.time > 1 || !this.spawn) {
          if (settings.emojiMovie) {
            sketch.push();
            sketch.textAlign("center", "center");
            sketch.textSize(this.size * 2);
            sketch.translate(this.pos.x, this.pos.y);
            sketch.rotate(this.vel.heading);
            sketch.text(">", 0, 0);
            sketch.pop();
          } else {
            sketch.translate(this.pos.x, this.pos.y);
            sketch.rotate(this.dir);
            sketch.rectMode("center");
            sketch.fill(0);
            sketch.stroke(190);
            sketch.strokeWeight(5);
            let d = 0;
            let prog = 1 - this.reload / this.reloadTime;
            let time = 0.2;
            if (this.cooldown > 0) {
              d = 0.35;
            } else {
              if (this.reloadTime - this.reload > time) {
                d = 0.2 + (prog / (1 - time) - time) * 0.15;
              } else {
                d = 0.35 - (this.reloadTime - this.reload) / time * 0.15;
              }
            }
            sketch.line(0, -this.size * d, this.size * 1, -this.size * d);
            sketch.line(0, this.size * d, this.size * 1, this.size * d);
            sketch.rect(-this.size * 0.3, 0, this.size * 0.8, this.size * 1.2);
          }
        } else {

        }
      }
    }
  },
  //boss
  class {
    constructor({ mode, pos, vel, spawn, hp, speed }) {
      if (mode == 0) {
        if (pos == undefined) pos = getPosAroundPlayer();
        if (speed == undefined) speed = 10 + Math.random() * 30;
        if (vel == undefined) vel = new Vector(speed, 0).rotate(Math.random() * 2 * Math.PI);
        if (spawn == undefined) spawn = false;
      } else if (mode == 1) {
        if (pos == undefined) pos = getRandomBox(currentLevel.size);
        if (speed == undefined) speed = 10 + Math.random() * 30;
        if (vel == undefined) vel = new Vector(speed, 0).rotate(Math.random() * 2 * Math.PI);
        if (spawn == undefined) spawn = true;
      }
      if (hp == undefined) hp = 30;

      this.pos = pos.copy;
      this.vel = vel.copy;
      this.type = 2;
      this.size = 50;
      this.hp = hp;
      this.maxHp = hp;
      this.hitDir = Math.random() * 2 * Math.PI;
      this.time = 0;
      this.id = Math.floor(Math.random() * 1e6 + 2e6);
      enemies.push(this);

      this.children = [];
      for (let i = 0; i < Math.round(this.hp / 10); i++) {
        this.children.push(new enemyTypes[1]({ mode, pos: this.pos.copy, vel: new Vector(0, 0), hp: 15, index: i, max: Math.round(this.hp / 10) }));
      }

    }
    tick(i) {
      this.time += clampTime;
      
      if (this.burning) {
        this.hp -= this.maxHp / 20 * clampTime;
      }

      this.effectTime -= clampTime * 3;
      if (this.effectTime <= 0) {
        this.frozen = false;
        this.burning = false;
      }
      
      if (!this.frozen) {
        this.children.forEach((child, childIndex) => {
          child.pos = this.pos.copy;

          let multiplicationVector = new Vector(2, 0).rotate(((2 * Math.PI) / this.children.length) * childIndex + new Date().getTime() / 1000);
          multiplicationVector.mag = 100;
          child.pos = child.pos["+="](multiplicationVector);
        })

        if (this.time > 1 || !this.spawn) {
          this.pos["+="]((this.vel)["*"](clampTime));
          applyBorder(this);
          projectiles.forEach((p, pI) => {
            p.enemyTick(pI, this, i);
          });
          let dif = (this.pos)["-"](player.pos);
          if (dif.mag < this.size + 25 && player.dodge.time <= 0) {
            let hitStr = (player.vel)["-"](this.vel).mag;
            this.hp--;
            this.pos["-="](player.pos);
            this.pos.mag = this.size + 30;
            this.pos["+="](player.pos);
            let d = dif.copy;
            d.mag = hitStr;
            this.vel["+="](d);
            player.vel["-="](d);
            this.hitDir = dif.heading;
            damagePlayer((this.size > 10 ? 25 : 15) * (hitStr / 250 + 0.5));
          }
          if (this.hp <= 0) {
            enemies.splice(i, 1);
            i--;
            player.kills++;
            playSound("kill")
            if (this.size > 10) {
              for (let r = -1; r <= 1; r += 1) {
                new enemyTypes[0]({ pos: this.pos, vel: (this.vel)["+"](new Vector(50, 0).rotate(this.hitDir + r)), size: this.size * 2 / 3, mode: 0 });
              }
            }
            let newScreenshake = (this.size > 20 ? 12 : 7) / ((this.pos)["-"](player.pos).mag / 500 + 1);
            if (get("screenshake") < newScreenshake) {
              set("screenshake", newScreenshake);
            } else {
              set("screenshake", get("screenshake") + newScreenshake / 5);
            }
            player.xp += this.size > 15 ? 5 : 3;
            player.score += this.size > 15 ? 5 : this.size > 10 ? 3 : 1;
  
            this.children.map(child => child.hp = 0)
            rumble(this.size > 15 ? 0.15 : this.size > 10 ? 0.1 : 0.05, this.size > 15 ? 0.5 : this.size > 10 ? 0.4 : 0.3);
            explode(this.pos, this.size > 15 ? 30 : this.size > 10 ? 20 : 10);
          }
        }
      }
    }

    beforeDraw(i) {
      if (getOnScreen(this.pos, this.size)) {
        if (this.time > 1 || !this.spawn) {
          if (settings.emojiMovie) {

          } else {

          }
        } else {
          sketch.fill(`rgba(150,50,0,${this.time * 0.5})`);
          sketch.stroke(`rgba(200,50,0,${this.time * 1})`);
          sketch.strokeWeight(5);
          let s = this.size * 2;
          sketch.ellipse(this.pos.x, this.pos.y, s, s);
        }
      }
    }
    afterDraw(i) {

      if (getOnScreen(this.pos, this.size)) {
        if (this.time > 1 || !this.spawn) {
          if (settings.emojiMovie) {
            sketch.push();
            sketch.textAlign("center", "center");
            sketch.textSize(this.size * 2);
            sketch.translate(this.pos.x, this.pos.y);
            sketch.rotate(this.vel.heading);
            sketch.text("⭐", 0, 0);
            sketch.pop();
          } else {
            sketch.fill("rgb(70, 10, 0)");
            sketch.stroke("rgb(250, 100, 100)");
            sketch.strokeWeight(5);

            if (this.frozen) {
              sketch.stroke(35, 178, 246)
              sketch.fill(15, 118, 186)
            }

            if (this.burning) {
              sketch.stroke(230, 102, 72)
              sketch.fill(200, 72, 32)
            }

            sketch.ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
          }
        } else {

        }
      }
    }
  }
];

export default enemyTypes;

function getPosAroundPlayer() {
  let pos = (player.pos)["+"](new Vector(300 + currentLevel.size * 1.41 * Math.random() ** 0.7, 0).rotate(Math.random() * 2 * Math.PI));
  if (calcBorder({ pos }).mag > 0) {
    return getPosAroundPlayer();
  }
  return pos;
}