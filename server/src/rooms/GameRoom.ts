import { Room, Client } from "@colyseus/core";
import { GameRoomState, Player } from "./schema/GameRoomState";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { generateUsername } from "unique-username-generator";

export class GameRoom extends Room<GameRoomState> {
  maxClients = 4;

  onCreate (options: any) {
    this.setState(new GameRoomState({
      time: 0,
    }));

    this.setPrivate(options.private || false);

    this.maxClients = Math.min(parseInt(options.maxPlayers), 99);

    console.log("GameRoom created!", options);

    this.onMessage("move", (client, message) => {
      const player = this.state.players.get(client.sessionId);

      player.x = message.pos.x;
      player.y = message.pos.y;
      player.dir = message.dir;
    })

    this.setSimulationInterval(this.update.bind(this))
  }

    update(deltaTime: number) {
      this.state.time += deltaTime / 1000;

    }

  onJoin (client: Client, options: any) {
    console.log(`${client.sessionId} joined!`, options);



    this.state.players.set(client.sessionId, new Player({
      x: 0,
      y: 0,
      name: options.name !== "Guest" ? options.name : generateUsername("-", 3),
    }));

    if (this.state.leader === undefined) {
      this.state.leader = client.sessionId;
    }
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");

    // this.allowReconnection(client, 30);

    if (client.sessionId === this.state.leader) {
      this.state.leader = Array.from(this.state.players.keys())[0];
    }
    
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}
