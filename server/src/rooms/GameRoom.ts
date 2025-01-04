import { Room, Client } from "@colyseus/core";
import { GameRoomState, Player } from "./schema/GameRoomState";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { generateUsername } from "unique-username-generator";
import levels from "../../../src/levels"
import { Vector } from "./types/Vector";

export class GameRoom extends Room<GameRoomState> {
	maxClients = 4;

	onCreate(options: any) {
		this.setState(new GameRoomState({
			time: 0,
			level: options.level
		}));

		levels[options.level].start.forEach((startingLayout: { count: number; props: { [key: string]: any }; type: number }) => {
			for (let index = 0; index < startingLayout.count; index++) {
				const properties: { [key: string]: any; mode: number; index: number; max: number; pos: Vector; vel: Vector; size: number; spawn: number; hp: number; speed: number } = { 
					mode: 0, 
					index, 
					max: startingLayout.count,
					pos: new Vector(0, 0),
					vel: new Vector(0, 0),
					size: 1,
					spawn: 0,
					hp: 100,
					speed: 1
				}

				for (const property in startingLayout.props) {
					properties[property] = startingLayout.props[property];
				}

				// this.state.enemies.push(new enemyTypes[st	 artingLayout.type](properties))
			}
		})

		this.setPrivate(options.private || false);

		this.maxClients = Math.min(parseInt(options.maxPlayers), 99);

		console.log("GameRoom created!", options);

		this.onMessage("move", (client, message) => {
			const player = this.state.players.get(client.sessionId);

			console.log(message)

			player.pos.x = message.pos.x;
			player.pos.y = message.pos.y;
			player.dir = message.dir;
		})

		this.setSimulationInterval(this.update.bind(this))
	}

	update (deltaTime: number) {
		this.state.time += deltaTime / 1000;

	}

	onJoin(client: Client, options: any) {
		console.log(`${client.sessionId} joined!`, options);

		this.state.players.set(client.sessionId, new Player({
			pos: new Vector(0, 0),
			name: options.name !== "Guest" ? options.name : generateUsername("-", 3),
		}));

		if (this.state.leader === undefined) {
			this.state.leader = client.sessionId;
		}
	}

	onLeave(client: Client, consented: boolean) {
		console.log(client.sessionId, "left!");

		// this.allowReconnection(client, 30);

		
		if (client.sessionId === this.state.leader && this.state.players.size > 0) {
			this.state.leader = Array.from(this.state.players.keys())[1];
		}
		
		this.state.players.delete(client.sessionId);
	}

	onDispose() {
		console.log("room", this.roomId, "disposing...");
	}

}
