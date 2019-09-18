let scene, camera, controls, renderer, stats, parameters;
let geo, mat;
let textureLoader;
let coordinates;
var spinLoader;

let resultArray = [];


let requestData = {};

var opt;
var tsne;
var count;
var particles;

var numberStep = 0;
var initSuc = false;

let textObj;
let canvas1;

var composer, effectFXAA, outlinePass;
var raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 1;

var mouse = new THREE.Vector2();
var selectedObjects = [];
var group = new THREE.Group();
var step = 5000;
var perplexity = 30;
var epsilon =10;

var particlesGruop =[];


var params = {
  edgeStrength: 3.0,
  edgeGlow: 0.0,
  edgeThickness: 1.0,
  pulsePeriod: 0,
  rotate: false,
  usePatternTexture: false,
  step: 5000,
  currentStep: 0,
  perplexity: 30,
  epsilon: 10
};

var reset = { reset:function(){ 
  if(initSuc){
    numberStep = 0;
    params.currentStep = 0;
    prepareTsne(dists,epsilon,perplexity);
  } 
}};

var autoRotate = { autoRotate:function(){controls.autoRotate = !controls.autoRotate}};

// Init gui

var gui = new dat.GUI( { width: 300 } );
gui.add( params, 'edgeStrength', 0.01, 10 ).onChange( function ( value ) {
  outlinePass.edgeStrength = Number( value );
} );
gui.add( params, 'edgeGlow', 0.0, 1 ).onChange( function ( value ) {
  outlinePass.edgeGlow = Number( value );
} );
gui.add( params, 'edgeThickness', 1, 4 ).onChange( function ( value ) {
  outlinePass.edgeThickness = Number( value );
} );
gui.add( params, 'pulsePeriod', 0.0, 5 ).onChange( function ( value ) {
  outlinePass.pulsePeriod = Number( value );
} );
// gui.add( params, 'rotate' );
gui.add( params, 'usePatternTexture' ).onChange( function ( value ) {
  outlinePass.usePatternTexture = value;
} );
gui.add( params, 'epsilon',1,50 ).onChange( function ( value ) {
  epsilon = value;
} );
gui.add( params, 'perplexity',5,50 ).onChange( function ( value ) {
  perplexity = value;
} );
gui.add( params, 'step',1,30000 ).onChange( function ( value ) {
  step = value;
} );
gui.add( params, 'currentStep',0,30000 ).listen();
gui.add(autoRotate,'autoRotate');
gui.add(reset,'reset');

var Configuration = function () {
  this.visibleEdgeColor = '#ffffff';
  this.hiddenEdgeColor = '#190a05';
};
var conf = new Configuration();
gui.addColor( conf, 'visibleEdgeColor' ).onChange( function ( value ) {
  outlinePass.visibleEdgeColor.set( value );
} );
gui.addColor( conf, 'hiddenEdgeColor' ).onChange( function ( value ) {
  outlinePass.hiddenEdgeColor.set( value );
} );


$(document).ready(function() {
  init();
  animate();
});

function init(){
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    scene.background = new THREE.Color('red');

    // fov : Number, aspect : Number, near : Number, far : Number
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    camera.position.z = 300;
    controls.minDistance = -700;
    controls.maxDistance = 1500;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.update();
    controls.enabled = false;

    //setup
    geo = new THREE.BufferGeometry();
    textureLoader = new THREE.TextureLoader();

    //light
    scene.add( new THREE.AmbientLight( 0xaaaaaa, 0.2 ) );
    var light = new THREE.DirectionalLight( 0xddffdd, 0.6 );
    light.position.set( 1, 1, 1 );
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    var d = 10;
    light.shadow.camera.left = - d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = - d;
    light.shadow.camera.far = 1000;
    scene.add( light );

    //model
    updateProgressBar(10);
    //resnet & tsne
    $(function(){
        fetchImage().done(function(){
            updateProgressBar(35);
            run_entry().then(function(){
                updateProgressBar(70);
                dists = resultArray;
                //console.log(dists);
                prepareTsne(dists,epsilon,perplexity);
                updateProgressBar(80);             
                doTsne().done(function(){
                    updateProgressBar(90);
                    loadFiles2().then(()=>{
                      updateProgressBar(100);
                      initSuc = true;
                      removeProgressBar();
                    }
                    );
                });
            });
        });
    });
    var geometry = new THREE.TorusBufferGeometry( 1, 0.3, 16, 100 );
    var material = new THREE.MeshPhongMaterial( { color: 0xffaaff } );
    var torus = new THREE.Mesh( geometry, material );
    torus.position.z = - 4;
    //group.add( torus );
    torus.receiveShadow = true;
    torus.castShadow = true;

    // postprocessing
    composer = new THREE.EffectComposer( renderer );
    var renderPass = new THREE.RenderPass( scene, camera );
    composer.addPass( renderPass );

    outlinePass = new THREE.OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    composer.addPass( outlinePass );
    var onLoad = function ( texture ) {
      outlinePass.patternTexture = texture;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
    };

    var loader = new THREE.TextureLoader();
    loader.load( '/visualizer/resnet/textures/tri_pattern.jpg', onLoad );
    effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
    effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
    composer.addPass( effectFXAA );

    window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'mousemove', onTouchMove );
    window.addEventListener( 'touchmove', onTouchMove );

    function onTouchMove( event ) {
      var x, y;
      if ( event.changedTouches ) {
        x = event.changedTouches[ 0 ].pageX;
        y = event.changedTouches[ 0 ].pageY;
      } else {
        x = event.clientX;
        y = event.clientY;
      }
      mouse.x = ( x / window.innerWidth ) * 2 - 1;
      mouse.y = - ( y / window.innerHeight ) * 2 + 1;
      checkIntersection();
    }

    function addSelectedObject( object ) {
      selectedObjects = [];
      selectedObjects.push( object );
    }

    function checkIntersection() {
      raycaster.setFromCamera( mouse, camera );
      var intersects = raycaster.intersectObjects( scene.children,true);
      //console.log([ scene ]);
      //console.log(scene.children);
      if ( intersects.length > 0 ) {
        var selectedObject = intersects[ 0 ].object;
        addSelectedObject( selectedObject );
        outlinePass.selectedObjects = selectedObjects;
        console.log(outlinePass);
      } else {
        // outlinePass.selectedObjects = [];
      }

    }
}

