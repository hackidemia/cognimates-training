let scene, camera, controls, renderer, stats, parameters;
let geo, mat;
let textureLoader;
let coordinates;

let resultArray = [];


let requestData = {};

var opt;
var tsne;
var count;
var particles;

var numberStep = 0;
var initSuc = false;

$(document).ready(function() {
  init();
});
animate();

function init(){
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();

    // fov : Number, aspect : Number, near : Number, far : Number
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.01, 10000 );
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    camera.position.z = 10;
    controls.minDistance = -700;
    controls.maxDistance = 1500;
    controls.update();

    //setup
    geo = new THREE.BufferGeometry();
    textureLoader = new THREE.TextureLoader();



    $(function(){
        fetchImage().done(function(){
            run_entry().then(function(){
                dists = resultArray;
                prepareTsne(dists);
                doTsne().done(function(){
                    loadFiles();
                    initSuc = true;
                });
            });
        });
    });

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
    }, 2000);
    return dfrd1.promise();
}

function animate() {
    requestAnimationFrame( animate );
    render();
    renderer.render( scene, camera );
}

function render(){
    var time = Date.now() * 0.00005;
    numberStep++;

    $(function(){
      if(numberStep < 1200){
        if(initSuc){
          doTsne().done(function(){
            updatePos();
          });
        }else{
          console.log("Loading");
        }
      }
    });
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


function prepareTsne(dists){
  opt = {};
  opt.epsilon = 10; // epsilon is learning rate (10 = default)
  opt.perplexity = 30; // roughly how many neighbors each point influences (30 = default)
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
    }, 1000);
    return dfrd1.promise();
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
  for ( var i = 0; i < scene.children.length; i ++ ) {
      var object = scene.children[ i ];
      if ( object instanceof THREE.Points ) {

        object.geometry.attributes.position.array[0] = coordinates[idxCount][0] * mulNum;
        object.geometry.attributes.position.array[1] = coordinates[idxCount][0] * mulNum;
        object.geometry.attributes.position.array[2] = coordinates[idxCount][0] * mulNum;
        object.geometry.attributes.position.needsUpdate = true;
        object.geometry.computeBoundingSphere();
        idxCount ++;
      }
  }
}


function loadFiles(){
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
  var mulNum = Math.ceil(700/maxVal);
  var vertices = [];
  var sampleURI;
  var imageVector;

  count = 0;
  Object.keys(requestData).forEach(function(key) {
    requestData[key].forEach(function (arrayItem) {

        vertices = [];
        geo = new THREE.BufferGeometry();

        var x = coordinates[count][0] * mulNum;
        var y = coordinates[count][1] * mulNum;
        var z = coordinates[count][2] * mulNum;

        vertices.push( x, y, z );
        geo.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

        sampleURI = arrayItem;
        mat = new THREE.PointsMaterial( { size: 100, map: textureLoader.load(sampleURI)} );
        particles = new THREE.Points( geo, mat );

        particles.rotation.x = Math.random() * 6;
        scene.add( particles );

        count++;
    });
  });
}
