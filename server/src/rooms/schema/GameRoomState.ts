import { Schema, Context, type, MapSchema } from "@colyseus/schema";
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

export class Enemy extends Schema {
	@type(Vector) pos: Vector = new Vector(0, 0);
	
	@type("number") size: number;
	@type("number") hp: number;
	@type("number") maxHp: number;
	@type("number") hitDir: number;
	@type("number") time: number;
	@type("number") spawn: number;
	@type("number") type: number;
	@type("number") id: number;
}

export class GameRoomState extends Schema {
	@type({ map: Player }) players = new MapSchema<Player>();
	@type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
	@type({ map: Enemy }) enemies = new MapSchema<Enemy>();

	@type("number") time: number;

	@type("string") leader: string;
}
