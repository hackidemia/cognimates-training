var scene, camera, controls, renderer, stats, parameters;
var geo, mat;
var textureLoader;
var coordinates;
var spinLoader;

var resultArray = [];


var requestData = {};
var categoryColor = {};

var opt;
var tsne;
var count;
var particles;

var numberStep = 0;
var initSuc = false;

var textObj;
var canvas1;

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

var planeGroup = [];
var outlineGroup = [];
var catColorGroup = [];

var labels = [];

var instrucGroup = ["Hover To See Predictions","Drag to Change the View","Scroll to Zoom In/Out","Try Cluster Frame Mode","Play with the Cluster Parameters"];
var loadingGroup = ["Connecting to WebDNN...","Loading Resent Model...","Preparing T-SNE...","Running T-SNE...","Rendering..."];
var loadingCount = 0;
var loadingNote;

// Init gui
var params = {
  mode: 2,
  edgeStrength: 3.0,
  edgeGlow: 0.0,
  edgeThickness: 1.0,
  pulsePeriod: 0,
  rotate: false,
  usePatternTexture: false,
  useClusterFrame: false,
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

var gui = new dat.GUI( { width: 350 } );
gui.add(params, 'mode', { ClusterFrame: 0, CategoryFrame: 1, NoFrame: 2 } ).name('Mode').onChange(function(value){
  console.log(value);
  if(value == 2){
    removeFrame();
  }else{
    displayFrame();
  }

});
// gui.add( params, 'useClusterFrame' ).name('Add Cluster Frame').onChange( function ( value ) {
//   for ( var i = 0; i < outlineGroup.length; i ++ ) {
//     var object = outlineGroup[ i ];
//     object.visible = value;
//   }
// } );
gui.add( params, 'rotate' ).name('Auto Rotate').onChange( function ( value ) {
  controls.autoRotate = !controls.autoRotate;
} );
gui.add( params, 'epsilon',1,50 ).name('Learning Rate').onChange( function ( value ) {
  epsilon = value;
} );
gui.add( params, 'perplexity',5,50 ).name('Neighbors Influenced').onChange( function ( value ) {
  perplexity = value;
} );
gui.add( params, 'step',1,30000 ).name('Target t-SNE Step').onChange( function ( value ) {
  step = value;
} );
gui.add( params, 'currentStep',0,30000 ).name('Current t-SNE Step').listen();
gui.add(reset,'reset').name('Reset');
dat.GUI.toggleHide();

$(document).ready(function() {
  init();
  animate();
});

function init(){
    displayLoadingNote();
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x408fd6);
    

    // fov : Number, aspect : Number, near : Number, far : Number
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    camera.position.z = 1500;
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
    //resnet & tsne
    $(function(){
        fetchImage().done(function(){
            run_entry().then(function(){
                dists = resultArray;
                prepareTsne(dists,epsilon,perplexity);       
                doTsne().done(function(){
                    loadFiles().then(()=>{
                      initSuc = true;
                      hideInstruc();
                      dat.GUI.toggleHide();
                      removeSpinner();
                      removeLoadingNote();
                    }
                    );
                });
            });
        });
    });
    // postprocessing
    composer = new THREE.EffectComposer( renderer );
    var renderPass = new THREE.RenderPass( scene, camera );
    composer.addPass( renderPass );

    outlinePass = new THREE.OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    composer.addPass( outlinePass );
    effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
    effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
    effectFXAA.renderToScreen = true;
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
      var intersects = raycaster.intersectObjects(planeGroup,true);
      if ( intersects.length > 0 ) {
        var selectedObject = intersects[ 0 ].object;
        addSelectedObject( selectedObject );
        if(params.mode==2){
          outlinePass.selectedObjects = selectedObjects;
        }else{
          outlinePass.selectedObjects = [];
        }
        $('#tip').text(selectedObject.userData.note);
        $('#tip').css({
          'background-color': 'rgba(255,255,255,0.95)',
          'width': '100px',
          'border' : '1px solid #408fd6',
          'border-radius': '15px',
          'color' : '#408fd6',
          'font-size': '10px',
          'text-align' : 'center',
          'word-wrap': 'break-word',
          'white-space':'pre-wrap',
          'display' : 'block'
        });
        positionTip(selectedObject.position);
      } else {
        outlinePass.selectedObjects = [];
        $('#tip').css('display', 'none');
      }

    }
}

