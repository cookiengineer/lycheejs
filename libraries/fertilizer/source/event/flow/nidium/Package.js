
lychee.define('fertilizer.event.flow.nidium.Package').requires([
	'lychee.event.Queue'
]).includes([
	'fertilizer.event.Flow'
]).exports(function(lychee, global, attachments) {

	const _Flow  = lychee.import('fertilizer.event.Flow');
	const _Queue = lychee.import('lychee.event.Queue');
	const _INDEX = {
		linux: attachments['index.sh'],
		macos: attachments['index.sh']
	};



	/*
	 * HELPERS
	 */

	const _package = function(os, arch, assets, oncomplete) {

		let project = this.project;
		let shell   = this.shell;
		let stash   = this.stash;
		let target  = this.target;

		if (project !== null && shell !== null && stash !== null && target !== null) {

			let prefix = project + '/build/' + target + '-' + os + '-' + arch;

			stash.read([
				'/bin/runtime/nidium/' + os + '/' + arch + '/nidium'
			], function(binaries) {

				let runtime = binaries[0] || null;
				if (runtime !== null) {

					let files = assets.slice(0).concat(runtime).concat(_INDEX[os]);
					let urls  = files.map(asset => prefix + '/' + asset.url.split('/').pop());

					stash.write(urls, files, function(result) {
						oncomplete(result);
					});

				} else {
					oncomplete(false);
				}

			});

		} else {
			oncomplete(false);
		}

	};



	/*
	 * IMPLEMENTATION
	 */

	const Composite = function(data) {

		let states = Object.assign({}, data);


		_Flow.call(this, states);

		states = null;



		/*
		 * INITIALIZATION
		 */

		this.unbind('package-runtime');

		this.bind('package-runtime', function(oncomplete) {

			let action  = this.action;
			let project = this.project;
			let target  = this.target;

			if (action !== null && project !== null && target !== null) {

				console.log('fertilizer: ' + action + '/PACKAGE-RUNTIME "' + project + '"');


				let env = this.__environment;
				if (env !== null && env.variant === 'application') {

					let assets = this.assets.filter(asset => asset !== null && asset.buffer !== null);
					if (assets.length > 0) {

						let queue = new _Queue();

						queue.then({ name: 'Linux x86_64', method: _package.bind(this, 'linux', 'x86_64', assets) });
						queue.then({ name: 'MacOS x86_64', method: _package.bind(this, 'macos', 'x86_64', assets) });

						queue.bind('update', function(entry, oncomplete) {

							entry.method(function(result) {

								if (result === true) {
									console.info('fertilizer: -> "' + entry.name + '" SUCCESS');
								} else {
									console.warn('fertilizer: -> "' + entry.name + '" FAILURE');
								}

								oncomplete(true);

							});

						}, this);

						queue.bind('complete', function() {
							oncomplete(true);
						}, this);

						queue.init();

					}

				} else {
					console.log('fertilizer: -> Skipping "' + target + '".');
					oncomplete(true);
				}

			} else {
				oncomplete(false);
			}

		}, this);



		/*
		 * FLOW
		 */

		// this.then('configure-project');

		// this.then('read-package');
		// this.then('read-assets');
		// this.then('read-assets-crux');

		// this.then('build-environment');
		// this.then('build-assets');
		// this.then('write-assets');
		// this.then('build-project');

		this.then('package-runtime');
		this.then('package-project');

	};


	Composite.prototype = {

		// deserialize: function(blob) {},

		serialize: function() {

			let data = _Flow.prototype.serialize.call(this);
			data['constructor'] = 'fertilizer.event.flow.nidium.Package';


			return data;

		}

	};


	return Composite;

});

