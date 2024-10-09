export default [
  {
    size: 2000,
    start: [{ count: 50, size: 20, type: 0 }, { count: 20, size: 25, type: 0 }],
    waves: [
      { time: 15, enemies: [{ count: 100, size: 20, speed: 50, type: 0 }, { count: 50, size: 25, speed: 40, type: 0 }] },
      { time: 30, enemies: [{ count: 100, size: 20, speed: 50, type: 0 }, { count: 50, size: 25, speed: 40, type: 0 }] },
      { time: 60, enemies: [{ count: 10, size: 40, speed: 25, type: 0 }, { count: 50, size: 25, speed: 40, type: 0 }] },
    ]
  }
];