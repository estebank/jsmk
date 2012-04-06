var jsmk = jsmk || {};

jsmk.player_states = {
	IDLE: "stance",
	PUNCH: "punch",
	KICK: "kick",
	MOVE_RIGHT: "right",
	MOVE_LEFT: "left",
	JUMP: "jmp",
	CROUCH: "crch",
	JUMP_KICK: "jmpkick",
	JUMP_PUNCH: "jmkpnch",
	VICTORY_DANCE: "victor",
	LOWER_PUNCH: "lpunch",
	LOWER_KICK: "lkick"
};

jsmk.PlayerEvent = function(move_right, move_left, jump, punch, kick, crouch) {
	this.move_right = move_right !== undefined ? move_right : false;
	this.move_left = move_left !== undefined ? move_left : false;
	this.jump = jump !== undefined ? jump : false;
	this.punch = punch !== undefined ? punch : false;
	this.kick = kick !== undefined ? kick : false;
	this.crouch = crouch !== undefined ? crouch : false;
};

jsmk.PlayerEvent.prototype.empty = function() {
	return !(this.move_right || this.move_left || this.jump || this.punch || this.kick || this.crouch);
}

jsmk.Character = function(name, animations) {
	this.name = name;
	this.animations = animations;
};

jsmk.Character.prototype.nextFrame = function(player_state) {
	var animation = this.animations[player_state];
	animation.nextFrame();
	return animation._getFrame();
};

jsmk.Character.prototype.clearFrame = function(player_state) {
	return this.animations[player_state].reset();
};

jsmk.buildAnimation = function(name, type, length) {
	var concatenatePath = function (name, type, number) {
		var n = (number + "").length == 1 ? '0' + number : number;
		var path = name + '/' + type + '/' + n + '.gif';
		return path;
	};
	
	var images = [];
	var i = 0;
	if (type == jsmk.player_states.MOVE_RIGHT) {
		type = 'walk';
		for (i = 1; i <= length; i++) {
			images[images.length] = concatenatePath(name, type, i);
		}
	} else if (type == jsmk.player_states.MOVE_LEFT) {
		type = 'walk';
		for (i = length; i > 0; i--) {
			images[images.length] = concatenatePath(name, type, i);
		}
	} else {
		for (i = 1; i <= length; i++) {
			images[images.length] = concatenatePath(name, type, i);
		}
	}
	var animation = [];
	for (i = 0; i < images.length; i++) {
		animation[i] = new Image();
		animation[i].src = images[i];
	}
	return new jsmk.AnimationSequence(animation).createAnimation();
};

jsmk.buildCharacter = function(name, idle, move, punch, kick) {
	var animations = {};
	animations[jsmk.player_states.IDLE] = jsmk.buildAnimation(name, jsmk.player_states.IDLE, idle);
	animations[jsmk.player_states.MOVE_RIGHT] = jsmk.buildAnimation(name, jsmk.player_states.MOVE_RIGHT, move);
	animations[jsmk.player_states.MOVE_LEFT] = jsmk.buildAnimation(name, jsmk.player_states.MOVE_LEFT, move);
	animations[jsmk.player_states.PUNCH] = jsmk.buildAnimation(name, jsmk.player_states.PUNCH, punch);
	animations[jsmk.player_states.KICK] = jsmk.buildAnimation(name, jsmk.player_states.KICK, kick);

	return new jsmk.Character(name, animations);
};

jsmk.characters = {};

jsmk.characters.Kano = function() {
	return jsmk.buildCharacter('Kano', 7, 9, 9, 6);
};

jsmk.characters.SubZero = function() {
	return jsmk.buildCharacter('SubZero', 12, 9, 9, 6);
};

jsmk.playerFacingPosition = {
	LEFT: -1,
	RIGHT: 1
};

/** @const */
jsmk.MOVEMENT_DELTA = 5;

jsmk.Player = function(character, controller, position, opt_facing) {
	this.character = character;
	this.controller = controller;
	this.position = position;
	this.state = jsmk.player_states.IDLE;
	this.facing = opt_facing !== undefined ? opt_facing : jsmk.playerFacingPosition.RIGHT;
	this.width = 40;//this.character.nextFrame(jsmk.player_states.IDLE).width;

	this.controller.bind(this);
};

