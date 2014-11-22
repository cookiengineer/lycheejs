
lychee.define('sorbet.net.Server').requires([
	'lychee.data.BitON',
	'sorbet.net.remote.Debugger',
	'sorbet.net.remote.Session'
]).includes([
	'lychee.net.Server'
]).exports(function(lychee, sorbet, global, attachments) {

	var _BitON    = lychee.data.BitON;
	var _debugger = sorbet.net.remote.Debugger;
	var _session  = sorbet.net.remote.Session;


	var Class = function(data) {

		var settings = lychee.extend({
			codec: _BitON
		}, data);


		lychee.net.Server.call(this, settings);


		/*
		 * INITIALIZATION
		 */

		this.bind('connect', function(remote) {

			console.log('(Sorbet) sorbet.net.Server: New Remote (' + remote.host + ':' + remote.port + ')');

			remote.addService(new _debugger(remote));
			remote.addService(new _session(remote));

		}, this);


		this.connect();

	};


	Class.prototype = {

	};


	return Class;

});

