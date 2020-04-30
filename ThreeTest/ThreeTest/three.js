
import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r110/build/three.module.js';
import { TrackballControls } from 'https://threejsfundamentals.org/threejs/resources/threejs/r110/examples/jsm/controls/TrackballControls.js';
import { OrbitControls } from 'https://threejsfundamentals.org/threejs/resources/threejs/r110/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'https://threejsfundamentals.org/threejs/resources/threejs/r110/examples/jsm/loaders/FBXLoader.js';
import { DDSLoader } from 'https://threejsfundamentals.org/threejs/resources/threejs/r110/examples/jsm/loaders/DDSLoader.js';
import { PMREMGenerator } from 'https://threejsfundamentals.org/threejs/resources/threejs/r110/examples/jsm/pmrem/PMREMGenerator.js';
import { PMREMCubeUVPacker } from 'https://threejsfundamentals.org/threejs/resources/threejs/r110/examples/jsm/pmrem/PMREMCubeUVPacker.js';
import { GUI } from 'https://threejsfundamentals.org/threejs/resources/threejs/r110/examples/jsm/libs/dat.gui.module.js';

function httpGet(requestedWebPage) {

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", requestedWebPage, false); // false for synchronous request
    xmlHttp.send();
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
        return xmlHttp.responseText;
}
var id = 41;
var data = httpGet("https://servexusinc.com/api/Model/GetAllInfo/" + id);
var productData = JSON.parse(data);
console.log(productData);

var artifactCanvas = document.getElementById('artifactCanvas');


var container, stats, controls;
var camera, scene, renderer, light;
var clock = new THREE.Clock();
var mixer;
var bulbLight, bulbMat, hemiLight, stats;

var params = {
    shadows: true,
    exposure: 0.55,
    bulbPower: 6,
    hemiIrradiance: 18
};



init();
animate();
function init() {

    container = document.createElement('div');
    document.body.appendChild(container);
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(100, 100, 300);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);


    var bulbGeometry = new THREE.SphereBufferGeometry(0.02, 16, 8);
    bulbLight = new THREE.PointLight(0xffffff, 5000, 5000, 2);
    bulbMat = new THREE.MeshStandardMaterial({
        emissive: 0xffffee,
        emissiveIntensity: 1,
        color: 0x000000
    });
    bulbLight.add(new THREE.Mesh(bulbGeometry, bulbMat));
    bulbLight.position.set(0, 250, 0);
    bulbLight.castShadow = true;
    scene.add(bulbLight);

    hemiLight = new THREE.HemisphereLight(0xEEEEEE, 0xaaaaaa, 0.02); //0x0f0e0d
    scene.add(hemiLight);


    // ground
    var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(500, 500), new THREE.MeshPhongMaterial({ color: 0xDDDDDD, depthWrite: false }));
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);
    var grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    //scene.add(grid);
    // model


    var ddsLoader = new DDSLoader();

    var cubeMapTexture = new THREE.CubeTextureLoader().setPath('/public/scene/bridge/')
        .load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'], function (rgbmCubeMap) {
            rgbmCubeMap.encoding = THREE.RGBM16Encoding;
            rgbmCubeMap.format = THREE.RGBAFormat;
            var pmremGenerator = new PMREMGenerator(rgbmCubeMap);
            pmremGenerator.update(renderer);
            var pmremCubeUVPacker = new PMREMCubeUVPacker(pmremGenerator.cubeLods);
            pmremCubeUVPacker.update(renderer);
            var rgbmCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;

            rgbmCubeMap.magFilter = THREE.LinearFilter;
            rgbmCubeMap.needsUpdate = true;
            //scene.background = rgbmCubeMap;
            pmremGenerator.dispose();
            pmremCubeUVPacker.dispose();
        });
    cubeMapTexture.exposure = 1;
   
    var fbxLoader = new FBXLoader();

    fbxLoader.load('public/models/Vero.fbx', function (object) {
        var childMaterial = [new THREE.MeshStandardMaterial()];
        var numberOfLayers = 0;
        object.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
            if (child.name != "") {
                child.visible = productData.DefaultLayers.includes(child.name);

                console.log(child.name + ": " + child.visible);

                var loader = new THREE.TextureLoader();

               
                childMaterial[numberOfLayers] = new THREE.MeshStandardMaterial({
                    map: loader.load('/public/textures/three_vero/' + child.name + '/BaseColor.jpg'),
                    bumpMap: loader.load('/public/textures/three_vero/' + child.name + '/Height.jpg'),
                    metalnessMap: loader.load('/public/textures/three_vero/' + child.name + '/Metallic.jpg'),
                    normalMap: loader.load('/public/textures/three_vero/' + child.name + '/Normal.jpg'),
                    roughnessMap: loader.load('/public/textures/three_vero/' + child.name + '/Roughness.jpg'),
                    aoMap: loader.load('/public/textures/three_vero/' + child.name + '/AO.jpg'),
                    envMap: cubeMapTexture, 
                    metalness: 0,
                    roughness: 1,

                });
                if (child.name.includes("Base")) {
                    childMaterial[numberOfLayers].metalness = 0.4;
                    childMaterial[numberOfLayers].roughness = 0.3;
                            }
                
                childMaterial[numberOfLayers].map.wrapS = THREE.RepeatWrapping;
                childMaterial[numberOfLayers].roughnessMap.wrapS = THREE.RepeatWrapping;
                childMaterial[numberOfLayers].metalnessMap.wrapS = THREE.RepeatWrapping;
                childMaterial[numberOfLayers].normalMap.wrapS = THREE.RepeatWrapping;



                child.material = childMaterial[numberOfLayers];
                numberOfLayers++;
            }
        });
        scene.add(object);
        console.log(object);

    });


    renderer = new THREE.WebGLRenderer({ canvas: artifactCanvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 50, 0);
    controls.update();
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.4;
    controls.staticMoving = true;
    controls.update();

    var gui = new GUI();
    gui.add(params, 'hemiIrradiance', 10, 30);
    gui.add(params, 'bulbPower', 0, 200);
    gui.add(params, 'exposure', 0, 1);
    gui.add(params, 'shadows');
    gui.open();


    window.addEventListener('resize', onWindowResize, false);
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    var delta = clock.getDelta();
    renderer.render(scene, camera);
    controls.update();

    render();
}

var previousShadowMap = false;
function render() {
    renderer.toneMappingExposure = Math.pow(params.exposure, 4.0); // to allow for very bright scenes.
    renderer.shadowMap.enabled = params.shadows;
    bulbLight.castShadow = params.shadows;
    if (params.shadows !== previousShadowMap) {

        previousShadowMap = params.shadows;
    }
    bulbLight.power = params.bulbPower;
    bulbMat.emissiveIntensity = bulbLight.intensity / Math.pow(0.02, 2.0); // convert from intensity to irradiance at bulb surface
    hemiLight.intensity = params.hemiIrradiance;
    var time = Date.now() * 0.0005;
    //bulbLight.position.y = Math.cos(time) * 0.75 + 1.25;
    renderer.render(scene, camera);
}
