
define(["three"], 

	/**
	 * Extend THREE namespace with ParticleShader
	 */
	function(THREE) {

		/**
		 * This shader is used for rendering the particles in the 3D View of the virtual
		 * atom smasher.
		 *
		 * @author Ioannis Charalampidis
		 */

		THREE.ParticleShader = {

			uniforms: {

				"tDiffuse": { type: "t", value: null },
				"opacity":  { type: "f", value: 1.0 }

			},

			vertexShader: [

				"varying vec2 vUv;",

				"void main() {",

					"vUv = uv;",
					"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

				"}"

			].join("\n"),

			fragmentShader: [

				"uniform float opacity;",

				"uniform sampler2D tDiffuse;",

				"varying vec2 vUv;",

				"void main() {",

					"vec4 texel = texture2D( tDiffuse, vUv );",
					"gl_FragColor = opacity * texel;",

				"}"

			].join("\n")

		};

	}

);