import { Vector } from "../vector-library/vector";
import { getRandomBox } from "./main";

/**
 * @typedef {Object} Level
 * @property {number} size - The size of the level.
 * 
 * @property {Object[]} start - The starting enemies.
 * @property {number} start[].count - The amount of enemies.
 * @property {Object} start[].props - The properties of the enemies.
 * @property {number} start[].props.size - The size of the enemy.
 * @property {number} start[].props.type - The type of the enemy.
 * 
 * @property {Object[]} waves - The waves of enemies.
 * @property {number} waves[].time - The time the wave starts.
 * @property {Object[]} waves[].enemies - The enemies in the wave.
 * @property {number} waves[].enemies[].count - The amount of enemies.
 * @property {Object} waves[].enemies[].props - The properties of the enemies.
 * @property {number} waves[].enemies[].props.size - The size of the enemy.
 * @property {number} waves[].enemies[].props.speed - The speed of the enemy.
 * @property {number} waves[].enemies[].type - The type of the enemy.
 */
const levels = [
  
  {
    size: 2000,
    start: [{ count: 50, props: { size: 20 }, type: 0 }, { count: 20, props: { size: 25 }, type: 0 }],
    waves: [
      { time: 30, enemies: [{ count: 100, props: { size: 20, speed: 50 }, type: 0 }, { count: 50, props: { size: 25, speed: 40 }, type: 0 }] },
      { time: 60, enemies: [{ count: 10, props: { size: 40, speed: 25 }, type: 0 }, { count: 50, props: { size: 25, speed: 40 }, type: 0 }] },
      { time: 90, enemies: [{ count: 10, props: { size: 50, speed: 40 }, type: 0 }, { count: 50, props: { size: 20, speed: 200 }, type: 0 }, { count: 2, props: { mode: 0, spawn: true }, type: 1 }] },
      { time: 120, enemies: [{ count: 50, props: { size: 50, speed: 50 }, type: 0 }, { count: 10, props: { size: 100, speed: 30 }, type: 0 }, { count: 5, props: { mode: 0, spawn: true }, type: 1 }] },
      { time: 180, enemies: [{ count: 70, props: { size: 50, speed: 100 }, type: 0 }, { count: 50, props: { size: 100, speed: 60 }, type: 0 }, { count: 1, props: { hp: 30, speed: 200 }, type: 2 }] },
      { time: 240, enemies: [{ count: 100, props: { size: 50, speed: 100 }, type: 0 }, { count: 5, props: { mode: 0, spawn: true, hp: 25 }, type: 1 }, { count: 1, props: { hp: 50, speed: 200 }, type: 2 }] },
    ],
    planets: [
      {
        name: "West Virgina",
        size: 50,
        pos: new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1)["*"](2000),
        backgroundColor: "#e4ac05"
      }
    ]
  }
];
export default levels;