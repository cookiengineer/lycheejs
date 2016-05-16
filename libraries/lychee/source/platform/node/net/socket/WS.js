
lychee.define('lychee.net.socket.WS').tags({
	platform: 'node'
}).requires([
	'lychee.crypto.SHA1',
	'lychee.net.protocol.WS'
]).includes([
	'lychee.event.Emitter'
]).supports(function(lychee, global) {

	try {

		require('http');

		if (typeof global.setInterval === 'function') {
			return true;
		}

	} catch(e) {
	}


	return false;

}).exports(function(lychee, global, attachments) {

	var _Protocol    = lychee.import('lychee.net.protocol.WS');
	var _SHA1        = lychee.import('lychee.crypto.SHA1');
	var _http        = require('http');
	var _setInterval = global.setInterval;



	/*
	 * HELPERS
	 */

	var _verify_client = function(headers, nonce) {

		var connection = (headers['connection'] || '').toLowerCase();
		var upgrade    = (headers['upgrade']    || '').toLowerCase();
		var protocol   = (headers['sec-websocket-protocol'] || '').toLowerCase();

		if (connection === 'upgrade' && upgrade === 'websocket' && protocol === 'lycheejs') {

			var accept = (headers['sec-websocket-accept'] || '');
			var expect = (function(nonce) {

				var sha1 = new _SHA1();
				sha1.update(nonce + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
				return sha1.digest().toString('base64');

			})(nonce.toString('base64'));

			if (accept === expect) {
				return accept;
			}

		}


		return null;

	};

	var _verify_remote = function(headers) {

		var connection = (headers['connection'] || '').toLowerCase();
		var upgrade    = (headers['upgrade']    || '').toLowerCase();
		var protocol   = (headers['sec-websocket-protocol'] || '').toLowerCase();

		if (connection === 'upgrade' && upgrade === 'websocket' && protocol === 'lycheejs') {

			var host   = headers['host']   || null;
			var nonce  = headers['sec-websocket-key'] || null;
			var origin = headers['origin'] || null;

			if (host !== null && nonce !== null && origin !== null) {

				var handshake = '';
				var accept    = (function(nonce) {

					var sha1 = new _SHA1();
					sha1.update(nonce + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
					return sha1.digest().toString('base64');

				})(nonce);


				// HEAD

				handshake += 'HTTP/1.1 101 WebSocket Protocol Handshake\r\n';
				handshake += 'Upgrade: WebSocket\r\n';
				handshake += 'Connection: Upgrade\r\n';

				handshake += 'Sec-WebSocket-Version: '  + '13'       + '\r\n';
				handshake += 'Sec-WebSocket-Origin: '   + origin     + '\r\n';
				handshake += 'Sec-WebSocket-Protocol: ' + 'lycheejs' + '\r\n';
				handshake += 'Sec-WebSocket-Accept: '   + accept     + '\r\n';


				// BODY
				handshake += '\r\n';


				return handshake;

			}

		}


		return null;

	};

	var _verify_upgrade = function(data) {

		var lines   = data.toString('utf8').split('\r\n');
		var headers = {};


		lines.forEach(function(line) {

			var index = line.indexOf(':');
			if (index !== -1) {

				var key = line.substr(0, index).trim().toLowerCase();
				var val = line.substr(index + 1, line.length - index - 1).trim();
				if (key.match(/host|connection|upgrade|origin|sec-websocket-protocol/g) !== null) {
					headers[key] = val.toLowerCase();
				} else if (key === 'sec-websocket-key') {
					headers[key] = val;
				}

			}

		});


		if (headers['connection'] === 'upgrade' && headers['upgrade'] === 'websocket') {

			this.emit('upgrade', {
				headers: headers,
				socket:  this
			});

		} else {

			this.destroy();

		}

	};



	/*
	 * IMPLEMENTATION
	 */

	var Class = function() {

		this.__connection = null;
		this.__protocol   = null;


		lychee.event.Emitter.call(this);

	};


	Class.prototype = {

		/*
		 * ENTITY API
		 */

		// deserialize: function(blob) {},

		serialize: function() {

			var data = lychee.event.Emitter.prototype.serialize.call(this);
			data['constructor'] = 'lychee.net.socket.WS';


			return data;

		},



		/*
		 * CUSTOM API
		 */

		connect: function(host, port, connection) {

			host       = typeof host === 'string'       ? host       : null;
			port       = typeof port === 'number'       ? (port | 0) : null;
			connection = typeof connection === 'object' ? connection : null;


			var that = this;
			var url  = host.match(/:/g) !== null ? ('ws://[' + host + ']:' + port) : ('ws://' + host + ':' + port);


			if (host !== null && port !== null) {

				if (connection !== null) {

					connection.once('data', _verify_upgrade.bind(connection));
					connection.resume();

					connection.once('error', function(err) {

						if (lychee.debug === true) {

							if (err.code.match(/ECONNABORTED|ECONNREFUSED|ECONNRESET/) !== null) {
								console.warn('lychee.net.socket.WS: BAD CONNECTION at ' + host + ':' + port);
							}

						}

						that.trigger('error');
						that.disconnect();

					});

					connection.on('upgrade', function(request) {

						var protocol = new _Protocol(_Protocol.TYPE.remote);
						var socket   = request.socket || null;


						if (socket !== null) {

							var verification = _verify_remote(request.headers);
							if (verification !== null) {

								socket.allowHalfOpen = true;
								socket.setTimeout(0);
								socket.setNoDelay(true);
								socket.setKeepAlive(true, 0);
								socket.removeAllListeners('timeout');
								socket.write(verification, 'ascii');


								socket.on('data', function(blob) {

									var chunks = protocol.receive(blob);
									if (chunks.length > 0) {

										for (var c = 0, cl = chunks.length; c < cl; c++) {

											var chunk = chunks[c];
											if (chunk[0] === 136) {

												that.send(chunk, true);
												that.disconnect();

												return;

											} else {

												that.trigger('receive', [ chunks[c] ]);

											}

										}

									}

								});

								socket.on('error', function(err) {
									that.trigger('error');
									that.disconnect();
								});

								socket.on('timeout', function() {
									that.trigger('error');
									that.disconnect();
								});

								socket.on('close', function() {
									that.disconnect();
								});

								socket.on('end', function() {
									that.disconnect();
								});


								if (lychee.debug === true) {
									console.log('lychee.net.socket.WS: Connected to ' + host + ':' + port);
								}


								that.__connection = socket;
								that.__protocol   = protocol;

								setTimeout(function() {
									that.trigger('connect');
								}, 0);

							} else {

								socket.end();
								socket.destroy();

								that.trigger('error');
								that.disconnect();

							}

						}

					});

				} else {

					var nonce = new Buffer(16);

					for (var n = 0; n < 16; n++) {
						nonce[n] = Math.round(Math.random() * 0xff);
					}


					var connector = _http.request({
						hostname: host,
						port:     port,
						method:   'GET',
						headers:  {
							'Upgrade':                'websocket',
							'Connection':             'Upgrade',
							'Origin':                 url,
							'Host':                   host + ':' + port,
							'Sec-WebSocket-Key':      nonce.toString('base64'),
							'Sec-WebSocket-Version':  '13',
							'Sec-WebSocket-Protocol': 'lycheejs'
						}
					});


					connector.on('upgrade', function(response) {

						var protocol = new _Protocol(_Protocol.TYPE.client);
						var socket   = response.socket || null;


						if (socket !== null) {

							var verification = _verify_client(response.headers, nonce);
							if (verification !== null) {

								socket.setTimeout(0);
								socket.setNoDelay(true);
								socket.setKeepAlive(true, 0);
								socket.removeAllListeners('timeout');


								_setInterval(function() {

									var chunk = protocol.ping();
									if (chunk !== null) {
										socket.write(chunk);
									}

								}.bind(this), 60000);


								socket.on('data', function(blob) {

									var chunks = protocol.receive(blob);
									if (chunks.length > 0) {

										for (var c = 0, cl = chunks.length; c < cl; c++) {

											var chunk = chunks[c];
											if (chunk[0] === 136) {

												that.disconnect();

												return;

											} else {

												that.trigger('receive', [ chunks[c] ]);

											}

										}

									}

								});


								socket.on('error', function(err) {
									that.trigger('error');
									that.disconnect();
								});

								socket.on('timeout', function() {
									that.trigger('error');
									that.disconnect();
								});

								socket.on('close', function() {
									that.disconnect();
								});

								socket.on('end', function() {
									that.disconnect();
								});


								if (lychee.debug === true) {
									console.log('lychee.net.socket.WS: Connected to ' + host + ':' + port);
								}


								that.__connection = socket;
								that.__protocol   = protocol;

								setTimeout(function() {
									that.trigger('connect');
								}, 0);

							} else {

								socket.end();
								socket.destroy();

								that.trigger('error');
								that.disconnect();

							}

						}

					});

					connector.once('error', function(err) {

						if (lychee.debug === true) {

							if (err.code.match(/ECONNABORTED|ECONNREFUSED|ECONNRESET/) !== null) {
								console.warn('lychee.net.socket.WS: BAD CONNECTION at ' + host + ':' + port);
							}

						}

						that.trigger('error');
						that.disconnect();

						this.end();
						this.destroy();

					});

					connector.on('response', function(response) {

						that.trigger('error');
						that.disconnect();

						this.end();
						this.destroy();

					});

					connector.end();

				}

			}

		},

		send: function(data, binary) {

			data   = data instanceof Buffer ? data : null;
			binary = binary === true;


			if (data !== null) {

				var connection = this.__connection;
				var protocol   = this.__protocol;

				if (connection !== null && protocol !== null) {

					var chunk = this.__protocol.send(data, binary);
					var enc   = binary === true ? 'binary' : 'utf8';

					if (chunk !== null) {
						connection.write(chunk, enc);
					}

				}

			}

		},

		disconnect: function() {

			if (lychee.debug === true) {
				console.log('lychee.net.socket.WS: Disconnected');
			}


			var connection = this.__connection;
			var protocol   = this.__protocol;

			if (connection !== null && protocol !== null) {

				this.__connection = null;
				this.__protocol   = null;

				connection.destroy();
				protocol.close();


				// XXX: destroy() method is SYNCHRONOUS
				// so event HAS to be delayed
				this.trigger('disconnect');

			}

		}

	};


	return Class;

});

