import { Vector } from "../vector-library/vector";
import { player, keys, mouseDown, settings, projectiles, calcBorder, sketch, clampTime, get, set } from "./main";
import projectileTypes from "./projectile-types";

class Weapon {
  constructor(data) {
    this.name = data.name;
    this.id = data.id;
    this.props = data.props;
    this.tick = data.tick;
    this.projectileTick = data.projectileTick;
    this.drawTick = data.drawTick;
    this.enemyTick = data.enemyTick;
    this.upgrades = data.upgrades;
  }

  givePlayer() {
    let w = this;
    for (let prop in w.props) {
      w[prop] = w.props[prop];
    }

    delete w.props;
    w.upgrades.forEach(e => {
      e.times = 0;
    });
    player.weapons.push(w);
  }
}

const weapons = [
  new Weapon({
    name: "Gun",
    id: "gun",
    props: {
      reload: 0,
      fireRate: 5,
      damage: 1,
      speed: 500,
      multishot: 1,
      spread: 0.1
    },
    upgrades: [
      { name: "Damage", desc: "Damage up", func: (w) => { w.damage *= 1.35 }, max: 5, weight: 1 },
      { name: "Fire Rate", desc: "Shoot faster", func: (w) => { w.fireRate *= 1.25 }, max: 5, weight: 1 },
      { name: "Projectile Speed", desc: "Bullets move faster", func: (w) => { w.speed *= 1.3 }, max: 3, weight: 1 },
      { name: "Multishot", desc: "Shoot more bullets", func: (w) => { w.multishot++ }, max: 5, weight: 0.2 }
      // { name: "", desc: "", func: (w) => { }, max: 0, weight: 0 }
    ],
    tick: (weapon) => {
      let contract = get("cursorContract") || 0;
      let pow = 1 - Math.pow(1e-6, clampTime);
      if ((keys[" "] || mouseDown) != settings.toggleFire) { // either but not both
        contract += (1 - contract) * pow;
        if (weapon.reload <= 0) {
          weapon.reload = 1 / weapon.fireRate;
          for (let i = 0; i < weapon.multishot; i++) {
            new projectileTypes[0]({ pos: player.pos.copy, dir: player.dir + weapon.spread * (i - (weapon.multishot - 1) / 2), damage: weapon.damage, speed: weapon.speed });
          }
        }
      } else {
        contract -= contract * pow;
      }
      set("cursorContract", contract);
      weapon.reload -= clampTime;
    }
  })
];
export default weapons;