function onWindowResize() {

  var width = window.innerWidth;
  var height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize( width, height );
  composer.setSize( width, height );

  effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );

}


function fetchImage(){
    var dfrd1 = $.Deferred();
    setTimeout(function(){
        var examplesData = window.opener.visualizerData;
        examplesData.training_data.forEach((item) => {
          requestData[item.label] = item.label_items;
        });

        Object.keys(requestData).forEach(function(key) {
          for (let idx = 0; idx < requestData[key].length; idx++) {
            requestData[key][idx] = "data:image/jpeg;base64," + requestData[key][idx];
          }
        });
        dfrd1.resolve();
    }, 0);
    return dfrd1.promise();
}

function updateProgressBar(valeur){
  $('.progress-bar').css('width', valeur+'%').attr('aria-valuenow', valeur).text(valeur+"%");  
}

function successProgressBar(){
  $('.progress-bar').addClass('progress-bar-success');    
}

function removeProgressBar(){
  $('.progress').hide();
}

function animate() {
    requestAnimationFrame( animate );
    render();
    composer.render();
    renderer.render( scene, camera );
}

function render(){

    var time = Date.now() * 0.00005;
    controls.update();
    //console.log(step);

    $(function(){
      if(numberStep < step){
        if(initSuc){
          if(!controls.enabled){
            controls.enabled = true;
          }
          doTsne().done(function(){
            updatePos3();
            numberStep++;
            params.currentStep++;
          });
        }
        //controls.autoRotate = false;
      }else{
        //controls.autoRotate = true;
      }
    });

    //composer.render();
}

function getCamLoc(){
  return camera.position;
}

function calcDist(pos1,pos2){
  let a = new THREE.Vector3( pos1.x, pos1.y, pos1.z );
  let b = new THREE.Vector3( pos2[0], pos2[1], pos2[2]);
  return a.distanceTo( b );
}

function addFrame(pos){
  if (calcDist(getCamLoc,pos) < 50){
    console.log("Found one!");
  }
}

function createGround(width, height){
  var result = [];
  for (var i = 0 ; i < width; i++) {
      result[i] = [];
      for (var j = 0; j < height; j++) {
          result[i][j] = Math.random();
      }
  }
  return result;
}

function base64DecToArr (sBase64, nBlockSize) {

    var
      sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""), nInLen = sB64Enc.length,
      nOutLen = nBlockSize ? Math.ceil((nInLen * 3 + 1 >>> 2) / nBlockSize) * nBlockSize : nInLen * 3 + 1 >>> 2, aBytes = new Uint8Array(nOutLen);

    for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
      nMod4 = nInIdx & 3;
      nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
      if (nMod4 === 3 || nInLen - nInIdx === 1) {
        for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
          aBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
        }
        nUint24 = 0;
      }
    }

    return aBytes;
  }

  function b64ToUint6 (nChr) {

    return nChr > 64 && nChr < 91 ?
        nChr - 65
      : nChr > 96 && nChr < 123 ?
        nChr - 71
      : nChr > 47 && nChr < 58 ?
        nChr + 4
      : nChr === 43 ?
        62
      : nChr === 47 ?
        63
      :
        0;

  }


