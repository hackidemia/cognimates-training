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
var particles;

var stepCount = 0;
var initSuc = false;

var textObj;
var canvas1;

var composer, effectFXAA, outlinePass;
var raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 1;

var mouse = new THREE.Vector2();
var selectedObjects = [];

var particlesGruop =[];

var planeGroup = [];
var outlineGroup = [];
var catColorGroup = [];

var labels = [];

var instrucGroup = ["Hover To See Predictions","Drag to Change the View","Scroll to Zoom In/Out","Try Cluster Frame Mode","Play with the Cluster Parameters"];
var loadingGroup = ["Connecting to WebDNN...","Loading Resnet Model...","Preparing T-SNE...","Running T-SNE...","Rendering..."];
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
  targetStep: 5000,
  currentStep: 0,
  perplexity: 30,
  epsilon: 10
};

var reset = { reset:function(){ 
  if(initSuc){
    stepCount = 0;
    params.currentStep = 0;
    prepareTsne(dists,params.epsilon,params.perplexity);
  } 
}};

var gui = new dat.GUI( { width: 350 } );
gui.add(params, 'mode', { ClusterFrame: 0, CategoryFrame: 1, NoFrame: 2 } ).name('Mode').onChange(function(value){
  if(value == 2){
    removeFrame();
  }else{
    displayFrame();
  }
});

