define(["three", "three-extras/shader-fluctuation"], 

	function(THREE) {

		/**
		 * Create the FluctuationSprite class
		 */

		var FluctuationSprite = function( config ) {
			var cfg = config || {};
			this.lookTarget = config.lookAt || null;
			this.radius = config.radius || 1;

			// Fetch maps
			this.mapSkin = config.mapSkin || THREE.ImageUtils.loadTexture( "static/img/skin01.png" );

			// Prepare shader uniforms
			this.uniforms = THREE.UniformsUtils.clone( THREE.FluctuationShader.uniforms );
			this.uniforms['tSkin'].value = this.mapSkin;

			// Prepare material
			this.material = new THREE.ShaderMaterial( {
				uniforms: this.uniforms,
				vertexShader: THREE.FluctuationShader.vertexShader,
				fragmentShader: THREE.FluctuationShader.fragmentShader,
				transparent: true,
				depthWrite: false,
				opacity: 1,
			});

			// Create geometry
			this.geometry = new THREE.PlaneGeometry( this.radius, this.radius );

			// Initialize sprite
			THREE.Mesh.call(this, this.geometry, this.material);

		}
		FluctuationSprite.prototype = Object.create( THREE.Mesh.prototype );

		/**
		 *
	 	 */
	 	FluctuationSprite.prototype.setParticleXY = function( pNum, pos, scale, phase ) {

	 		// Calculate radial coordinates and default values
	 		var cA = Math.atan2( pos.y / pos.x ),
	 			cR = Math.sqrt( pos.x*pos.x + pos.y*pos.y ),
	 			cS = scale || 1.0,
	 			cP = phase || Math.random();

	 		// Apply normals
	 		this.uniforms['vP'+pNum].value.set(
	 				cA, cR, cS, cP
	 			);

	 	}

		/**
		 *
	 	 */
	 	FluctuationSprite.prototype.setParticleAR = function( pNum, angle, radius, scale, phase ) {

	 		// Calculate radial coordinates and default values
	 		var cA = angle,
	 			cR = radius,
	 			cS = scale || 1.0,
	 			cP = phase || Math.random();

	 		// Apply normals
	 		this.uniforms['vP'+pNum].value.set(
	 				cA, cR, cS, cP
	 			);

	 	}	 	

		/**
		 * Update time
		 *
		 * When 0 particles will be in the position defined by the setParticle()
		 * function. Otherwise they will spin around.
		 *
	 	 */
	 	FluctuationSprite.prototype.setPhase = function( t ) { 	

	 		// Update look target
	 		if (this.lookTarget)
	 			this.lookAt( this.lookTarget );

	 		// Update phase
	 		this.uniforms['fTime'].value = t;

	 	}

	 	return FluctuationSprite;

	}

);