function prepareTsne(dists,epsilon,perplexity){
  opt = {};
  opt.epsilon = epsilon; // epsilon is learning rate (10 = default)
  opt.perplexity = perplexity; // roughly how many neighbors each point influences (30 = default)
  opt.dim = 3; // dimensionality of the embedding (2 = default)
  tsne = new tsnejs.tSNE(opt);
  tsne.initDataRaw(dists);
}

function doTsne(){
    var dfrd1 = $.Deferred();
    setTimeout(function(){
      tsne.step();
      coordinates = tsne.getSolution();
      dfrd1.resolve();
    }, 0);
    return dfrd1.promise();
}

function updatePos2(){
  let centerPos = [0,0,0];
  let pointsCount = 0;
  coordinates.forEach(coorPos => {
      centerPos[0] += coorPos[0];
      centerPos[1] += coorPos[1];
      centerPos[2] += coorPos[2];
      pointsCount ++;
  });
  centerPos.forEach(centerPosVal =>{
    centerPosVal /= pointsCount;
  });

  var minVal = 1;
  var maxVal = -1;
  coordinates.forEach(coorPos => {
    coorPos.forEach(coorVal => {
      if (coorVal > maxVal){
        maxVal = coorVal;
      }
      if (coorVal < minVal){
        minVal = coorVal;
      }
    })
  });

  var mulNum = window.innerWidth/2/maxVal;
  coordinates.forEach(coorPos => {
    coorPos[0] = centerPos[0] + (coorPos[0]-centerPos[0])*mulNum;
    coorPos[1] = centerPos[1] + (coorPos[1]-centerPos[1])*mulNum;
    coorPos[2] = centerPos[2] + (coorPos[2]-centerPos[2])*mulNum;
  });


  var idxCount = 0;
  for ( var i = 0; i < scene.children.length; i ++ ) {
    var object = scene.children[ i ];
    if ( object instanceof THREE.Points ) {
      object.geometry.attributes.position.array[0] = coordinates[idxCount][0];
      object.geometry.attributes.position.array[1] = coordinates[idxCount][1];
      object.geometry.attributes.position.array[2] = coordinates[idxCount][2];
      object.geometry.attributes.position.needsUpdate = true;
      object.geometry.computeBoundingSphere();
      //object.geometry.computeBoundingBox();
      //console.log(object.geometry.boundingSphere.radius = 30);
      idxCount ++;
    }
    if (object.name == "loadingSign") {
      scene.remove(object);
    }
  }
}

function updatePos(){
  var minVal = 1;
  var maxVal = -1;
  coordinates.forEach(coorPos => {
    coorPos.forEach(coorVal => {
      if (coorVal > maxVal){
        maxVal = coorVal;
      }
      if (coorVal < minVal){
        minVal = coorVal;
      }
    })
  });

  var idxCount = 0;
  var mulNum = 700/maxVal;
  //console.log(mulNum);
  for ( var i = 0; i < scene.children.length; i ++ ) {
      var object = scene.children[ i ];
      if ( object instanceof THREE.Points ) {

        object.geometry.attributes.position.array[0] = coordinates[idxCount][0] * mulNum;
        object.geometry.attributes.position.array[1] = coordinates[idxCount][1] * mulNum;
        object.geometry.attributes.position.array[2] = coordinates[idxCount][2] * mulNum;
        object.geometry.attributes.position.needsUpdate = true;
        object.geometry.computeBoundingSphere();
        //addFrame(object.geometry.attributes.position.array);
        idxCount ++;
      }
  }
}


async function loadFiles(){

  return new Promise((resolve, reject) => {
    // var minVal = 1;
    // var maxVal = -1;
    // coordinates.forEach(coorPos => {
    //   coorPos.forEach(coorVal => {
    //     if (coorVal > maxVal){
    //       maxVal = coorVal;
    //     }
    //     if (coorVal < minVal){
    //       minVal = coorVal;
    //     }
    //   })
    // });
    // var mulNum = Math.ceil(700/maxVal);

    let centerPos = [0,0,0];
    let pointsCount = 0;
    coordinates.forEach(coorPos => {
        centerPos[0] += coorPos[0];
        centerPos[1] += coorPos[1];
        centerPos[2] += coorPos[2];
        pointsCount ++;
    });
    centerPos.forEach(centerPosVal =>{
      centerPosVal /= pointsCount;
    });
  
    var minVal = 1;
    var maxVal = -1;
    coordinates.forEach(coorPos => {
      coorPos.forEach(coorVal => {
        if (coorVal > maxVal){
          maxVal = coorVal;
        }
        if (coorVal < minVal){
          minVal = coorVal;
        }
      })
    });
  
    var mulNum = window.innerWidth/2/maxVal;
    coordinates.forEach(coorPos => {
      coorPos[0] = centerPos[0] + (coorPos[0]-centerPos[0])*mulNum;
      coorPos[1] = centerPos[1] + (coorPos[1]-centerPos[1])*mulNum;
      coorPos[2] = centerPos[2] + (coorPos[2]-centerPos[2])*mulNum;
    });

    var vertices = [];
    var sampleURI;
    var imageVector;

    count = 0;
    Object.keys(requestData).forEach(function(key) {
      requestData[key].forEach(function (arrayItem) {

          vertices = [];
          geo = new THREE.BufferGeometry();

          var x = coordinates[count][0];
          var y = coordinates[count][1];
          var z = coordinates[count][2];

          vertices.push( x, y, z );
          geo.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
          geo.computeBoundingBox();

          sampleURI = arrayItem;
          mat = new THREE.PointsMaterial( { size: 100, map: textureLoader.load(sampleURI)} );
          particles = new THREE.Points( geo, mat );
          
          //group.add(particles);
          //console.log(group);

          //particles.rotation.x = Math.random() * 6;
          particles.receiveShadow = true;
          particles.castShadow = true;
          scene.add( particles );

          count++;
      });
    });
    resolve("Done!");
  });
}