gui.add( params, 'rotate' ).name('Auto Rotate').onChange( function ( value ) {
  controls.autoRotate = !controls.autoRotate;
} );
gui.add( params, 'epsilon',1,50 ).name('Learning Rate');
gui.add( params, 'perplexity',5,50 ).name('Neighbors Influenced');
gui.add( params, 'targetStep',1,30000 ).name('Target t-SNE Step');
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
    $(function(){
        fetchImage().then(function(){
            run_entry().then(function(){
                dists = resultArray;
                prepareTsne(dists,params.epsilon,params.perplexity);       
                doTsne().then(function(){
                    loadFiles().then(()=>{
                      initSuc = true;
                      hideLoadingNote();
                      hideSpinner();
                      removeLoadingNote();
                      dat.GUI.toggleHide();
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

function onWindowResize() {
  var width = window.innerWidth;
  var height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize( width, height );
  composer.setSize( width, height );
  effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
}

async function fetchImage(){
  return new Promise((resolve, reject) => {
    var examplesData = window.opener.visualizerData;
    examplesData.training_data.forEach((item) => {
      requestData[item.label] = item.label_items;
      categoryColor[item.label] = getRandomColor();
    });
    Object.keys(requestData).forEach(function(key) {
      for (var idx = 0; idx < requestData[key].length; idx++) {
        requestData[key][idx] = "data:image/jpeg;base64," + requestData[key][idx];
      }
    });
    resolve("Done");
  });
}

function animate() {
    requestAnimationFrame( animate );
    render();
    composer.render();
}

function render(){

    if(initSuc){
      //enable control
      if(!controls.enabled){
        controls.enabled = true;
      }

      //display zoom/drag instruc
      if(stepCount == 50){
        displayInstruc();
      }

      //do remain steps
      if(stepCount < params.targetStep){
        doTsne().then(function(){
          updatePos();
          stepCount++;
        });     
      }else{
        updateFrameColor();
      }

      //update control
      controls.update();

      //update model
      doBillboard();

      //update gui
      updateCurrentStep();
    }
}


function prepareTsne(dists,epsilon,perplexity){
  opt = {};
  opt.epsilon = epsilon; // epsilon is learning rate (10 = default)
  opt.perplexity = perplexity; // roughly how many neighbors each point influences (30 = default)
  opt.dim = 3; // dimensionality of the embedding (2 = default)
  tsne = new tsnejs.tSNE(opt);
  tsne.initDataRaw(dists);
}

async function doTsne(){
  return new Promise((resolve, reject) => {
    tsne.step();
    coordinates = tsne.getSolution();
    resolve("Done");
  });
}

async function loadFiles(){
  return new Promise((resolve, reject) => {
    mapPos();

    var sampleURI;
    var count = 0;
    Object.keys(requestData).forEach(function(key) {
      requestData[key].forEach(function (arrayItem) {
          var x = coordinates[count][0];
          var y = coordinates[count][1];
          var z = coordinates[count][2];

          var catColor = getCatColorByKey(key);
          var cluColor = getCluColor(x,y,z);
          var outlineColor = getOutlineColor(catColor,cluColor);

          geo = new THREE.PlaneBufferGeometry(80,80);
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

          sampleURI = arrayItem;
          geo = new THREE.PlaneBufferGeometry(80,80);
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
    resolve("Done");
  });
}

function updatePos(){
  mapPos();

  for ( var i = 0; i < planeGroup.length; i ++ ) {
    var object = planeGroup[ i ];
    var objectOutline = outlineGroup[ i ];

    objectOutline.position.x = coordinates[i][0];
    objectOutline.position.y = coordinates[i][1];
    objectOutline.position.z = coordinates[i][2];
    var catColor = getCatColorByIdx(i);
    var cluColor = getCluColor(objectOutline.position.x, objectOutline.position.y, objectOutline.position.z);
    var outlineColor = getOutlineColor(catColor,cluColor);
    objectOutline.material.color.set( outlineColor );
    objectOutline.geometry.verticesNeedUpdate = true;
    objectOutline.position.needsUpdate = true;
    objectOutline.geometry.computeFaceNormals();
    objectOutline.geometry.computeBoundingSphere();

    object.position.x = coordinates[i][0];
    object.position.y = coordinates[i][1];
    object.position.z = coordinates[i][2];
    object.geometry.verticesNeedUpdate = true;
    object.position.needsUpdate = true;
    object.geometry.computeFaceNormals();
    object.geometry.computeBoundingSphere();
  }
}

function hideSpinner(){
  $('.progress').hide();
}

function hideLoadingNote(){
  $('#fadeout').hide();
}

function displayLoadingNote(){
  loadingNote = setInterval(changeLoadingNote, 2000);
}
function changeLoadingNote() {
  newText = loadingGroup[loadingCount%loadingGroup.length];
  $('#fadeout').text(newText);
  loadingCount++;
}
function displayLoadingError(error){
  $('#fadeout').text(error);
}
function removeLoadingNote(){
  clearInterval(loadingNote);
}

function displayInstruc(){
  $('.instruc').css('display',"block");
  $('#zoom').css('animation', 'fadeZoom 5s forwards');
  $('#drag').css('animation', 'fadeDrag 10s forwards');
}

function displayFrame(){
  for ( var i = 0; i < outlineGroup.length; i ++ ) {
    var object = outlineGroup[ i ];
    object.visible = true;
  }
}

function removeFrame(){
  for ( var i = 0; i < outlineGroup.length; i ++ ) {
    var object = outlineGroup[ i ];
    object.visible = false;
  }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function getRandomColor(){
  return new THREE.Color( Colors.random() );
}

function doBillboard(){
  for ( var i = 0; i < scene.children.length; i ++ ) {
    var object = scene.children[ i ];
    object.quaternion.copy(camera.quaternion);
  }
}

function positionTip(pos3D) {
  var p = new THREE.Vector3(pos3D.x, pos3D.y, pos3D.z);
  var vector = p.project(camera);
  vector.x = (vector.x + 1) / 2 * window.innerWidth;
  vector.y = -(vector.y - 1) / 2 * window.innerHeight;
  $('#tip').css({ left: vector.x,top: vector.y });
}

function getCenterPos(){
  var centerPos = [0,0,0];
  var pointsCount = 0;
  coordinates.forEach(coorPos => {
      centerPos[0] += coorPos[0];
      centerPos[1] += coorPos[1];
      centerPos[2] += coorPos[2];
      pointsCount ++;
  });
  centerPos.forEach(centerPosVal =>{
    centerPosVal /= pointsCount;
  });
  return centerPos;
}

function getMulNum(){
  var minmax = getMinMax();
  var minVal = minmax.minVal;
  var maxVal = minmax.maxVal;
  return window.innerWidth/2/maxVal;
}

function mapPos(){
  var centerPos = getCenterPos();
  var mulNum = getMulNum();
  coordinates.forEach(coorPos => {
    coorPos[0] = centerPos[0] + (coorPos[0]-centerPos[0])*mulNum;
    coorPos[1] = centerPos[1] + (coorPos[1]-centerPos[1])*mulNum;
    coorPos[2] = centerPos[2] + (coorPos[2]-centerPos[2])*mulNum;
  });
}

function getMinMax(){
  var minVal = 1;
  var maxVal = -1;
  coordinates.forEach(coorPos => {
    coorPos.forEach(coorVal => {
      if (coorVal > maxVal){
        maxVal = coorVal;
      }
      if(coorVal < minVal){
        minVal = coorVal;
      }
    })
  });
  return {
    minVal: minVal,
    maxVal: maxVal,
  };
}

function getOutlineColor(catColor,cluColor){
  var outlineColor;
  if(params.mode == 0){
    outlineColor = cluColor;
  }else{
    outlineColor = catColor;
  }
  return outlineColor;
}

function getCatColorByKey(key){
  return categoryColor[key];
}

function getCatColorByIdx(i){
  return catColorGroup[i];
}

function getCluColor(x,y,z){
  var minmax = getMinMax();
  var minVal = minmax.minVal;
  var maxVal = minmax.maxVal;
  const scale = (num, in_min, in_max, out_min, out_max) => {
    return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
  }
  var r = scale(x, minVal, maxVal, 0, 1);
  var g = scale(y, minVal, maxVal, 0, 1);
  var b = scale(z, minVal, maxVal, 0, 1);
  return new THREE.Color( r, g, b );
}

function updateCurrentStep(){
  params.currentStep = stepCount;
}

function updateFrameColor(){
  for ( var i = 0; i < outlineGroup.length; i ++ ) {
    var objectOutline = outlineGroup[ i ];
    var catColor = getCatColorByIdx(i);
    var cluColor = getCluColor(objectOutline.position.x, objectOutline.position.y, objectOutline.position.z);
    var outlineColor = getOutlineColor(catColor,cluColor);
    objectOutline.material.color.set( outlineColor );
  }
}