jsmk.Player.prototype.changeState = function(state) {
	if (this.state != state) {
		this.character.clearFrame(this.state);
	}
	this.state = state;
};

jsmk.Player.prototype.eventListener = function(event) {
	if (event.punch) {
		this.changeState(jsmk.player_states.PUNCH);
	} else if (event.kick) {
		this.changeState(jsmk.player_states.KICK);
	} else {
		if (event.empty()) {
			this.changeState(jsmk.player_states.IDLE);
		} else if (event.move_right) {
			this.changeState(jsmk.player_states.MOVE_RIGHT);
		} else if (event.move_left) {
			this.changeState(jsmk.player_states.MOVE_LEFT);
		}
	}
};

jsmk.Player.prototype.moveLeft = function() {
	if (this.position >= this.width / 2) {
		this.position -= jsmk.MOVEMENT_DELTA;
	}
};

jsmk.Player.prototype.moveRight = function() {
	if (this.position <= 395 - this.width / 2) {
		this.position += jsmk.MOVEMENT_DELTA;
	}
};

jsmk.Player.prototype.move = function() {
	switch(this.state) {
	case jsmk.player_states.MOVE_RIGHT:
		this.moveRight();
		break;
	case jsmk.player_states.MOVE_LEFT:
		this.moveLeft();
		break;
	}
};

jsmk.Player.prototype.draw = function(ctx){
	this.controller.tick();
	this.move()
	var state = this.state;

	if (this.state == jsmk.player_states.MOVE_RIGHT && this.facing == jsmk.playerFacingPosition.LEFT) {
		state = jsmk.player_states.MOVE_LEFT;
	}
	if (this.state == jsmk.player_states.MOVE_LEFT && this.facing == jsmk.playerFacingPosition.LEFT) {
		state = jsmk.player_states.MOVE_RIGHT;
	}
	if (this.state == jsmk.player_states.MOVE_RIGHT && this.facing == jsmk.playerFacingPosition.RIGHT) {
		state = jsmk.player_states.MOVE_RIGHT;
	}
	if (this.state == jsmk.player_states.MOVE_LEFT && this.facing == jsmk.playerFacingPosition.RIGHT) {
		state = jsmk.player_states.MOVE_LEFT;
	}
	var frame = this.character.nextFrame(state);
	this.width = frame.width;
	
	var renderTarget = ctx;
	if (this.facing == jsmk.playerFacingPosition.LEFT) {
		renderTarget = ctx.project({
			"mirror-x": null
		});
	}
	
	renderTarget.drawImage(frame, this.position - frame.width / 2, jsmk.TOP, frame.width, frame.height);
};

jsmk.Controller = function() {
	this.event = new jsmk.PlayerEvent();
	this.player = null;
	this._punch_times = 0;
	this._kick_times = 0;
};

jsmk.Controller.prototype.bind = function(player) {
	this.player = player;
};

jsmk.Controller.prototype.tick = function() {
	this.player.eventListener(this.event);
};

jsmk.Controller.prototype.punch = function() {
	if (this._punch_times < 7) {
		this.event.punch = true;
		this._punch_times += 1;
	} else {
		this.event.punch = false;
		this._punch_times = 0;
	}
};

jsmk.Controller.prototype.kick = function() {
	if (this._punch_times < 6) {
		this.event.kick = true;
		this._kick_times += 1;
	} else {
		this.event.kick = false;
		this._kick_times = 0;
	}
};

jsmk.PingPongController = function() {
	this.controller = new jsmk.Controller();
	this.current_direction = jsmk.player_states.MOVE_RIGHT;
	var self = this;
	(function ouch() {
		self.controller.event.punch = true;
		setTimeout(ouch, Math.random() * Math.random() * 5000);
	})();

	(function argh() {
		self.controller.event.kick = true;
		setTimeout(argh, Math.random() * Math.random() * 10000);
	})();
};

jsmk.PingPongController.prototype.bind = function(player) {
	this.controller.bind(player);
};

