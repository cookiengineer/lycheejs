
lychee.define('harvester.net.remote.Profile').requires([
	'lychee.codec.JSON'
]).includes([
	'lychee.net.Service'
]).exports(function(lychee, global, attachments) {

	var _CACHE      = {};
	var _JSON       = lychee.import('lychee.codec.JSON');
	var _Filesystem = lychee.import('harvester.data.Filesystem');
	var _Service    = lychee.import('lychee.net.Service');



	/*
	 * FEATURE DETECTION
	 */

	(function(cache) {

		var filesystem  = new _Filesystem('/bin/harvester');
		var identifiers = filesystem.dir('/').map(function(value) {
			return value.split('.').slice(0, -1).join('.');
		});

		if (identifiers.length > 0) {

			identifiers.forEach(function(identifier) {

				var profile = filesystem.read('/' + identifier + '.json');
				if (profile !== null) {
					cache[identifier] = _JSON.decode(profile);
					cache[identifier].identifier = identifier;
				}

			});

		}

	})(_CACHE);



	/*
	 * HELPERS
	 */

	var _serialize = function(profile) {

		return {
			identifier: profile.identifier || '',
			host:       profile.host       || 'localhost',
			port:       profile.port       || 8080,
		};

	};

	var _on_update = function(data) {

// TODO: Update profile data

		var identifier = data.identifier || null;
		if (identifier !== null) {

			var profile = _CACHE[identifier] || null;
			if (profile !== null) {

				this.accept('Profile updated ("' + identifier + '")');

			} else {

				this.reject('No profile ("' + identifier + '")');

			}

		} else {

			this.reject('No identifier');

		}

	};



	/*
	 * IMPLEMENTATION
	 */

	var Class = function(remote) {

		_Service.call(this, 'project', remote, _Service.TYPE.remote);


		this.bind('update', _on_update, this);

	};


	Class.prototype = {

		/*
		 * ENTITY API
		 */

		serialize: function() {

			var data = _Service.prototype.serialize.call(this);
			data['constructor'] = 'harvester.net.remote.Project';


			return data;

		},



		/*
		 * CUSTOM API
		 */

		index: function(data) {

			var tunnel = this.tunnel;
			if (tunnel !== null) {

				var profiles = Object.values(_CACHE).filter(function(profile) {
					return /cultivator/g.test(profile.identifier) === false;
				}).map(_serialize);


				tunnel.send(profiles, {
					id:    this.id,
					event: 'sync'
				});

			}

		}

	};


	return Class;

});

