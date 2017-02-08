const TILE = require('./tile.js'); 
const GameState = require('./gameState.js');
const GameMap = require('./gameMap.js');
const Algorithms = require('./algorithms.js');
const Heuristics = require('./heuristics.js');

class Bot {

	constructor(socket, playerIndex, data) {
		this.socket = socket;
		this.playerIndex = playerIndex;

		//armies are always given at even turn numbers
		//turn 1 -> 1 turn 2 -> 2, turn 4 -> 3, turn 24 -> 13 (turn / 2 + 1) = army count
		this.INITIAL_WAIT_TURNS = 23;
		this.SECONDS_DISCOVER_TURN = Math.ceil((this.INITIAL_WAIT_TURNS + 1) * 1.5);
		this.REINFORCEMENT_INTERVAL = 50;

		//true, if bot found an adjacent enemy line with low values
		this.isInfiltrating = false;

		this.gameState = new GameState(data);
		this.gameMap = new GameMap(this.gameState.width, this.gameState.height, this.gameState.generals);
		Algorithms.gameMap = this.gameMap;
	}


	update(data) {
		this.gameState.update(data);
		console.log("turn: " + data.turn + " armies: " +this.gameState.armies[this.gameMap.ownGeneral]);
		if(this.gameState.turn <= this.INITIAL_WAIT_TURNS) {
			//wait for some armies to develop
		} else if(this.gameState.turn % this.REINFORCEMENT_INTERVAL == 0) {
			//this.spreadPhase();
		} else if(this.gameState.turn == this.INITIAL_WAIT_TURNS + 1) {
			this.discover();
		} else if(this.gameState.turn >= this.SECONDS_DISCOVER_TURN 
			&& this.gameState.turn < this.REINFORCEMENT_INTERVAL) {
			this.secondDiscover();
		}
	}

	//wait for a set amount of turns and then discover as far away from the general as possible
	discover() {
		//get all tiles, that can be reached with a maximum of moves
		let reachableTiles = Algorithms.bfs(this.gameState, this.gameMap.ownGeneral, this.armiesReceivedTillTurn(this.INITIAL_WAIT_TURNS + 1));
		let discoverTile = Heuristics.chooseDiscoverTile(this.gameMap, reachableTiles);
		let path = Algorithms.dijkstra(this.gameState, this.gameMap.ownGeneral, discoverTile);

		this.queueAttackPath(path);
	}

	//gets the amount of armies that the general produced until a given turn
	armiesReceivedTillTurn(turn) {
		return (turn / 2) + 1;
	}

	//TODO: calculate at every step and maybe take waiting into decision tree(also moving on a tile multiple times)
	//capture as many tiles as possible before turn 50
	secondDiscover() {
		let turns = Math.ceil((this.INITIAL_WAIT_TURNS + 1) / 2 / 2);
		let moveableTiles = this.gameMap.getMoveableTiles(this.gameState, this.playerIndex);
		
		let move = Algorithms.decisionTreeSearch(this.gameState, moveableTiles, turns);
		this.move(move);
	}

	//every tile just got an extra unit, move them to conquer new tiles 
	spreadUnits() {

	}

	queueAttackPath(moves) {
		for(let move of moves) {
			this.move(move);
		}
	}

	move(move) {
		if(move.end != -1) {
			this.socket.emit('attack', move.start, move.end);
		}
	}
}

module.exports = Bot;