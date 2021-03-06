
lychee.define('game.net.Client').requires([
	'lychee.data.BitON',
	'game.net.client.Multiplayer'
]).includes([
	'lychee.net.Client'
]).exports(function(lychee, game, global, attachments) {

	let _BitON       = lychee.data.BitON;
	let _multiplayer = game.net.client.Multiplayer;


	let Class = function(data, main) {

		let settings = lychee.extend({
			codec:     _BitON,
			reconnect: 10000
		}, data);


		lychee.net.Client.call(this, settings);



		/*
		 * INITIALIZATION
		 */

		this.bind('connect', function() {

			this.addService(new _multiplayer(this));

			if (lychee.debug === true) {
				console.log('(Blitzkrieg) game.net.Client: Remote connected');
			}

		}, this);

		this.bind('disconnect', function(code) {

			if (lychee.debug === true) {
				console.log('(Blitzkrieg) game.net.Client: Remote disconnected (' + code + ')');
			}

		}, this);


		this.connect();

	};


	Class.prototype = {

	};


	return Class;

});

