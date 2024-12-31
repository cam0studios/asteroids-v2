import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";

/**
 * Import your Room files
 */
import { GameRoom } from "./rooms/GameRoom";

export default config({

	initializeGameServer: (gameServer) => {
		/**
		 * Define your room handlers:
		 */
		gameServer.define('GameRoom', GameRoom);

	},

	initializeExpress: (app) => {
		/**
		 * Use @colyseus/playground
		 * (It is not recommended to expose this route in a production environment)
		 */
		if (process.env.NODE_ENV !== "production") {
			app.use("/", playground);
		}

		/**
		 * Use @colyseus/monitor
		 * It is recommended to protect this route with a password
		 * Read more: https://docs.colyseus.io/tools/monitor/#restrict-access-to-the-panel-using-a-password
		 */
		app.use("/monitor", monitor());
	},


	beforeListen: () => {
		/**
		 * Before before gameServer.listen() is called.
		 */
	}
});
