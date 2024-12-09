import { Vector } from "p5";
import { gamepad } from "./gamepad";
import { player, mouseDown, settings, clampTime, get, set } from "./main";
import projectileTypes, { projectileEnums } from "./projectile-types";

/**
 * Represents a weapon.
 * @class
 */
class Weapon {
  /**
   * Creates an instance of Weapon.
   * @param {Object} data - The data for the weapon.
   * @param {string} data.name - The name of the weapon.
   * @param {number} data.id - The ID of the weapon.
   * @param {Function} data.tick - The tick function for the weapon.
   * 
   * @param {Object} data.props - The properties of the weapon.
   * @param {number} data.props.reload - The reload time of the weapon.
   * @param {number} data.props.fireRate - The fire rate of the weapon.
   * @param {number} data.props.damage - The damage of the weapon.
   * @param {number} data.props.speed - The speed of the weapon.
   * @param {number} data.props.amount - The amount of projectiles to shoot.
   * 
   * @param {Object[]} data.upgrades - The upgrades available for the weapon.
   * @param {string} data.upgrades[].name - The name of the upgrade.
   * @param {string} data.upgrades[].desc - The description of the upgrade.
   * @param {Function} data.upgrades[].func - Function to run on getting upgrade.
   * @param {number} data.upgrades[].max - The maximum level of the upgrade.
   * @param {number} data.upgrades[].weight [reload] - The weight of the upgrade.
   */
  constructor(data) {
    this.name = data.name;
    this.id = data.id;
    this.props = data.props;
    this.tick = data.tick;
    this.upgrades = data.upgrades;
  }

  givePlayer() {
    let w = { ...this };
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
      amount: 1,
      spread: 0.1
    },
    upgrades: [
      { name: "Damage", desc: "Damage up", func: (w) => { w.damage *= 1.35 }, max: 5, weight: 1 },
      { name: "Fire Rate", desc: "Shoot faster", func: (w) => { w.fireRate *= 1.25 }, max: 5, weight: 1 },
      { name: "Projectile Speed", desc: "Bullets move faster", func: (w) => { w.speed *= 1.3 }, max: 3, weight: 1 },
      { name: "Multi-shot", desc: "Shoot more bullets", func: (w) => { w.amount++ }, max: 5, weight: 0.2 }
      // { name: "", desc: "", func: (w) => { }, max: 0, weight: 0 }
    ],
    tick: (weapon) => {
      let contract = get("cursorContract") || 0;
      let pow = 1 - Math.pow(1e-6, clampTime);
      if (player.isFiring) { // either but not both
        contract += (1 - contract) * pow;
        if (weapon.reload <= 0 && player.dodge.cooldown <= 0) {
          weapon.reload = 1 / weapon.fireRate;
          for (let i = 0; i < weapon.amount; i++) {
            new projectileTypes[projectileEnums.playerBullet]({ pos: player.pos.copy, dir: player.dir + weapon.spread * (i - (weapon.amount - 1) / 2), damage: weapon.damage, speed: weapon.speed });
          }
        }
      } else {
        contract -= contract * pow;
      }

      set("cursorContract", contract);
      weapon.reload -= clampTime;
    }
  }),
  // new Weapon({
  //   id: "sacred-blade",
  //   name: "Sacred Blade",
  //   props: {
  //     amount: 1,
  //     damage: 5,
  //     speed: 300,
  //     reload: 0,
  //     fireRate: 3
  //   },
  //   upgrades: [
  //     { name: "Damage", desc: "Damage up", func: (w) => { w.damage *= 1.35 }, max: 5, weight: 1 },
  //   ],
  //   tick: (weapon) => {
  //     if (weapon.reload <= 0) {
  //       weapon.reload = 1 / weapon.fireRate;
  //       for (let i = 0; i < weapon.amount; i++) {
  //         new projectileTypes[projectileEnums.sacredBlade]({
  //           pos: player.pos.copy,
  //           damage: weapon.damage,
  //           speed: weapon.speed,
  //           life: 120,
  //           vel: new Vector(weapon.speed, 0).rotate(Math.random() * Math.PI * 2).mult(5),
  //         });
  //       }
  //     }

  //     weapon.reload -= clampTime;
  //   },
    

  // })
];
export default weapons;