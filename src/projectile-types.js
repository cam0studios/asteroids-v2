import { Vector } from "../vector-library/vector";
import { projectiles, clampTime, calcBorder, sketch, settings, damagePlayer } from "./main";

const projectileTypes = [
  class {
    constructor(data) {
      this.pos = data.pos;
      this.dir = data.dir;
      this.damage = data.damage;
      this.speed = data.speed;
      projectiles.push(this);
    }

    tick(i) {
      this.pos["+="](new Vector(this.speed * clampTime, 0).rotate(this.dir));

      if (calcBorder(this).mag > 100) {
        projectiles.splice(i, 1);
        i--;
      }
    }

    draw() {
      let lastPos = this.pos.copy;
      lastPos["+="](new Vector(20, 0).rotate(this.dir));


      sketch.stroke(255);
      sketch.strokeWeight(5);
      sketch.fill(0);
      if (settings.emojiMovie) {
        sketch.textAlign(sketch.CENTER, sketch.CENTER);
        sketch.textSize(10);
        sketch.text("⚪", this.pos.x, this.pos.y)
      } else {
        sketch.line(this.pos.x, this.pos.y, lastPos.x, lastPos.y);
      }
    }

    enemyTick(i, enemy, enemyI) {
      if ((this.pos)["-"](enemy.pos).mag < enemy.size + 10) {
        enemy.hp -= this.damage;
        enemy.hitDir = this.dir;
        projectiles.splice(i, 1);
        i--;
      }
    }
  },
  class {
    constructor(data) {
      this.pos = data.pos;
      this.size = data.size;
      this.maxSize = data.maxSize;
      projectiles.push(this);
    }

    tick(i) {
      if (this.size > this.maxSize) {
        projectiles.splice(i, 1);
        i--;
      } else {
        this.size += clampTime * 30 * Math.sqrt(this.maxSize);
      }
    }

    draw() {
      if (settings.emojiMovie) {
        sketch.textAlign(sketch.CENTER, sketch.CENTER);
        sketch.textSize(10);
        sketch.noStroke();
        sketch.fill(255);
        sketch.text("", this.pos.x, this.pos.y);
      } else {
        sketch.fill(250);
        sketch.stroke(200);
        sketch.strokeWeight(this.maxSize * 0.5);
        sketch.ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
      }
    }

    enemyTick(i, enemy, enemyI) {

    }
  }
];

export default projectileTypes;

export function explode(pos, size) {
  new projectileTypes[1]({
    pos,
    size: 0,
    maxSize: size
  });
}