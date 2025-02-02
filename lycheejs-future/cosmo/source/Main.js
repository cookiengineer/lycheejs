
lychee.define('game.Main').requires([
	'game.net.Client',
	'game.logic.Game',
	'game.state.Game',
	'game.state.Menu'
]).includes([
	'lychee.game.Main'
]).exports(function(lychee, game, global, attachments) {

	let Class = function(data) {

		let settings = lychee.extend({

			title: 'Cosmo Prototype',

			// Is configured by Sorbet API
			client: '/api/Server?identifier=cosmo',

			input: {
				delay:       0,
				key:         true,
				keymodifier: false,
				touch:       true,
				swipe:       true
			},

			jukebox: {
				music: true,
				sound: true
			},

			renderer: {
				id:     'game',
				width:  null,
				height: null
			},

			touchcontrols: false,

			viewport: {
				fullscreen: false
			}

		}, data);


		lychee.game.Main.call(this, settings);

	};


	Class.prototype = {

		init: function() {

			// Overwrite client with game.net.Client
			let clientsettings   = this.settings.client;
			this.settings.client = null;

			lychee.game.Main.prototype.init.call(this);


			this.logic = new game.logic.Game(this);

			if (clientsettings !== null) {
				this.client = new game.net.Client(clientsettings, this);
			}


			this.setState('game', new game.state.Game(this));
			this.setState('menu', new game.state.Menu(this));
			this.changeState('menu');

		}

	};


	return Class;

});
