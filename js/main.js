
			import * as THREE from './three.module.js'; 

			import { GLTFLoader } from './GLTFLoader.js';
			import { SkeletonUtils } from './SkeletonUtils.js';
			export {THREE, GLTFLoader, SkeletonUtils};

			//////////////////////////////
			// Global objects
			//////////////////////////////
			export let worldScene, renderer, camera, clock, numLoadedModels = 0;
			export const UNITS = [
				{
					modelName: "Soldier", // Will use the 3D model from file models/gltf/Soldier.glb
					meshName: "vanguard_Mesh", // Name of the main mesh to animate
					position: { x: 0, y: 0, z: 0 }, // Where to put the unit in the scene
					scale: 2, // Scaling of the unit. 1.0 means: use original size, 0.1 means "10 times smaller", etc.
					animationName: "Idle" // Name of animation to run
				},
				{
					modelName: "Soldier",
					meshName: "vanguard_Mesh",
					position: { x: 3, y: 0, z: 0 },
					scale: 2,
					animationName: "Walk"
				},
			], mixers = [], MODELS=[];

			initScene();
			initRenderer();
			loadGltfModel ('Soldier', instantiateUnits);
			animate();
			/**
			 * Function that starts loading process for the next model in the queue. The loading process is
			 * asynchronous: it happens "in the background". Therefore we don't load all the models at once. We load one,
			 * wait until it is done, then load the next one. When all models are loaded, we call loadUnits().
			 */
			/**
			 * Look at UNITS configuration, clone necessary 3D model scenes, place the armatures and meshes in the scene and
			 * launch necessary animations
			 */
			function instantiateUnits() {

				let numSuccess = 0;

				for ( let i = 0; i < UNITS.length; ++ i ) {

					const u = UNITS[ i ];
					const model = getModelByName( u.modelName );

					if ( model ) {

						const clonedScene = SkeletonUtils.clone( model.scene );

						if ( clonedScene ) {

							// THREE.Scene is cloned properly, let's find one mesh and launch animation for it
							const clonedMesh = clonedScene.getObjectByName( u.meshName );

							if ( clonedMesh ) {

								const mixer = startAnimation( clonedMesh, model.animations, u.animationName );

								// Save the animation mixer in the list, will need it in the animation loop
								mixers.push( mixer );
								numSuccess ++;

							}

							// Different models can have different configurations of armatures and meshes. Therefore,
							// We can't set position, scale or rotation to individual mesh objects. Instead we set
							// it to the whole cloned scene and then add the whole scene to the game world
							// Note: this may have weird effects if you have lights or other items in the GLTF file's scene!
							worldScene.add( clonedScene );

							if ( u.position ) {

								clonedScene.position.set( u.position.x, u.position.y, u.position.z );

							}

							if ( u.scale ) {

								clonedScene.scale.set( u.scale, u.scale, u.scale );

							}

							if ( u.rotation ) {

								clonedScene.rotation.x = u.rotation.x;
								clonedScene.rotation.y = u.rotation.y;
								clonedScene.rotation.z = u.rotation.z;

							}

					        }

					} else {

						console.error( "Can not find model", u.modelName );

					}

				}

				console.log( `Successfully instantiated ${numSuccess} units` );

			}

			/**
			 * Start animation for a specific mesh object. Find the animation by name in the 3D model's animation array
			 * @param skinnedMesh {THREE.SkinnedMesh} The mesh to animate
			 * @param animations {Array} Array containing all the animations for this model
			 * @param animationName {string} Name of the animation to launch
			 * @return {THREE.AnimationMixer} Mixer to be used in the render loop
			 */
			function startAnimation( skinnedMesh, animations, animationName ) {

				const mixer = new THREE.AnimationMixer( skinnedMesh );
				const clip = THREE.AnimationClip.findByName( animations, animationName );

				if ( clip ) {

					const action = mixer.clipAction( clip );
					action.play();

				}

				return mixer;

			}

			/**
			 * Find a model object by name
			 * @param name
			 * @returns {object|null}
			 */
			function getModelByName( name ) {

				for ( let i = 0; i < MODELS.length; ++ i ) {

					if ( MODELS[ i ].name === name ) {

						return MODELS[ i ];

					}

				}

				return null;

			}

			/**
			 * Load a 3D model from a GLTF file. Use the GLTFLoader.
			 * @param model {object} Model config, one item from the MODELS array. It will be updated inside the function!
			 * @param onLoaded {function} A callback function that will be called when the model is loaded
			 */
			function loadGltfModel( name, onLoaded ) {

				const loader = new GLTFLoader();
				const modelName = `models/${name}.glb`;

				loader.load( modelName, function ( gltf ) {

					const scene = gltf.scene, model={name: name};

					model.animations = gltf.animations;
					model.scene = scene;

					// Enable Shadows

					gltf.scene.traverse( function ( object ) {

						if ( object.isMesh ) {

							object.castShadow = true;

						}

					} );
					MODELS.push(model);

					console.log( "Done loading model", model.name );

					onLoaded();

				} );

			}

			/**
			 * Render loop. Renders the next frame of all animations
			 */
			function animate() {

				requestAnimationFrame( animate );

				// Get the time elapsed since the last frame

				const mixerUpdateDelta = clock.getDelta();

				// Update all the animation frames

				for ( let i = 0; i < mixers.length; ++ i ) {

					mixers[ i ].update( mixerUpdateDelta );

				}

				renderer.render( worldScene, camera );

			}

			//////////////////////////////
			// General Three.JS stuff
			//////////////////////////////
			// This part is not anyhow related to the cloning of models, it's just setting up the scene.

			/**
			 * Initialize ThreeJS scene renderer
			 */
			function initRenderer() {

				const container = document.getElementById( 'container' );
				renderer = new THREE.WebGLRenderer( { antialias: true } );
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( window.innerWidth, window.innerHeight );
				renderer.outputEncoding = THREE.sRGBEncoding;
				renderer.shadowMap.enabled = true;
				renderer.shadowMap.type = THREE.PCFSoftShadowMap;
				container.appendChild( renderer.domElement );

			}

			/**
			 * Initialize ThreeJS THREE.Scene
			 */
			function initScene() {

				camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
				camera.position.set( 3, 6, - 10 );
				camera.lookAt( 0, 1, 0 );

				clock = new THREE.Clock();

				worldScene = new THREE.Scene();
				worldScene.background = new THREE.Color( 0xa0a0a0 );
				worldScene.fog = new THREE.Fog( 0xa0a0a0, 10, 22 );

				const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
				hemiLight.position.set( 0, 20, 0 );
				worldScene.add( hemiLight );

				const dirLight = new THREE.DirectionalLight( 0xffffff );
				dirLight.position.set( - 3, 10, - 10 );
				dirLight.castShadow = true;
				dirLight.shadow.camera.top = 10;
				dirLight.shadow.camera.bottom = - 10;
				dirLight.shadow.camera.left = - 10;
				dirLight.shadow.camera.right = 10;
				dirLight.shadow.camera.near = 0.1;
				dirLight.shadow.camera.far = 40;
				worldScene.add( dirLight );

				// ground
				const groundMesh = new THREE.Mesh(
					new THREE.PlaneGeometry( 40, 40 ),
					new THREE.MeshPhongMaterial( {
						color: 0x999999,
						depthWrite: false
					} )
				);

				groundMesh.rotation.x = - Math.PI / 2;
				groundMesh.receiveShadow = true;
				worldScene.add( groundMesh );
				window.addEventListener( 'resize', onWindowResize );

			}

			/**
			 * A callback that will be called whenever the browser window is resized.
			 */
			function onWindowResize() {

				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize( window.innerWidth, window.innerHeight );

			}
