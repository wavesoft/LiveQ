define(["three"], 

	/**
	 * Extend THREE namespace with VerticalBlurShader
	 */
	function(THREE) {

		/**
		 * 
		 */
		THREE.GeometricGlowMesh = function( mesh ){
			THREE.Object3D.call(this);

			// Create glow shader for the internal side
			var glowShaderInside = THREE.AtmosphericShader;
			glowShaderInside.uniforms = THREE.UniformsUtils.clone( glowShaderInside.uniforms );
			var matInside	= new THREE.ShaderMaterial({
				uniforms: this.uniforms,
				vertexShader: shader.vertexShader,
				fragmentShader: shader.fragmentShader,
				transparent: true
			};

			// Clone geometry and initialize shaders for the inner side
			var geometry	= mesh.geometry.clone()
			matInside.uniforms.glowColor.value	= new THREE.Color('cyan')
			matInside.uniforms.coeficient.value	= 1.1
			matInside.uniforms.power.value		= 1.4
			var insideMesh	= new THREE.Mesh(geometry, matInside );
			this.add( insideMesh );
			this.scale = 1.01;


			var geometry	= mesh.geometry.clone()
			THREEx.dilateGeometry(geometry, 0.1)
			var material	= THREEx.createAtmosphereMaterial()
			material.uniforms.glowColor.value	= new THREE.Color('cyan')
			material.uniforms.coeficient.value	= 0.1
			material.uniforms.power.value		= 1.2
			material.side	= THREE.BackSide
			var outsideMesh	= new THREE.Mesh( geometry, material );
			this.add( outsideMesh );

			// expose a few variable
			this.insideMesh	= insideMesh
			this.outsideMesh= outsideMesh
		}

		THREE.GeometricGlowMesh.prototype = Object.clone( THREE.Object3D.prototype);

	}

});