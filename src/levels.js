const levels = [
  {
    size: 2000,
    start: [{ count: 50, size: 20, type: 0 }, { count: 20, size: 25, type: 0 }],
    waves: [
      { time: 30, enemies: [{ count: 100, size: 20, speed: 50, type: 0 }, { count: 50, size: 25, speed: 40, type: 0 }] },
      { time: 60, enemies: [{ count: 10, size: 40, speed: 25, type: 0 }, { count: 50, size: 25, speed: 40, type: 0 }] },
      { time: 90, enemies: [{ count: 10, size: 50, speed: 40, type: 0 }, { count: 50, size: 20, speed: 200, type: 0 }] },
      { time: 120, enemies: [{ count: 50, size: 50, speed: 50, type: 0 }, { count: 10, size: 100, speed: 30, type: 0 }] },
      { time: 180, enemies: [{ count: 70, size: 50, speed: 100, type: 0 }, { count: 50, size: 100, speed: 60, type: 0 }, { count: 50, size: 30, speed: 1000, type: 0 }] },
    ]
  }
];
export default levels;