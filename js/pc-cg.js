"use strict";

import * as cg from "./cg.js";
import * as m4 from "./glmjs/mat4.js";
import * as v3 from "./glmjs/vec3.js";
import * as twgl from "./twgl-full.module.js";

async function main() {
  const gl = document.querySelector("#canvitas").getContext("webgl2");
  if (!gl) return undefined !== console.log("WebGL 2.0 not supported");

  twgl.setDefaults({ attribPrefix: "a_" });

  const vertSrc = await fetch("glsl/pc-cg.vert").then((r) => r.text());
  const fragSrc = await fetch("glsl/pc-cg.frag").then((r) => r.text());
  const meshProgramInfo = twgl.createProgramInfo(gl, [vertSrc, fragSrc]);
  const cubex = await cg.loadObj(
    "models/crate/crate.obj",
    gl,
    meshProgramInfo,
  );
  const vertSrcLS = await fetch("glsl/ls.vert").then((r) => r.text());
  const fragSrcLS = await fetch("glsl/ls.frag").then((r) => r.text());
  const lsProgramInfo = twgl.createProgramInfo(gl, [vertSrcLS, fragSrcLS]);
  const lightSource = await cg.loadObj(
    "models/cubito/cubito.obj",
    gl,
    lsProgramInfo,
  );

  const cam = new cg.Cam([0, 0, 25], 5);
  const rotationAxis = new Float32Array([1, 0.5, 0]);

  let aspect = 1;
  let deltaTime = 0;
  let lastTime = 0;
  let theta = 0;

  const numObjs = 1; //10;
  const positions = new Array(numObjs);
  positions[0] = [0.0, 0.0, 0.0];
  /*const delta = new Array(numObjs);
  const deltaG = -9.81;
  const rndb = (a, b) => Math.random() * (b - a) + a;
  for (let i = 0; i < numObjs; i++) {
    positions[i] = [
      rndb(-13.0, 13.0),
      rndb(6.0, 12.0),
      rndb(-13.0, 13.0),
    ];
    delta[i] = [rndb(-1.1, 1.1), 0.0, rndb(-1.1, 1.1)];
  }*/

  const globalUniforms = {
    u_world: m4.create(),
    u_projection: m4.create(),
    u_view: cam.viewM4,
  };

  const crateLightUniforms = {
    u_ambientLight: new Float32Array([1.0, 1.0, 1.0]),
    u_lightPosition: new Float32Array([0.0, 0.0, 0.0]),
    u_viewPosition: cam.pos,
  };
  const lsUniforms = {
    u_lightColor: v3.fromValues(1, 1, 1),
  };
  const lightRotAxis = new Float32Array([0.0, 0.0, 0.0]);
  const lightRotSource = new Float32Array([5.0, 0.5, 5.0]);

  const lsScale = new Float32Array([0.1, 0.1, 0.1]);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  function render(elapsedTime) {
    elapsedTime *= 1e-3;
    deltaTime = elapsedTime - lastTime;
    lastTime = elapsedTime;

    if (twgl.resizeCanvasToDisplaySize(gl.canvas)) {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      aspect = gl.canvas.width / gl.canvas.height;
    }
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    theta = elapsedTime * Math.PI * 2 / 16;

    m4.identity(globalUniforms.u_projection);
    m4.perspective(globalUniforms.u_projection, cam.zoom, aspect, 0.1, 100);

    gl.useProgram(lsProgramInfo.program);
    m4.identity(globalUniforms.u_world);
    m4.translate(
      globalUniforms.u_world,
      globalUniforms.u_world,
      crateLightUniforms.u_lightPosition,
    );
    m4.scale(globalUniforms.u_world, globalUniforms.u_world, lsScale);
    twgl.setUniforms(lsProgramInfo, globalUniforms);
    twgl.setUniforms(lsProgramInfo, lsUniforms);

    for (const { bufferInfo, vao, material } of lightSource) {
      gl.bindVertexArray(vao);
      twgl.setUniforms(lsProgramInfo, {}, material);
      twgl.drawBufferInfo(gl, bufferInfo);
    }

    gl.useProgram(meshProgramInfo.program);

    v3.rotateY(
      crateLightUniforms.u_lightPosition,
      lightRotSource,
      lightRotAxis,
      -theta,
    );

    for (let i = 0; i < numObjs; i++) {
      m4.identity(globalUniforms.u_world);
      m4.translate(
        globalUniforms.u_world,
        globalUniforms.u_world,
        positions[i],
      );
      m4.rotate(
        globalUniforms.u_world,
        globalUniforms.u_world,
        theta,
        rotationAxis,
      );
      twgl.setUniforms(meshProgramInfo, globalUniforms);

      twgl.setUniforms(meshProgramInfo, crateLightUniforms);

      for (const { bufferInfo, vao, material } of cubex) {
        gl.bindVertexArray(vao);
        twgl.setUniforms(meshProgramInfo, {}, material);
        twgl.drawBufferInfo(gl, bufferInfo);
      }
      // Update position
      /*for (let j = 0; j < 3; j++) {
        positions[i][j] += delta[i][j] * deltaTime;
        if (positions[i][j] > 13.0) {
          positions[i][j] = 13.0;
          delta[i][j] = -delta[i][j];
          if (j == 1) delta[i][j] = 0.0;
        } else if (positions[i][j] < -13.0) {
          positions[i][j] = -13.0;
          delta[i][j] = -delta[i][j];
        }
      }
      delta[i][1] += deltaG * deltaTime;*/
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  document.addEventListener("keydown", (e) => {
    /**/ if (e.key === "w") cam.processKeyboard(cg.FORWARD, deltaTime);
    else if (e.key === "a") cam.processKeyboard(cg.LEFT, deltaTime);
    else if (e.key === "s") cam.processKeyboard(cg.BACKWARD, deltaTime);
    else if (e.key === "d") cam.processKeyboard(cg.RIGHT, deltaTime);
  });
  document.addEventListener("mousemove", (e) => cam.movePov(e.x, e.y));
  document.addEventListener("mousedown", (e) => cam.startMove(e.x, e.y));
  document.addEventListener("mouseup", () => cam.stopMove());
  document.addEventListener("wheel", (e) => cam.processScroll(e.deltaY));
}

main();