async function loadFiles2(){

  return new Promise((resolve, reject) => {
    let centerPos = [0,0,0];
    let pointsCount = 0;
    coordinates.forEach(coorPos => {
        centerPos[0] += coorPos[0];
        centerPos[1] += coorPos[1];
        centerPos[2] += coorPos[2];
        pointsCount ++;
    });
    centerPos.forEach(centerPosVal =>{
      centerPosVal /= pointsCount;
    });
  
    var minVal = 1;
    var maxVal = -1;
    coordinates.forEach(coorPos => {
      coorPos.forEach(coorVal => {
        if (coorVal > maxVal){
          maxVal = coorVal;
        }
        if (coorVal < minVal){
          minVal = coorVal;
        }
      })
    });
  
    var mulNum = window.innerWidth/2/maxVal;
    coordinates.forEach(coorPos => {
      coorPos[0] = centerPos[0] + (coorPos[0]-centerPos[0])*mulNum;
      coorPos[1] = centerPos[1] + (coorPos[1]-centerPos[1])*mulNum;
      coorPos[2] = centerPos[2] + (coorPos[2]-centerPos[2])*mulNum;
    });

    var sampleURI;
    count = 0;
    Object.keys(requestData).forEach(function(key) {
      requestData[key].forEach(function (arrayItem) {
          var x = coordinates[count][0];
          var y = coordinates[count][1];
          var z = coordinates[count][2];

          geo = new THREE.PlaneBufferGeometry(80,80);
          sampleURI = arrayItem;
          mat = new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, map: textureLoader.load(sampleURI)} );
          var plane = new THREE.Mesh( geo, mat );
          plane.position.x = x;
          plane.position.y = y;
          plane.position.z = z;
          plane.geometry.verticesNeedUpdate = true;
          plane.position.needsUpdate = true;
          plane.geometry.computeFaceNormals();
          plane.geometry.computeBoundingSphere();
          plane.receiveShadow = true;
          plane.castShadow = true;
          scene.add( plane );
          count++;
      });
    });
    resolve("Done!");
  });
}

function updatePos3(){
  let centerPos = [0,0,0];
  let pointsCount = 0;
  coordinates.forEach(coorPos => {
      centerPos[0] += coorPos[0];
      centerPos[1] += coorPos[1];
      centerPos[2] += coorPos[2];
      pointsCount ++;
  });
  centerPos.forEach(centerPosVal =>{
    centerPosVal /= pointsCount;
  });

  var minVal = 1;
  var maxVal = -1;
  coordinates.forEach(coorPos => {
    coorPos.forEach(coorVal => {
      if (coorVal > maxVal){
        maxVal = coorVal;
      }
      if (coorVal < minVal){
        minVal = coorVal;
      }
    })
  });

  var mulNum = window.innerWidth/2/maxVal;
  coordinates.forEach(coorPos => {
    coorPos[0] = centerPos[0] + (coorPos[0]-centerPos[0])*mulNum;
    coorPos[1] = centerPos[1] + (coorPos[1]-centerPos[1])*mulNum;
    coorPos[2] = centerPos[2] + (coorPos[2]-centerPos[2])*mulNum;
  });


  var idxCount = 0;
  for ( var i = 0; i < scene.children.length; i ++ ) {
    var object = scene.children[ i ];
    if ( object instanceof THREE.Mesh ) {
      object.position.x = coordinates[idxCount][0];
      object.position.y = coordinates[idxCount][1];
      object.position.z = coordinates[idxCount][2];
      object.geometry.verticesNeedUpdate = true;
      object.position.needsUpdate = true;
      object.geometry.computeFaceNormals();
      object.geometry.computeBoundingSphere();
      idxCount ++;
    }
    if (object.name == "loadingSign") {
      scene.remove(object);
    }
  }
}
