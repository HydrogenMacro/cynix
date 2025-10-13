"use client";

import React, { useEffect, useRef, useState } from 'react'
import mkRegl, { Regl } from "regl";
import { mat3, mat4, vec3 } from 'gl-matrix';
import { ACTION_DEBUG_INFO } from 'next/dist/next-devtools/dev-overlay/shared';

export function View() {
    const canvasRef = useRef<HTMLCanvasElement>(null!);
    useEffect(() => {
        draw(canvasRef.current);
    }, []);
    const [windowSize, setWindowSize] = useState([0, 0]);
    useEffect(() => {
        const dpr = window.devicePixelRatio;
        setWindowSize([canvasRef.current.clientWidth * dpr, canvasRef.current.clientHeight * dpr]);
        window.addEventListener("resize", () => setWindowSize([canvasRef.current.clientWidth * dpr, canvasRef.current.clientHeight * dpr]));
    }, []);
    return <canvas className="w-full h-full" width={windowSize[0]} height={windowSize[1]} ref={canvasRef}></canvas>
}

type vec3_ = [number, number, number];
async function draw(canvas: HTMLCanvasElement) {
    await import("dbgui");
    const regl = mkRegl({ gl: canvas.getContext("webgl")!, attributes: { depth: true, antialias: true }, extensions: ["OES_standard_derivatives"] });
    
    let view = mat4.create();
    view = mat4.lookAt(view, [0, 3, 10], [0, 0, -10], [0, 1, 0]);
    const wallDrawFns = ([
        [[10, .3, 10], [0, -5, -10], RGB(250, 227, 219)], // floor
        [[10, .3, 10], [0, 5, -10], RGB(250, 227, 219)], // ceiling
        [[.3, 10, 10], [-5, 0, -10], RGB(250, 227, 219)], // left wall
        [[.3, 10, 10], [5, 0, -10], RGB(250, 227, 219)], // right wall
        [[10, 10, .3], [0, 0, -15], RGB(250, 227, 219)], // back wall
    ] as Array<[vec3_, vec3_, vec3_]>).map(([wallDims, wallPos, color]) => {
        let drawCall = mkDrawBox(regl, ...wallDims);
        return (a: any) => {
            let model = mat4.create();
            model = mat4.translate(model, model, wallPos);
            let normalMat = mat3.normalFromMat4([], mat4.multiply([], model, view));
            drawCall({ ...a, model: model, color, normalMat })
        };
    });
    
    const lightPos = [0, 5, -10];
    dbgui()
        .add("x", $slider(-20, 20, .2, () => lightPos[0]).onInput((n) => lightPos[0] = n))
        .add("y", $slider(-10, 10, .2, () => lightPos[1]).onInput((n) => lightPos[1] = n))
        .add("z", $slider(-10, 10, .2, () => lightPos[2]).onInput((n) => lightPos[2] = n))
    const drawLightVis = mkDrawBox(regl, .6, .6, .6);
    regl.frame(({ time }) => {
        regl.clear({
            color: [0, 255, 0, 255],
            depth: 1
        })
        const lightVisModel = mat4.translate([], mat4.create(), lightPos);
        drawLightVis({ view, lightPos, model: lightVisModel, color: [.2, .3, .4], normalMat: mat3.normalFromMat4([], mat4.mul([], view, lightVisModel)) })
        wallDrawFns.forEach(drawWall => drawWall({ view, lightPos }));
    })
}
export function mkDrawBox(regl: Regl, l: number, h: number, w: number) {
    let hl = l / 2;
    let hw = w / 2;
    let hh = h / 2;
    const cubePosition = [
        [-hl, +hh, +hw], [+hl, +hh, +hw], [+hl, -hh, +hw], [-hl, -hh, +hw], // positive z face
        [+hl, +hh, +hw], [+hl, +hh, -hw], [+hl, -hh, -hw], [+hl, -hh, +hw], // positive x face
        [+hl, +hh, -hw], [-hl, +hh, -hw], [-hl, -hh, -hw], [+hl, -hh, -hw], // negative z face
        [-hl, +hh, -hw], [-hl, +hh, +hw], [-hl, -hh, +hw], [-hl, -hh, -hw], // negative x face
        [-hl, +hh, -hw], [+hl, +hh, -hw], [+hl, +hh, +hw], [-hl, +hh, +hw], // top face
        [-hl, -hh, -hw], [+hl, -hh, -hw], [+hl, -hh, +hw], [-hl, -hh, +hw]  // bottom face
    ]

    const cubeUv = Array(6).fill(0).map(() => [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]);
    const cubeNormal = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].map(a => [...a, ...a, ...a, ...a]);
    const cubeElements = [
        [2, 1, 0], [2, 0, 3],       // positive z face
        [6, 5, 4], [6, 4, 7],       // positive x face
        [10, 9, 8], [10, 8, 11],    // negative z face
        [14, 13, 12], [14, 12, 15], // negative x face
        [18, 17, 16], [18, 16, 19], // top face
        [20, 21, 22], [23, 20, 22]  // bottom face
    ]
    return regl({
        frag: `
        #extension GL_OES_standard_derivatives : enable
        precision highp float;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vCenter;
    uniform vec3 lightPos;
    uniform vec3 color;
    
    void main() {
        vec3 normal = normalize(vNormal.xyz);
        float edge = length(fwidth(normal));
        float edgeFactor = smoothstep(0.2, 0.2 + 0.05, edge);
        vec3 c = vec3(mix(0., 1., edgeFactor));
        //vec3(distance(vCenter, vRelPos) / 20.) * 
        //c = vec3(0., 0., edge * 2000.);
        gl_FragColor = vec4(c, 1.);
        //gl_FragColor = vec4((normal + 1.) * .5, 1.);
    }`,

        vert: `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    attribute vec3 normal;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vCenter;
    uniform mat4 projection, view, model;
    uniform mat3 normalMat;
    uniform vec3 objSize;
    void main() {
        vUv = uv;
        vNormal = normalMat * normal;
        gl_Position = projection * view * model * vec4(position, 1);
        vCenter = vec3(model[0][3],model[1][3],model[2][3]);
    }`,

        attributes: {
            position: cubePosition,
            uv: cubeUv,
            normal: cubeNormal
        },
        elements: cubeElements,
        uniforms: {
            model: regl.prop<any, any>("model"),
            view: regl.prop<any, any>("view"),
            normalMat: regl.prop<any, any>("normalMat"),
            projection: ({ viewportWidth, viewportHeight }) =>
                mat4.perspective([],
                    Math.PI / 4,
                    viewportWidth / viewportHeight,
                    0.1,
                    100),
            objSize: [l, w, h],
            lightPos: regl.prop<any, any>("lightPos"),
            color: regl.prop<any, any>("color"),
        },
        cull: { enable: true }
    });
}
function RGB(r: number, g: number, b: number) { return [r / 255, g / 255, b / 255] }