function positionTip(pos3D) {

  var p = new THREE.Vector3(pos3D.x, pos3D.y, pos3D.z);
  var vector = p.project(camera);

  vector.x = (vector.x + 1) / 2 * window.innerWidth;
  vector.y = -(vector.y - 1) / 2 * window.innerHeight;
  $('#tip').css({ left: vector.x,top: vector.y });
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
          categoryColor[item.label] = getRandomColor();
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

function removeSpinner(){
  $('.progress').hide();
}

function animate() {
    requestAnimationFrame( animate );
    render();
    composer.render();
}

function render(){

    var time = Date.now() * 0.00005;
    controls.update();

    for ( var i = 0; i < scene.children.length; i ++ ) {
      var object = scene.children[ i ];
      object.quaternion.copy(camera.quaternion);
    }

    $(function(){
      if(numberStep < step){
        if(initSuc){
          if(!controls.enabled){
            controls.enabled = true;
          }
          doTsne().done(function(){
            updatePos();
            numberStep++;
            params.currentStep++;
          });
          if(numberStep==50){
            displayInstruction();
          }
        }
        //controls.autoRotate = false;
      }else{
        //controls.autoRotate = true;
      }
    });
    //composer.render();
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

async function loadFiles(){

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
    minVal = -1;
    maxVal = 1;
    coordinates.forEach(coorPos => {
      coorPos[0] = centerPos[0] + (coorPos[0]-centerPos[0])*mulNum;
      if (coorPos[0]<minVal) minVal = coorPos[0];
      if (coorPos[0]>maxVal) maxVal = coorPos[0];
      coorPos[1] = centerPos[1] + (coorPos[1]-centerPos[1])*mulNum;
      if (coorPos[1]<minVal) minVal = coorPos[1];
      if (coorPos[1]>maxVal) maxVal = coorPos[1];
      coorPos[2] = centerPos[2] + (coorPos[2]-centerPos[2])*mulNum;
      if (coorPos[2]<minVal) minVal = coorPos[2];
      if (coorPos[2]>maxVal) maxVal = coorPos[2];
    });

    var sampleURI;
    count = 0;
    Object.keys(requestData).forEach(function(key) {
      var catColor = categoryColor[key];
      requestData[key].forEach(function (arrayItem) {
          var x = coordinates[count][0];
          var y = coordinates[count][1];
          var z = coordinates[count][2];

          const scale = (num, in_min, in_max, out_min, out_max) => {
            return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
          }
          var r = scale(x, minVal, maxVal, 0, 1);
          var g = scale(y, minVal, maxVal, 0, 1);
          var b = scale(z, minVal, maxVal, 0, 1);
          //var colorOutline = new THREE.Color();
          //colorOutline.setHSL( r, g, b );

          geo = new THREE.PlaneBufferGeometry(80,80);
          var cluColor = new THREE.Color( r, g, b );

          var outlineColor;
          if(params.mode == 0){
            outlineColor = cluColor;
          }else{
            outlineColor = catColor;
          }

          mat = new THREE.MeshBasicMaterial( { color: outlineColor, side: THREE.DoubleSide} );
          var planeOutline = new THREE.Mesh( geo, mat );
          planeOutline.position.x = x;
          planeOutline.position.y = y;
          planeOutline.position.z = z;
          planeOutline.scale.multiplyScalar(1.3);
          planeOutline.geometry.verticesNeedUpdate = true;
          planeOutline.position.needsUpdate = true;
          planeOutline.geometry.computeFaceNormals();
          planeOutline.geometry.computeBoundingSphere();
          planeOutline.receiveShadow = true;
          planeOutline.castShadow = true;
          planeOutline.visible = false;
          outlineGroup.push(planeOutline);
          catColorGroup.push(catColor);
          scene.add( planeOutline );

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
          plane.userData.note = labels[count];
          plane.renderOrder = 1;
          planeGroup.push(plane);
          scene.add( plane );

          count++;
      });
    });
    resolve("Done!");
  });
}

