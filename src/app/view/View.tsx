"use client";

import React, { useEffect, useRef, useState } from 'react'
import mkRegl from "regl";
import { mat3, mat4, vec3 } from 'gl-matrix';
import { mkDrawBox, mkRectPrismPositions } from './box';
import { camera } from './cam';
import { drawBoxBorders } from './boxBorders';
if (globalThis.window) {
    //@ts-ignore
    const { Spector } = await import("spectorjs");
    const spector = new Spector()
    //spector.displayUI();
}
export function View() {
    const worldCanvasRef = useRef<HTMLCanvasElement>(null!);
    const borderCanvasRef = useRef<HTMLCanvasElement>(null!);
    useEffect(() => {
        if (!globalThis.window) return;
        camera.initControls()
        drawWorld(worldCanvasRef.current, borderCanvasRef.current);
    }, []);
    const [windowSize, setWindowSize] = useState([0, 0]);
    useEffect(() => {
        const dpr = window.devicePixelRatio;
        setWindowSize([worldCanvasRef.current.clientWidth * dpr, worldCanvasRef.current.clientHeight * dpr]);
        window.addEventListener("resize", () => setWindowSize([worldCanvasRef.current.clientWidth * dpr, worldCanvasRef.current.clientHeight * dpr]));
    }, []);
    return <div className="w-full h-full relative">
        <canvas className="w-full h-full absolute" width={windowSize[0]} height={windowSize[1]} ref={worldCanvasRef}></canvas>
        <canvas className="w-full h-full absolute" width={windowSize[0]} height={windowSize[1]} ref={borderCanvasRef}></canvas>
    </div>
}

type vec3_ = [number, number, number];
async function drawWorld(worldCanvas: HTMLCanvasElement, borderCanvas: HTMLCanvasElement) {
    await import("dbgui");
    const regl = mkRegl({ gl: worldCanvas.getContext("webgl")!, attributes: { depth: true, antialias: true }, extensions: ["OES_standard_derivatives"] });
    const ctx = borderCanvas.getContext("2d")!;
    const wallDrawFns = ([
        [[11, 1, 10], [-5, -1, -5], RGB(250, 227, 219)], // floor
        [[11, 1, 10], [-5, 10, -5], RGB(240, 227, 219)], // ceiling
        [[1, 10, 10], [-6, 0, -5], RGB(230, 227, 219)], // left wall
        [[1, 10, 10], [6, 0, -5], RGB(220, 227, 219)], // right wall
        [[11, 10, 1], [-5, 0, -5], RGB(210, 227, 219)], // back wall
    ] as Array<[vec3_, vec3_, vec3_]>).map(([wallDims, wallPos, color]) => {
        let drawBox = mkDrawBox(regl, ...wallDims);
        return (a: any) => {
            let model = mat4.create();
            model = mat4.translate(model, model, wallPos);
            drawBox({ ...a, model: model, color });
            drawBoxBorders(ctx, model, a.view, mkRectPrismPositions(...wallDims));
        };
    });

    const lightPos: [number, number, number] = [0, 5, 3];
    const lightSize: [number, number, number] = [5, 5, 6];
    let drawLightVis = mkDrawBox(regl, ...lightSize);
    const updateDrawLightVis = () => {
        console.log(lightSize);
        drawLightVis = mkDrawBox(regl, ...lightSize);
    }
    dbgui()
        .add("x", $slider(-20, 20, .2, () => lightPos[0]).onInput((n) => lightPos[0] = n))
        .add("y", $slider(-20, 20, .2, () => lightPos[1]).onInput((n) => lightPos[1] = n))
        .add("z", $slider(-20, 20, .2, () => lightPos[2]).onInput((n) => lightPos[2] = n))
        .add("pos l", $slider(.2, 20, .2, () => lightSize[0]).onInput((n) => lightSize[0] = n).onChange(updateDrawLightVis))
        .add("pos h", $slider(.2, 20, .2, () => lightSize[1]).onInput((n) => lightSize[1] = n).onChange(updateDrawLightVis))
        .add("pos w", $slider(.2, 20, .2, () => lightSize[2]).onInput((n) => lightSize[2] = n).onChange(updateDrawLightVis))
        .add("pos", $valueDisplay(() => camera.pos.map(a => a.toFixed(4)).join(", ")))
    regl.frame(({ time }) => {
        const view = camera.mkView();
        regl.clear({
            color: [100, 100, 100, 255],
            depth: 1
        })
        const lightVisModel = mat4.translate([], mat4.create(), lightPos);
        (drawLightVis)({ view, lightPos, model: lightVisModel, color: [.8, .7, .6] });
        wallDrawFns.forEach(drawWall => drawWall({ view, lightPos }));
    })
}
function RGB(r: number, g: number, b: number) { return [r / 255, g / 255, b / 255] }