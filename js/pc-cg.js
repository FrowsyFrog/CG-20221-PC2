"use strict";

import * as cg from "./cg.js";
import * as v3 from "./glmjs/vec3.js";
import * as v4 from "./glmjs/vec4.js";
import * as m4 from "./glmjs/mat4.js";
import * as twgl from "./twgl-full.module.js";

async function main() {
  const ambientLight = document.querySelector("#ambient");
  const lightTheta = document.querySelector("#theta");

  const rambient = document.querySelector("#rambient");
  const gambient = document.querySelector("#gambient");
  const bambient = document.querySelector("#bambient");

  const rdiff = document.querySelector("#rdiff");
  const gdiff = document.querySelector("#gdiff");
  const bdiff = document.querySelector("#bdiff");

  const rflash = document.querySelector("#rflash");
  const gflash = document.querySelector("#gflash");
  const bflash = document.querySelector("#bflash");

  const lintensity = document.querySelector("#lintensity");


  const gl = document.querySelector("#canvitas").getContext("webgl2");
  if (!gl) return undefined !== console.log("WebGL 2.0 not supported");
  let autorotate = true;

  twgl.setDefaults({ attribPrefix: "a_" });

  //loading models
  let vertSrc = await cg.fetchText("glsl/pc-cg.vert");
  let fragSrc = await cg.fetchText("glsl/pc-cg.frag");
  const objPrgInf = twgl.createProgramInfo(gl, [vertSrc, fragSrc]);
  const obj = await cg.loadObj(
    "models/crate/crate.obj",
    gl,
    objPrgInf,
  );
  vertSrc = await cg.fetchText("glsl/ls.vert");
  fragSrc = await cg.fetchText("glsl/ls.frag");
  const lsPrgInf = twgl.createProgramInfo(gl, [vertSrc, fragSrc]);
  const lightbulb = await cg.loadObj(
    "models/cubito/cubito.obj",
    gl,
    lsPrgInf,
  );

  //setup
  const cam = new cg.Cam([0, 0, 6], 5);

  let aspect = 16.0 / 9.0;
  let deltaTime = 0;
  let lastTime = 0;
  let theta = 0;

  const world = m4.create();
  const projection = m4.create();

  // some preloaded arrays to optimize memory usage
  const rotationAxis = new Float32Array([0, 1, 0]);
  const temp = v3.create();
  const one = v3.fromValues(1, 1, 1);
  const initial_light_pos = v3.fromValues(3.0, 0, 0);
  const origin = v4.create();
  const light_position = v3.create();

  const coords = {
    u_world: world,
    u_projection: projection,
    u_view: cam.viewM4,
  };
  const light0 = {

    u_ambientIntensity: 0.05,
    u_ambientColor: v4.fromValues(1, 1, 1, 1),
    u_lintensity: 1.0,
    u_viewPosition: cam.pos,

    //dirlight
    "u_dirLight.direction": v3.fromValues(-1, 1, -1),
    "u_dirLight.diffuse": 1.0,
    "u_dirLight.specular": 1.0,
    "u_dirLight.color": v4.fromValues(1, 1, 1, 1),

    //spotlight
    "u_spotLight.diffuse": 1.0,
    "u_spotLight.specular": 1.0,
    "u_spotLight.color": v4.fromValues(1, 1, 1, 1),

    "u_spotLight.cutOff": Math.cos(Math.PI / 15.0),
    "u_spotLight.outerCutOff": Math.cos(Math.PI / 12),
    "u_spotLight.direction": cam.lookAt,
    "u_spotLight.position": cam.pos,
    "u_spotLight.constant": 1.0,
    "u_spotLight.linear": 0.09,
    "u_spotLight.quadratic": 0.032,

    //lamplight
    "u_lampLight.diffuse": 1.0,
    "u_lampLight.specular": 1.0,
    "u_lampLight.color": v4.fromValues(1, 0, 0, 1),

    "u_lampLight.cutOff": Math.cos(Math.PI / 15.0),
    "u_lampLight.outerCutOff": Math.cos(Math.PI / 12),
    "u_lampLight.direction": v3.fromValues(0, 0, 1),
    "u_lampLight.position": light_position,
    "u_lampLight.constant": 1.0,
    "u_lampLight.linear": 0.09,
    "u_lampLight.quadratic": 0.032,
  };
  const light1 = {
    u_lightColor: v3.fromValues(1, 1, 1),
  };
  // multiple objects positions
	const numObjs = 100;
  const positions = new Array(numObjs);
	const rndb = (a, b) => Math.random() * (b - a) + a;
	for (let i = 0; i < numObjs; ++i) {
		positions[i] = [rndb(-13.0, 13.0), rndb(-12.0, 12.0), rndb(-14.0, 14.0)];
	}

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  // Render awesome
  function render(elapsedTime) {
    // handling time in seconds maybe
    elapsedTime *= 1e-3;
    deltaTime = elapsedTime - lastTime;
    lastTime = elapsedTime;

    // resizing stuff and general preparation
    if (twgl.resizeCanvasToDisplaySize(gl.canvas)) {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      aspect = gl.canvas.width / gl.canvas.height;
    }
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // some logic to move the light around
    // if (autorotate) theta += deltaTime;
    // if (theta > Math.PI * 2) theta -= Math.PI * 2;
    // m4.identity(world);
    // m4.rotate(world, world, theta, rotationAxis);
    // m4.translate(world, world, initial_light_pos);
    // v3.transformMat4(light_position, origin, world);

    // coordinate system adjustments
    m4.identity(projection);
    m4.perspective(projection, cam.zoom, aspect, 0.1, 100);

    // drawing object 1
    gl.useProgram(objPrgInf.program);
    twgl.setUniforms(objPrgInf, light0);
    twgl.setUniforms(objPrgInf, light1);

    for (const pos of positions) {
      m4.identity(world);
      m4.scale(world, world, v3.scale(temp, one, 1));
      m4.translate(world, world, pos);
      m4.rotate(world, world, theta, rotationAxis);
      twgl.setUniforms(objPrgInf, coords);
      for (const { bufferInfo, vao, material } of obj) {
        gl.bindVertexArray(vao);
        twgl.setUniforms(objPrgInf, {}, material);
        twgl.drawBufferInfo(gl, bufferInfo);
      }
		}

    // logic to move the visual representation of the light source
    m4.identity(world);
    m4.translate(world, world, light_position);
    m4.scale(world, world, v3.scale(temp, one, 0.025));

    // drawing the light source cube
    gl.useProgram(lsPrgInf.program);
    twgl.setUniforms(lsPrgInf, coords);
    twgl.setUniforms(lsPrgInf, light1);

    for (const { bufferInfo, vao } of lightbulb) {
      gl.bindVertexArray(vao);
      twgl.drawBufferInfo(gl, bufferInfo);
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  function updateAmbientLight(){
    const value = ambientLight.value;
    light0["u_ambientIntensity"] = value / 100.0;
  }

  document.addEventListener("keydown", (e) => {
    /**/ if (e.key === "w") cam.processKeyboard(cg.FORWARD, deltaTime);
    else if (e.key === "a") cam.processKeyboard(cg.LEFT, deltaTime);
    else if (e.key === "s") cam.processKeyboard(cg.BACKWARD, deltaTime);
    else if (e.key === "d") cam.processKeyboard(cg.RIGHT, deltaTime);
    else if (e.key === "r") autorotate = !autorotate;
  });
  canvitas.addEventListener("mousemove", (e) => cam.movePov(e.x, e.y));
  canvitas.addEventListener("mousedown", (e) => cam.startMove(e.x, e.y));
  canvitas.addEventListener("mouseup", () => cam.stopMove());
  canvitas.addEventListener("wheel", (e) => cam.processScroll(e.deltaY));
  ambientLight.addEventListener("change", () => {updateAmbientLight();});
  lightTheta.addEventListener("change", () => {
    const value = lightTheta.value;
    theta = value * Math.PI / 180.0;
  });

  rambient.addEventListener("change", () => {light0["u_ambientColor"][0] = rambient.value / 100.0;});
  gambient.addEventListener("change", () => {light0["u_ambientColor"][1] = gambient.value / 100.0;});
  bambient.addEventListener("change", () => {light0["u_ambientColor"][2] = bambient.value / 100.0;});

  rdiff.addEventListener("change", () => {light0["u_dirLight.color"][0] = rdiff.value / 100.0;});
  gdiff.addEventListener("change", () => {light0["u_dirLight.color"][1] = gdiff.value / 100.0;});
  bdiff.addEventListener("change", () => {light0["u_dirLight.color"][2] = bdiff.value / 100.0;});

  rflash.addEventListener("change", () => {light0["u_spotLight.color"][0] = rflash.value / 100.0;});
  gflash.addEventListener("change", () => {light0["u_spotLight.color"][1] = gflash.value / 100.0;});
  bflash.addEventListener("change", () => {light0["u_spotLight.color"][2] = bflash.value / 100.0;});

  lintensity.addEventListener("change", () => {light0["u_lintensity"] = lintensity.value / 100.0;});
}


main();