function updatePos(){
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
  minVal = -1;
  maxVal = 1;
  coordinates.forEach(coorPos => {
    coorPos[0] = centerPos[0] + (coorPos[0]-centerPos[0])*mulNum;
    if (coorPos[0]<minVal) minVal = coorPos[0];
    if (coorPos[0]>maxVal) maxVal = coorPos[0];
    coorPos[1] = centerPos[1] + (coorPos[1]-centerPos[1])*mulNum;
    if (coorPos[1]<minVal) minVal = coorPos[1];
    if (coorPos[1]>maxVal) maxVal = coorPos[1];
    coorPos[2] = centerPos[2] + (coorPos[2]-centerPos[2])*mulNum;
    if (coorPos[2]<minVal) minVal = coorPos[2];
    if (coorPos[2]>maxVal) maxVal = coorPos[2];
  });

  var idxCount = 0;
  for ( var i = 0; i < planeGroup.length; i ++ ) {
    var object = planeGroup[ i ];
    var objectOutline = outlineGroup[ i ];

    const scale = (num, in_min, in_max, out_min, out_max) => {
      return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    }
    objectOutline.position.x = coordinates[idxCount][0];
    objectOutline.position.y = coordinates[idxCount][1];
    objectOutline.position.z = coordinates[idxCount][2];
    var r = scale(objectOutline.position.x, minVal, maxVal, 0, 1);
    var g = scale(objectOutline.position.y, minVal, maxVal, 0, 1);
    var b = scale(objectOutline.position.z, minVal, maxVal, 0, 1);
    var cluColor = new THREE.Color( r, g, b );

    var outlineColor;
    if(params.mode == 0){
      outlineColor = cluColor;
    }else{
      outlineColor = catColorGroup[i];
    }

    objectOutline.material.color.set( outlineColor );
    objectOutline.geometry.verticesNeedUpdate = true;
    objectOutline.position.needsUpdate = true;
    objectOutline.geometry.computeFaceNormals();
    objectOutline.geometry.computeBoundingSphere();

    object.position.x = coordinates[idxCount][0];
    object.position.y = coordinates[idxCount][1];
    object.position.z = coordinates[idxCount][2];
    object.geometry.verticesNeedUpdate = true;
    object.position.needsUpdate = true;
    object.geometry.computeFaceNormals();
    object.geometry.computeBoundingSphere();

    idxCount ++;
  }
}

function hideInstruc(){
  $('#fadeout').hide();
}

function displayLoadingNote(){
  loadingNote = setInterval(changeLoadingText, 2000);
}
function changeLoadingText() {
  newText = loadingGroup[loadingCount%loadingGroup.length];
  $('#fadeout').text(newText);
  loadingCount++;
}
function removeLoadingNote(){
  clearInterval(loadingNote);
}

function displayInstruction(){
  $('.images').css('display',"block");
  $('#zoom').css('animation', 'fadeZoom 5s forwards');
  $('#drag').css('animation', 'fadeDrag 10s forwards');
}

function displayFrame(){
  for ( var i = 0; i < outlineGroup.length; i ++ ) {
    var object = outlineGroup[ i ];
    object.visible = true;
    console.log("Display");
  }
}

function removeFrame(){
  for ( var i = 0; i < outlineGroup.length; i ++ ) {
    var object = outlineGroup[ i ];
    object.visible = false;
    console.log("Remove");
  }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function getRandomColor(){
  return new THREE.Color( Math.random(), Math.random(), Math.random() );
}