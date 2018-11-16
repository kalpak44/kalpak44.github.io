
var container = document.getElementById( 'container' );

var renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
container.appendChild( renderer.domElement );

var camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, .1, 1000 );
camera.position.set( 0, 0, 4 );

var scene = new THREE.Scene();
scene.background = new THREE.Color( 0x4831ab );

// lights
var aLight = new THREE.AmbientLight( 0x7f46ab );
scene.add( aLight );

// ---------------------------------------------------------------
// ---------------------------------------------------------------

// clouds

var cloudsSize = new THREE.Vector3( 15, 4, 6 );
var cloudsBox = new THREE.Box3();
cloudsBox.setFromCenterAndSize( new THREE.Vector3(), cloudsSize );

// -----------------------------------------------------------------

var sphereGeo = new THREE.SphereBufferGeometry( 0.2, 32, 16 );
var cloudMat = new THREE.MeshPhongMaterial({
	color: 0xffffff,
	shininess: 0
});

var Cloud = function() {

	THREE.Group.call( this );

	this.spheres = [];

	// fill in 3 boxes with a random number of
	// randomly positioned and randomly scaled spheres

	// large base
	var center1 = new THREE.Vector3();
	var size1 = new THREE.Vector3( 1, 0.25, 0.6 );
	var number1 = THREE.Math.randInt( 10, 25 );
	var scaleRange1 = new THREE.Vector2( 0.2, 1 );
	this.fillBox( center1, size1, number1, scaleRange1 );

	// top of cloud
	var center2 = new THREE.Vector3( 0, size1.y, 0 );
	var size2 = new THREE.Vector3( 0.5, 0.25, 0.5 );
	var number2 = THREE.Math.randInt( 5, 15 );
	var scaleRange2 = new THREE.Vector2( 0.2, 1 );
	this.fillBox( center2, size2, number2, scaleRange2 );

	// small tail
	var center3 = new THREE.Vector3( -0.7, 0, 0 );
	var size3 = new THREE.Vector3( 0.4, 0.2, 0.25 );
	var number3 = THREE.Math.randInt( 3, 7 );
	var scaleRange3 = new THREE.Vector2( 0.1, 0.5 );
	this.fillBox( center3, size3, number3, scaleRange3 );

	this.userData.velocity = THREE.Math.randFloat( 0.003, 0.007 );

};

Cloud.prototype = Object.create( THREE.Group.prototype );
Cloud.prototype.constructor = Cloud;

Cloud.prototype.fillBox = function( center, size, number, scale ){

	var box = new THREE.Box3();
	box.setFromCenterAndSize( center, size );

	var boxGroup = new THREE.Group();
	boxGroup.position.copy( center );
	this.add( boxGroup );

	for ( var i = 0; i < number; i++ ) {

		var sphere = new THREE.Mesh( sphereGeo, cloudMat );

		sphere.position.set(
			THREE.Math.randFloatSpread( size.x ),
			THREE.Math.randFloatSpread( size.y ),
			THREE.Math.randFloatSpread( size.z )
		);

		sphere.userData.scale = THREE.Math.randFloat( scale.x, scale.y );
		sphere.scale.setScalar( sphere.userData.scale );

		sphere.userData.velocity = THREE.Math.randFloat( 0.001, 0.002 );

		boxGroup.add( sphere );
		this.spheres.push( sphere );

	}

	return boxGroup;

};

Cloud.prototype.update = function( t ){

	// scale individual spheres
	for ( var i = 0; i < this.spheres.length; i++ ) {
		var sphere = this.spheres[i];
		var scaleOffset = Math.sin( t + ( i + 1 ) ) * 0.4 + 1;
		sphere.scale.setScalar( sphere.userData.scale * scaleOffset );
	}

	// move entire cloud forward
	this.position.x += this.userData.velocity;

	// reset cloud position
	if ( this.position.x > cloudsBox.max.x ) {
		this.position.x = cloudsBox.min.x;
	}

};

// -----------------------------------------------------------------

// fill clouds box with clouds

var clouds = [];

for ( var i = 0; i < 40; i++ ) {

	var cloud = new Cloud();

	cloud.position.set(
		THREE.Math.randFloatSpread( cloudsSize.x ),
		THREE.Math.randFloatSpread( cloudsSize.y ),
		THREE.Math.randFloatSpread( cloudsSize.z )
	);

	scene.add( cloud );
	clouds.push( cloud );

}

// -----------------------------------------------------------------
// -----------------------------------------------------------------

// moon

var MoonShader = {

	uniforms: {

		colorA: { type: 'v3', value: scene.background },
		colorB: { type: 'v3', value: new THREE.Color('#fff') },

	},

	vertexShader: [

		"varying vec2 vUv;",
		"void main() {",
		"	vUv = uv;",
		"	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"

	].join('\n'),

	fragmentShader: [

		"varying vec2 vUv;",
		"uniform vec3 colorA;",
		"uniform vec3 colorB;",

		"void main() {",
		" float pct = smoothstep( 0.39, 0.44, vUv.y );",
		"	vec3 col = mix( colorA, colorB, pct );",
		"	gl_FragColor = vec4( col, 1.0 );",
		"}"

	].join('\n')

};

