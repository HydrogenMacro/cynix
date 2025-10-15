"use client";

import React, { useEffect, useRef, useState } from 'react'
import mkRegl from "regl";
import { mat3, mat4, vec3 } from 'gl-matrix';
import { mkDrawBox } from './box';
import { camera } from './cam';
if (globalThis.window) {
    //@ts-ignore
    const { Spector } = await import("spectorjs");
    const spector = new Spector()
    //spector.displayUI();
}
export function View() {
    const canvasRef = useRef<HTMLCanvasElement>(null!);
    useEffect(() => {
        if (!globalThis.window) return;
        camera.initControls()
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

    const wallDrawFns = ([
        [[10, 1, 10], [-5, -1, -5], RGB(250, 227, 219)], // floor
        [[10, 1, 10], [-5, 9, -5], RGB(250, 227, 219)], // ceiling
        [[1, 10, 10], [-5, -1, -5], RGB(250, 227, 219)], // left wall
        [[1, 10, 10], [5, -1, -5], RGB(250, 227, 219)], // right wall
        [[10, 10, 1], [-5, -1, -5], RGB(250, 227, 219)], // back wall
    ] as Array<[vec3_, vec3_, vec3_]>).map(([wallDims, wallPos, color]) => {
        let drawCall = mkDrawBox(regl, ...wallDims);
        return (a: any) => {
            let model = mat4.create();
            model = mat4.translate(model, model, wallPos);
            drawCall({ ...a, model: model, color })
        };
    });

    const lightPos = [0, 5, -10];
    dbgui()
        .add("x", $slider(-20, 20, .2, () => lightPos[0]).onInput((n) => lightPos[0] = n))
        .add("y", $slider(-10, 10, .2, () => lightPos[1]).onInput((n) => lightPos[1] = n))
        .add("z", $slider(-10, 10, .2, () => lightPos[2]).onInput((n) => lightPos[2] = n))
    const drawLightVis = mkDrawBox(regl, .6, .6, .6);
    regl.frame(({ time }) => {
        const view = camera.mkView();
        regl.clear({
            color: [0, 255, 0, 255],
            depth: 1
        })
        const lightVisModel = mat4.translate([], mat4.create(), lightPos);
        drawLightVis({ view, lightPos, model: lightVisModel, color: [.2, .3, .4] })
        wallDrawFns.forEach(drawWall => drawWall({ view, lightPos }));
    })
}
function RGB(r: number, g: number, b: number) { return [r / 255, g / 255, b / 255] }