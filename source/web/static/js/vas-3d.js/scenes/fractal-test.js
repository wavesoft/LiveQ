
define(

	function() {

		var Scene = {};

		var s = 200, h = 200;

		Scene.timeline = {

			// Defaults for all objects
			'defaults': {
				'part0.a': 0,
				'part1.a': 0,
				'part2.a': 0,
				'part3.a': 0,
				'fluc0.a': 0,
				'fluc0.s': 1,
				'fluc1.a': 0,
				'fluc1.s': 1,
				'cam.x': 0,
				'cam.y': 0,
				'cam.z': 1800,
			},

			'keyframes': [

				// Position management
				[

					// [P0] Particle in the left-post position
					{
						p: 0.0,
						v: {
							'part0.x': -s*3, // P0 -> [P1]
							'part0.y': 0,
							'part0.a': 1,

							'fluc0.x': -s*3, // [P0]
							'fluc0.y': 0,
							'fluc0.a': 0,
							'fluc0.s': 0.8,

							'cam.x': -s*3,
							'cam.y': 0,
							'cam.z': 1800,
						}

					},

					// [P1] Particle fades out, fluctuation appears
					{
						p: 1.0,
						v: {
							'part0.x': -s*2, // [P1]
							'part0.y': 0,
							'part0.a': 0,

							'fluc0.x': -s*2, // [P1] -> P6
							'fluc0.y': 0,
							'fluc0.a': 1,
							'fluc0.s': 1,

							'part1.x': -s*2, // [P1] -> P3
							'part1.y': 0,
							'part1.a': 0,

							'fluc1.x': -s*2, // [P1] -> P2
							'fluc1.y': 0,
							'fluc1.a': 1,
							'fluc1.s': 0.8,

							'cam.x': -s*2,
							'cam.y': 0,
							'cam.z': 1500,
						}
					},

					// [P6] Particles split
					{
						p: 2.0,
						v: {
							'fluc0.x': -s,	// [P6]
							'fluc0.y': 0,
							'fluc0.a': 0,
							'fluc0.s': 2,

							'part1.x': -s,	// [P3]
							'part1.y': h/2,
							'part1.a': 1,

							'fluc1.x': -s,	// [P2] -> P8
							'fluc1.y': -h/2,
							'fluc1.a': 1,
							'fluc1.s': 1,

							'part2.x': -s,	// [P2] -> P4
							'part2.y': -h/2,
							'part2.a': 0,

							'part3.x': -s,	// [P2] -> P5
							'part3.y': -h/2,
							'part3.a': 0,

							'cam.x': -s,
							'cam.y': -h/2,
							'cam.z': 1200,
						}
					},

					// [P5] Second fluctiation goes aways
					{
						p: 2.5,
						v: {
							'fluc0.s': 0.000001,

							'fluc1.x': -s/2,	// [P8]
							'fluc1.y': -h*2/3,
							'fluc1.a': 0,
							'fluc1.s': 6,

							'part2.x': -s/2,	// [P4]
							'part2.y': -h,
							'part2.a': 1,

							'part3.x': -s/2,	// [P5] -> P9
							'part3.y': -h/4,
							'part3.a': 1,

							'cam.x': -s/2,
							'cam.y': 0,
							'cam.z': 1050,
						}
					},

					// [P9] Second fluctiation goes aways
					{
						p: 3.0,
						v: {
							'fluc1.s': 0.000001,

							'part3.x': 0,		// [P9]
							'part3.y': 0,
							'part3.a': 1,

							'cam.x': 0,
							'cam.z': 900,
						}
					},

					// [P9] Second fluctiation goes aways
					{
						p: 4.0,
						v: {
							'cam.z': 1800,
						}
					},

				]

			]
		};

		return Scene;

	}

);