import { mat4, vec4 } from "gl-matrix";
import { camera } from "./cam";

type vec3_ = [number, number, number];
export function drawBoxBorders(ctx: CanvasRenderingContext2D, model: mat4, view: mat4, positions: number[][]) {
    vec4.transformMat4([], [0, 0, 0, 1], mat4.multiply([], camera.mkPerspectiveProj(ctx.canvas.width, ctx.canvas.height), mat4.multiply([], view, model)));
}