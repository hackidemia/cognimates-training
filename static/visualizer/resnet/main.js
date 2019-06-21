let scene, camera, controls, renderer, stats, parameters;
let geo, mat;//mat=[]
let textureLoader;
let frameCount = 0;
let coordinates;

let resultArray = [];


let requestData;

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
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    camera.position.z = 10;
    controls.update();

    //setup
    geo = new THREE.BufferGeometry();
    textureLoader = new THREE.TextureLoader();

    //extract features for images
    /*
    1.fetchImage();
    2.run_entry();
    3.modify dists;

    var dists = createGround(20,100);

    console.log(result);

    //do tsne and render images
    $(function(){
      doTsne(dists).done(function(){
          loadFiles();
      });
    });
    */

    $(function(){
        fetchImage().done(function(){
            run_entry().then(function(){
                console.log(resultArray);
                dists = resultArray;
                //var dists = createGround(20,100);
                doTsne(dists).done(function(){
                    loadFiles();
                });
            });
        });
    });

}

function fetchImage(){
    var dfrd1 = $.Deferred();
    setTimeout(function(){
        // doing async stuff
        var examplesData = window.opener.visualizerData;
        requestData = window.opener.visualizerData.training_data;
        examplesData.training_data.forEach((item) => {
          requestData[item.label] = item.label_items;
        });
        console.log(requestData);
        console.log('task 1 in fetchImage is done!');
        dfrd1.resolve();
    }, 2000);
    return dfrd1.promise();
}

function function2(){
    var dfrd1 = $.Deferred();
    setTimeout(function(){
        // doing async stuff
        console.log('task 1 in function2 is done!');
        dfrd1.resolve();
    }, 2000);
    return dfrd1.promise();
}


function animate() {
    requestAnimationFrame( animate );
    render();
    renderer.render( scene, camera );
    frameCount++;
}

function render(){
    var time = Date.now() * 0.00005;
    //var timer = 0.0001 * Date.now();

    for ( var i = 0; i < scene.children.length; i ++ ) {
        var object = scene.children[ i ];
        if ( object instanceof THREE.Points ) {
            //object.rotation.y = time * ( i < 4 ? i + 1 : - ( i + 1 ) );
            //object.geometry.attributes.position.array[0] += time*0.001;
            //console.log(object.geometry.attributes.position.array[1]);
            // object.position.x = 5000 * Math.cos( timer + i );
            // object.position.y = 5000 * Math.sin( timer + i * 1.1 );
        }
    }
    controls.update();
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

function doTsne(dists){
    var dfrd1 = $.Deferred();

    setTimeout(function(){
      // doing async stuff
      //kaparthy tsne
      var opt = {}
      opt.epsilon = 10; // epsilon is learning rate (10 = default)
      opt.perplexity = 30; // roughly how many neighbors each point influences (30 = default)
      opt.dim = 3; // dimensionality of the embedding (2 = default)
      var tsne = new tsnejs.tSNE(opt);
      tsne.initDataDist(dists);
      for(var k = 0; k < 500; k++) {
        tsne.step(); // every time you call this, solution gets better
      }
      coordinates = tsne.getSolution();// Y is an array of 2-D points that you can plot
      console.log('task 1 in doTsne is done!');
      dfrd1.resolve();
    }, 1000);
    return dfrd1.promise();
}


function loadFiles(){
    console.log('task 1 in loadFiles is start!');
  var vertices = [];
  var sampleURI;
  var imageVector;

  var count = 0;
  //load post files
  Object.keys(requestData).forEach(function(key) {
    requestData[key].forEach(function (arrayItem) {

        vertices = [];
        geo = new THREE.BufferGeometry();

        var x = coordinates[count][0]*100000000000;
        var y = coordinates[count][1]*100000000000;
        var z = coordinates[count][2]*100000000000;

        // var x = THREE.Math.mapLinear(coordinates[count][0],0,0.000000000001,-1000,1000);
        // var y = THREE.Math.mapLinear(coordinates[count][1],0,0.000000000001,-1000,1000);
        // var z = THREE.Math.mapLinear(coordinates[count][2],0,0.000000000001,-1000,1000);

        //console.log(x,y,z);


        vertices.push( x, y, z );
        geo.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

        sampleURI = arrayItem;
        mat = new THREE.PointsMaterial( { size: 100, map: textureLoader.load(sampleURI)} );
        var particles = new THREE.Points( geo, mat );

        particles.rotation.x = Math.random() * 6;
        scene.add( particles );

        count++;
    });
  });
}