var moonGeo = new THREE.SphereBufferGeometry( 2, 32, 32 );
var moonMat = new THREE.ShaderMaterial({
	uniforms: THREE.UniformsUtils.clone( MoonShader.uniforms ),
	vertexShader: MoonShader.vertexShader,
	fragmentShader: MoonShader.fragmentShader,
});
var moon = new THREE.Mesh( moonGeo, moonMat );
moon.position.set( -3, 4, -20 );
moon.rotation.set(
	- Math.PI / 2,
	- Math.PI / 6,
	Math.PI / 4,
);
scene.add( moon );

var moonLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
moonLight.position.copy( moon.position );
scene.add( moonLight );

//

// key light

var dLight = new THREE.DirectionalLight( 0xffffff, 0.2 );
dLight.position.set( 1, 1, 1 );
scene.add( dLight );

// ---------------------------------------------------------------
// ---------------------------------------------------------------

// stars

StarShader = {

	uniforms: {

		color:   { type: 'v3', value: new THREE.Color( 0xffffff ) },
		texture: { type: 't', value: null },
		time:    { type: 'f', value: 0 },
		size:    { type: 'f', value: 500.0 }

	},

	vertexShader: [

		'uniform float time;',
		'uniform float size;',
		'attribute float alphaOffset;',
		'varying float vAlpha;',
		'uniform vec4 origin;',

		'void main() {',

			'vAlpha = 0.5 * ( 1.0 + sin( alphaOffset + time ) );',

			'vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
			'float cameraDist = distance( mvPosition, origin );',
			'gl_PointSize = size / cameraDist;',
			'gl_Position = projectionMatrix * mvPosition;',

		'}'

	].join('\n'),

	fragmentShader: [

		'uniform float time;',
		'uniform vec3 color;',
		'uniform sampler2D texture;',

		'varying float vAlpha;',

		'void main() {',
		'  gl_FragColor = vec4( color, vAlpha );',
		'  gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );',
		'}'

	].join('\n')
};

var Stars = function( options ) {

	var color = this.color = options.color || 0x333333;
	var size = this.size = options.size || 0.4;

	var pointCount = this.pointCount = options.pointCount || 40;
	var range = this.range = options.range || new THREE.Vector3( 2, 2, 2 );

	THREE.Group.call( this );

	// circle texture

	var canvas = document.createElement('canvas');
	canvas.width = canvas.height = 128;
	var ctx = canvas.getContext( '2d' );

	var centerX = canvas.width / 2;
	var centerY = canvas.height / 2;
	var radius = canvas.width / 3;

	ctx.beginPath();
	ctx.arc( centerX, centerY, radius, 0, 2 * Math.PI, false );
	ctx.fillStyle = '#fff';
	ctx.fill();

	var texture = new THREE.Texture( canvas );
	texture.premultiplyAlpha = true;
	texture.needsUpdate = true;

	//

	StarShader.uniforms.texture.value = texture;
	StarShader.uniforms.size.value = size;

	var pointsMat = new THREE.ShaderMaterial( {
		uniforms:       StarShader.uniforms,
		vertexShader:   StarShader.vertexShader,
		fragmentShader: StarShader.fragmentShader,
		blending:       THREE.AdditiveBlending,
		depthWrite: false,
		transparent:    true
	});

	var pointsGeo = new THREE.BufferGeometry();

	var positions = new Float32Array( pointCount * 3 );
	var alphas = new Float32Array( pointCount );

	for ( var i = 0; i < pointCount; i++ ) {

		positions[ i*3 + 0 ] = THREE.Math.randFloatSpread( range.x );
		positions[ i*3 + 1 ] = THREE.Math.randFloatSpread( range.y );
		positions[ i*3 + 2 ] = THREE.Math.randFloatSpread( range.z );

		alphas[ i ] = i;

	}

	pointsGeo.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	pointsGeo.addAttribute( 'alphaOffset', new THREE.BufferAttribute( alphas, 1 ) );

	var points = this.points = new THREE.Points( pointsGeo, pointsMat );
	points.sortParticles = true;
	points.renderOrder = 1;

	this.add( points );

}

Stars.prototype = Object.create( THREE.Group.prototype );
Stars.prototype.constructor = Stars;

// ---------------------------------------------------------------

var stars = new Stars({
	color: 0xffffff,
	range: new THREE.Vector3( 110, 60, 30 ),
	pointCount: 400,
	size: 400,
	speed: 0.1
});

scene.add( stars );

stars.position.z = -50;

// ---------------------------------------------------------------
// ---------------------------------------------------------------

window.addEventListener( 'resize', resize, false );
function resize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

var clock = new THREE.Clock();

renderer.setAnimationLoop( loop );

function loop() {

	var time = clock.getElapsedTime();

	for ( var i = 0; i < clouds.length; i++ ) {
		clouds[i].update( time );
	}

	stars.points.material.uniforms.time.value = time;

	renderer.render( scene, camera );
}