import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Vector } from "../types/Vector";

export class Player extends Schema {
	@type("string") name: string;

	@type(Vector) pos: Vector = new Vector(0, 0);

	@type("number") lastX: number;
	@type("number") lastY: number;

	@type("number") tickTime: number;

	@type("number") dir: number;

	@type("number") hp: number;
	@type("number") maxHp: number;

	@type("number") kills: number;
	@type("number") score: number;
	@type("number") dodgeVel: number;
	@type("number") shield: number;
}

export class Projectile extends Schema {
	@type(Vector) pos: Vector = new Vector(0, 0);

	@type("number") angle: number;
	@type("number") speed: number;
	@type("number") playerId: number;
}

export default class Enemy extends Schema {
    @type(Vector) pos: Vector;
    @type(Vector) vel: Vector;

    @type("number") size: number;

    @type("number") hp: number;
    @type("number") maxHp: number;

    @type("number") hitDir: number;

    @type("number") time: number;

    @type("boolean") spawn: boolean;

    @type("number") effectTime: number;
}

export class GameRoomState extends Schema {
	@type({ map: Player }) players = new MapSchema<Player>();
	@type({ map: Projectile }) projectiles = new ArraySchema<Projectile>();
	@type({ map: Enemy }) enemies = new ArraySchema<Enemy>();

	@type("number") time: number;
	@type("number") level: number;
	@type("string") leader: string;
}
