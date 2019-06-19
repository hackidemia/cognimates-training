let scene, camera, controls, renderer, stats, parameters;
let geo, mat=[];
let textureLoader;
let frameCount = 0;

init();
animate();

function init(){
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();

    // fov : Number, aspect : Number, near : Number, far : Number
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    camera.position.z = 10;
    controls.update();

    //setup
    geo = new THREE.BufferGeometry();
    var vertices = [];
    textureLoader = new THREE.TextureLoader();

    // var sprite1 = textureLoader.load( 'http://localhost:8000/textures/sprites/snowflake1.png' );
    // var sprite2 = textureLoader.load( 'http://localhost:8000/textures/sprites/snowflake2.png' );
    // var sprite3 = textureLoader.load( 'http://localhost:8000/textures/sprites/snowflake3.png' );
    // var sprite4 = textureLoader.load( 'http://localhost:8000/textures/sprites/snowflake4.png' );
    // var sprite5 = textureLoader.load( 'http://localhost:8000/textures/sprites/snowflake5.png' );
    var images = [];
    var dir = "textures/samples";
    var fileextension = ".png";
    var tmpSample;

    var promise = Promise.resolve($.ajax({
        //This will retrieve the contents of the folder if the folder is configured as 'browsable'
        url: dir,
        success: function (data) {
            //List all .png file names in the page
            $(data).find("a:contains(" + fileextension + ")").each(function () {
                var filename = this.href.replace(window.location.host, "").replace("http://", "");
                var tmpsrc = "http://"+window.location.host+"/"+dir+filename;
                tmpSample = textureLoader.load(tmpsrc);
                images.push(tmpSample);
            });
        }
    }));

    // for ( var i = 0; i < 1; i ++ ) {
    //     var x = Math.random() * 2000 - 1000;
    //     var y = Math.random() * 2000 - 1000;
    //     var z = Math.random() * 2000 - 1000;
    //     vertices.push( x, y, z );
    // }
    // geo.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

    promise.then(function() {
        // alert('all promises complete!');
        // console.log(images.length);
    
        // console.log(typeof images[2]);
    
        for ( var i = 0; i < images.length; i ++ ) {
            vertices = [];
            geo = new THREE.BufferGeometry();
            var x = Math.random() * window.innerWidth-window.innerWidth/2;
            var y = Math.random() * window.innerHeight-window.innerHeight/2;
            var z = Math.random() * window.innerHeight-window.innerHeight/2;
            vertices.push( x, y, z );
            geo.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

            mat[ i ] = new THREE.PointsMaterial( { size: 100, map: images[i], blending: THREE.AdditiveBlending, depthTest: false, transparent: true } );
            //mat[ i ].color.setHSL( color[ 0 ], color[ 1 ], color[ 2 ] );
            var particles = new THREE.Points( geo, mat[ i ] );
            particles.rotation.x = Math.random() * 6;
            // particles.rotation.y = Math.random() * 6;
            // particles.rotation.z = Math.random() * 6;
            scene.add( particles );
        }
    });
    
    
}

function animate() {
    requestAnimationFrame( animate );
    render();
    renderer.render( scene, camera );
    frameCount++;
}

function render(){
    // let t = performance.now();
    var time = Date.now() * 0.00005;
    //console.log(performance.now());

    for ( var i = 0; i < scene.children.length; i ++ ) {
        var object = scene.children[ i ];
        if ( object instanceof THREE.Points ) {
            //object.rotation.y = time * ( i < 4 ? i + 1 : - ( i + 1 ) );
        }
    }

    // for ( var i = 0; i < mat.length; i ++ ) {
    //     var color = parameters[ i ][ 0 ];
    //     var h = ( 360 * ( color[ 0 ] + time ) % 360 ) / 360;
    //     mat[ i ].color.setHSL( h, color[ 1 ], color[ 2 ] );
    // }


    // box.rotation.x += 0.01;
    // box.rotation.y += 0.01;

    // pinLight.position.x = Math.sin(t * 0.001) * 7;
    // pinLight.position.z = Math.cos(t * 0.001) * 7;

    // pinLightShape.position.x = pinLight.position.x;
    // pinLightShape.position.y = pinLight.position.y;
    // pinLightShape.position.z = pinLight.position.z;
    // // THREE.Math.clamp;

    controls.update();
}

