import { Vector } from "../vector-library/vector";
import { enemies, clampTime, applyBorder, projectiles, player, getOnScreen, sketch, get, set, settings, damagePlayer } from "./main";

const enemyTypes = [
  class {
    constructor(pos, vel, size, spawn = true, hp = size > 15 ? 3 : size > 10 ? 2 : 1) {
      this.pos = pos.copy;
      this.vel = vel.copy;
      this.size = size;
      this.hp = hp;
      this.hitDir = Math.random() * 2 * Math.PI;
      this.time = 0;
      this.spawn = spawn;
      enemies.push(this);
    }
    tick(i) {
      this.time += clampTime;
      if (this.time > 1 || !this.spawn) {
        this.pos["+="]((this.vel)["*"](clampTime));
        applyBorder(this);
        projectiles.forEach((p, pI) => {
          p.enemyTick(pI, this, i);
        });
        let dif = (this.pos)["-"](player.pos);
        if (dif.mag < this.size + 25) {
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
          if (this.size > 10) {
            for (let r = -1; r <= 1; r += 1) {
              new enemyTypes[0](this.pos, (this.vel)["+"](new Vector(50, 0).rotate(this.hitDir + r)), this.size * 2 / 3, false);
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
        }
      }
    }
    drawTick() {
      if (getOnScreen(this.pos, this.size)) {
        if (this.time > 1 || !this.spawn) {
          if (settings.emojiMovie) {
            sketch.push();
            sketch.textAlign(sketch.CENTER, sketch.CENTER);
            sketch.textSize(this.size * 2);
            sketch.translate(this.pos.x, this.pos.y);
            sketch.rotate(this.vel.heading);
            sketch.text("⭐", 0, 0);
            sketch.pop();
          } else {
            sketch.fill(0);
            sketch.stroke(255);
            sketch.strokeWeight(5);
            sketch.ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
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
  }
];

export default enemyTypes;