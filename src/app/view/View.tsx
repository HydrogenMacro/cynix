"use client";

import React, { useEffect, useRef, useState } from 'react'
import mkRegl, { DrawCommand } from "regl";
import { mat3, mat4, vec3 } from 'gl-matrix';
import { mkDrawBox } from './box';
import { camera } from './cam';
import GUI from 'lil-gui';
import { Wall, wallState } from './wallState';
import { subscribe } from 'valtio';

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
        const gui = new GUI();
        const dims = gui.addFolder("Dimensions");
        dims.add(wallState, "roomWidth", 1, 50).name("Room Width");
        dims.add(wallState, "roomHeight", 1, 50).name("Room Height");
        dims.add(wallState, "roomLength", 1, 50).name("Room Length");
        for (const [wallSidePropName, wallSideDisplayName] of [
            ["bottomWall", "Bottom Wall"],
            ["topWall", "Top Wall"],
            ["leftWall", "Left Wall"],
            ["rightWall", "Right Wall"],
            ["backWall", "Back Wall"],
            ["frontWall", "Front Wall"]
        ] as ["bottomWall" | "topWall" | "leftWall" | "rightWall" | "backWall" | "frontWall", string][]) {
            const wallFolder = gui.addFolder(wallSideDisplayName);
            wallFolder.addColor(wallState[wallSidePropName], "colorStart", 1).name("Gradient Color 1");
            wallFolder.addColor(wallState[wallSidePropName], "colorEnd", 1).name("Gradient Color 2");
            wallFolder.add(wallState[wallSidePropName], "gradAngle", 0, 360).name("Gradient Angle");
            wallFolder.add(wallState[wallSidePropName], "pattern", { "None": null, "Circle": "circle", "Diamond": "diamond" }).name("Overlay Pattern");
            wallFolder.add(wallState[wallSidePropName], "patternColor", { 
                "Inverted Gradient": "inverted-color-gradient", 
                "White@100% Opacity": 1.,
                "White@90% Opacity": .9,
                "White@80% Opacity": .8,
                "White@70% Opacity": .7,
                "White@60% Opacity": .6,
                "White@50% Opacity": .5,
                "White@40% Opacity": .4,
                "White@30% Opacity": .3,
                "White@20% Opacity": .2,
                "White@10% Opacity": .1,
            }).name("Overlay Pattern Color");
            wallFolder.add(wallState[wallSidePropName], "patternStartScale", 0, 1).name("Pattern Start Scale");
            wallFolder.add(wallState[wallSidePropName], "patternEndScale", 0, 1).name("Pattern End Scale");
            wallFolder.add(wallState[wallSidePropName], "patternAmount", 0, 40).name("Pattern Amount");
            wallFolder.add(wallState[wallSidePropName], "patternBlur", 0, 1).name("Pattern Blur");
        }
        camera.initControls();
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
    const regl = mkRegl({ gl: canvas.getContext("webgl")!, attributes: { depth: true, antialias: true }, extensions: ["OES_standard_derivatives"] });

    let wallDrawFns: Array<(a: any) => void>;
    const updateWallDrawFns = (l: number, h: number, w: number) => wallDrawFns = ([
        [[l, 1, w], [0, 0, 0], wallState.bottomWall], // floor
        [[l, 1, w], [0, h + 1, 0], wallState.topWall], // ceiling
        [[1, h, w], [-1, 1, 0], wallState.leftWall], // left wall
        [[1, h, w], [l, 1, 0], wallState.rightWall], // right wall
        [[l, h, 1], [0, 1, w], wallState.backWall], // back wall
        [[l, h, 1], [0, 1, 0], wallState.frontWall], // front wall
    ] as Array<[vec3_, vec3_, Wall]>).map(([wallDims, wallPos, wallData]) => {
        let drawBox = mkDrawBox(regl, ...wallDims);
        return (a: any) => {
            let model = mat4.create();
            model = mat4.translate(model, model, wallPos);
            drawBox({ ...a, 
                model: model, 
                colorStart: wallData.colorStart, 
                colorEnd: wallData.colorEnd, 
                gradAngle: wallData.gradAngle * Math.PI / 180, 
                patternType: wallData.pattern == null ? 0 : wallData.pattern == "circle" ? 1 : 2,
                patternColor: wallData.patternColor == "inverted-color-gradient" ? 999 : wallData.patternColor,
                patternStartScale: wallData.patternStartScale,
                patternEndScale: wallData.patternEndScale,
                patternBlur: wallData.patternBlur,
                patternAmount: wallData.patternAmount
            });
        };
    });
    updateWallDrawFns(wallState.roomLength, wallState.roomHeight, wallState.roomWidth);
    subscribe(wallState, () => {
        updateWallDrawFns(wallState.roomLength, wallState.roomHeight, wallState.roomWidth);
    })

    regl.frame(({ time }) => {
        const view = camera.mkView();
        regl.clear({
            color: [100, 100, 100, 255],
            depth: 1
        })
        wallDrawFns!.forEach(drawWall => drawWall({ view, lightPos: [0, 0, 0] }));
    })
}
function RGB(r: number, g: number, b: number) { return [r / 255, g / 255, b / 255] }