jsmk.PingPongController.prototype.tick = function() {
console.log(this.current_direction)
	var previous_event = this.controller.event;
	this.controller.event = new jsmk.PlayerEvent();
	this.controller.event.punch = previous_event.punch;
	if (this.controller.event.punch) {
		this.controller.punch();
	}
	if (previous_event.kick) {
		this.controller.kick();
	}
	if (this.controller.player.position >= this.controller.player.width / 2 &&
		this.current_direction == jsmk.player_states.MOVE_LEFT) {
		this.controller.event.move_left =  true;
	} else if (this.controller.player.position <= 395 - this.controller.player.width / 2 &&
		this.current_direction == jsmk.player_states.MOVE_RIGHT) {
		this.controller.event.move_right =  true;
	} else {
		if (this.current_direction == jsmk.player_states.MOVE_LEFT) {
			this.current_direction = jsmk.player_states.MOVE_RIGHT;
		} else {
			this.current_direction = jsmk.player_states.MOVE_LEFT;
		}
	}
	this.controller.tick();
};

jsmk.KeyboardController = function() {
	this.controller = new jsmk.Controller();
	var self = this;
	window.onkeydown = function(e) {
		switch (e.keyCode) {
		case 39:  // Right
			self.controller.event.move_right = true;
			break;
		case 37:  // Left
			self.controller.event.move_left = true;
			break;
		case 65:  // A/Punch
			self.controller.event.punch = true;
			break;
		case 83:  // S/Kick
			self.controller.event.kick = true;
			break;
		}
	}
	window.onkeyup = function(e) {
		switch (e.keyCode) {
		case 39:  // Right
			self.controller.event.move_right = false;
			break;
		case 37:  // Left
			self.controller.event.move_left = false;
			break;
		case 65:  // A/Punch
			self.controller.event.punch = false;
			break;
		case 83:  // S/Kick
			self.controller.event.kick = false;
			break;
		}
	}
};

jsmk.KeyboardController.prototype.bind = function(player) {
	this.controller.bind(player);
};

jsmk.KeyboardController.prototype.tick = function() {
	var previous_event = this.controller.event;
	this.controller.event = new jsmk.PlayerEvent();
	if (previous_event.punch) {
		this.controller.punch();
	}
	if (previous_event.kick) {
		this.controller.kick();
	}
	this.controller.event.move_right = previous_event.move_right;
	this.controller.event.move_left = previous_event.move_left;

	this.controller.tick();
};

jsmk.Map = function(image) {
	this.image = image;
};

jsmk.Map.prototype.draw = function(ctx) {
	ctx.drawImage(this.image, 0, 0, this.image.width, this.image.height);
};

jsmk.TOP = 114;
jsmk.defaultPositionPlayer1 = 80;
jsmk.defaultPositionPlayer2 = 300;

jsmk.World = function(canvas) {
	this.player1 = new jsmk.Player(jsmk.characters.Kano(), new jsmk.KeyboardController(), jsmk.defaultPositionPlayer1, jsmk.playerFacingPosition.RIGHT);
	this.player2 = new jsmk.Player(jsmk.characters.SubZero(), new jsmk.PingPongController(), jsmk.defaultPositionPlayer2, jsmk.playerFacingPosition.LEFT);
	
	var mapImage = new Image();
	mapImage.src = 'pic.png';
	this.map = new jsmk.Map(mapImage);
	this.canvas = canvas;
	
	//this.draw();
};


jsmk.World.prototype.draw = function() {
	//var ctx = this.canvas.getContext('2d');
	var ctx = new jsmk.RenderTarget(this.canvas.getContext("2d"));
	
	this.map.draw(ctx);
	

	if (this.player1.position < this.player2.position) {
		this.player1.facing = jsmk.playerFacingPosition.RIGHT;
		this.player2.facing = jsmk.playerFacingPosition.LEFT;
	} else {
		this.player1.facing = jsmk.playerFacingPosition.LEFT;
		this.player2.facing = jsmk.playerFacingPosition.RIGHT;
	}
	this.player1.draw(ctx);
	this.player2.draw(ctx);
};

jsmk.World.prototype.go = function() {
	var world = this;
	var previous_time = 0;
	(function doDraw(time){
		webkitRequestAnimationFrame(doDraw);
		if ((time - previous_time) > 70) {
			previous_time = time;
			world.draw();
		}
	}());
}

window.onload = function() {
	var map = document.getElementById("map");
	var world = new jsmk.World(map);
	world.go();
}
