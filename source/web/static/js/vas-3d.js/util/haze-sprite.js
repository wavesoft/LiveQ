define(["three", "three-extras/shader-particle-haze"], 

	function(THREE) {

		/**
		 * Create the HazeSprite class
		 */

		var HazeSprite = function( config ) {
			var cfg = config || {};
			this.radius = config.radius || 1;
			this.color = config.color || 0xffffff;

			// Fetch maps
			this.mapNoise = config.mapNoise 	|| THREE.ImageUtils.loadTexture( "static/img/particle-noise.jpg" );
			this.mapMask = config.mapMask 		|| THREE.ImageUtils.loadTexture( "static/img/particle-mask.jpg" );
			this.mapDiffuse = config.mapDiffuse || THREE.ImageUtils.loadTexture( "static/img/particle-diffuse.jpg" );

			// Prepare shader uniforms
			this.uniforms = THREE.UniformsUtils.clone( THREE.ParticleHazeShader.uniforms );
			this.uniforms['tNoise'].value = this.mapNoise;
			this.uniforms['tMask'].value = this.mapMask;
			this.uniforms['tDiffuse'].value = this.mapDiffuse;
			this.uniforms['color'].value = new THREE.Color(this.color);

			// Prepare material
			this.material = new THREE.ShaderMaterial( {
				uniforms: this.uniforms,
				vertexShader: THREE.ParticleHazeShader.vertexShader,
				fragmentShader: THREE.ParticleHazeShader.fragmentShader,
				transparent: true,
				depthWrite: false,
				opacity: 1,
			});

			// Create geometry
			this.geometry = new THREE.PlaneGeometry( this.radius, this.radius );

			// Initialize sprite
			THREE.Mesh.call(this, this.geometry, this.material);

		}
		HazeSprite.prototype = Object.create( THREE.Mesh.prototype );

		/**
		 * Update time
	 	 */
	 	HazeSprite.prototype.setPhase = function( t ) { 	
	 		// Update phase
	 		this.uniforms['fTime'].value = t;
	 	}

		/**
		 * Update opacity
	 	 */
	 	HazeSprite.prototype.setOpacity = function( o ) { 	
	 		// Update opacity
	 		this.uniforms['opacity'].value = o;
	 	}

	 	return HazeSprite;

	}

);