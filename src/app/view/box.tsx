import { mat4, vec2, vec3 } from 'gl-matrix';
import { Regl } from 'regl';
import { camera } from './cam';

export function mkDrawBoxBorders(regl: Regl, l: number, h: number, w: number, thickness: number) {
    const edges: [vec3, vec3, "x" | "y" | "z"][] = [
        // vertical edges
        [[0, 0, 0], [0, h, 0], "y"],
        [[l, 0, 0], [l, h, 0], "y"],
        [[l, 0, w], [l, h, w], "y"],
        [[0, 0, w], [0, h, w], "y"],
        // bottom face edges
        [[0, 0, 0], [l, 0, 0], "x"],
        [[l, 0, 0], [l, 0, w], "z"],
        [[0, 0, w], [l, 0, w], "x"],
        [[0, 0, 0], [0, 0, w], "z"],
        // top face edges
        [[0, h, 0], [l, h, 0], "x"],
        [[l, h, 0], [l, h, w], "z"],
        [[0, h, w], [l, h, w], "x"],
        [[0, h, 0], [0, h, w], "z"],
    ];
    const faces: Array<number[][]> = [];
    const faceOffsets: Array<vec3> = [];
    const faceSizes: Array<vec2> = [];
    for (const [edgeStart, edgeEnd, edgeAxis] of edges) {
        const uv: [number, number, number][] = edgeAxis === "x"
            ? [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]
            : edgeAxis === "y"
                ? [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]]
                : [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]]
        const normal = edgeAxis === "x" ? [0,0,1] : edgeAxis === "y" ? [1, 0, 0] : [0, 1, 0];
        let size = vec3.add([], vec3.sub([], edgeEnd, edgeStart), [thickness * 2, thickness * 2, thickness * 2,]);
        const edgeRectPosition = uv.map(pos =>
            [...vec3.mul([], pos, vec3.sub([], size, [.5, .5, .5]))]
        );
        faces.push(edgeRectPosition as number[][]);
        faceOffsets.push(edgeStart);
    }
    console.log(faces)
    const drawBorderFaces = (face: number[][], faceOffset: vec3) => regl({
        vert: `
        precision highp float;

        attribute vec2 position;
        uniform mat4 view, model, projection;
        uniform vec3 faceOffset;
        void main() {
            gl_Position = projection * view * model * vec4(vec3(position - faceSize / 2., 0.) + faceOffset, 1.);
        }
        `,
        frag: `
        precision highp float;
        uniform vec2 viewportSize;
        void main() {
            gl_FragColor = vec4(gl_FragCoord.xy / viewportSize, 0., 1.);
        }
        `,
        attributes: {
            position: face
        },
        uniforms: {
            model: regl.prop<any, any>("model"),
            view: regl.prop<any, any>("view"),
            projection: ({ viewportWidth, viewportHeight, time }) => camera.mkPerspectiveProj(viewportWidth, viewportHeight),
            viewportSize: ({ viewportWidth, viewportHeight }) => [viewportWidth, viewportHeight],
            faceOffset: faceOffset as number[],
        },
        elements: [[2, 1, 0], [2, 0, 3]]
    });
    const boxBorderDrawFns = faces.map((face, i) => drawBorderFaces(face, faceOffsets[i]));
    return (a: any) => {
        boxBorderDrawFns.forEach(f => f({ ...a }))
    }
}
export function mkDrawBox(regl: Regl, l: number, h: number, w: number) {
    const cubePosition = mkRectPrismPositions(l, h, w);
    const cubeUv = Array(6).fill(0).map(() => [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]);
    const cubeNormal = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].map(a => [...a, ...a, ...a, ...a]);
    const cubeFaceSize = [[l, h], [w, h], [l, h], [w, h], [l, w], [l, w]].map(a => [...a, ...a, ...a, ...a]);
    const cubeElements = [
        [2, 1, 0], [2, 0, 3], // positive z face
        [6, 5, 4], [6, 4, 7], // positive x face
        [10, 9, 8], [10, 8, 11], // negative z face
        [14, 13, 12], [14, 12, 15], // negative x face
        [18, 17, 16], [18, 16, 19], // top face
        [20, 21, 22], [23, 20, 22] // bottom face
    ];

    return regl({
        frag: `
        #extension GL_OES_standard_derivatives : enable
        precision highp float;
    varying vec2 vUv;
    varying vec3 vNormal;
    uniform vec3 lightPos;
    uniform vec3 color;
    uniform vec2 viewportSize;
    varying vec2 vFaceSize;
    
    float tilingCircle(vec2 uv) {
        float r = .15;
        float s = .1;
        return 1. - smoothstep(r, r + s, distance(uv, vec2(.5))) // center circle
        + 1. - smoothstep(r, r + s, distance(uv, vec2(0., 1.))) // top left circle
        + 1. - smoothstep(r, r + s, distance(uv, vec2(1., 1.))) // top right circle
        + 1. - smoothstep(r, r + s, distance(uv, vec2(0., 0.))) // bottom left circle
        + 1. - smoothstep(r, r + s, distance(uv, vec2(1., 0.))); // bottom right circle

    }

    void main() {
        vec3 c;
        c = vec3(color);
        float o = .3;
        c = mix(
            c, 
            vec3(1.), 
            o * tilingCircle(
                fract(
                    (vUv * vFaceSize) * .8
                )
            )
        );

        gl_FragColor = vec4(c, 1.);
        //gl_FragColor = vec4((vNormal + 1.) * .5, 1.);
    }
    
    `,

        vert: `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    attribute vec3 normal;
    attribute vec2 faceSize;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec2 vFaceSize;
    uniform mat4 projection, view, model;
    
    void main() {
        vUv = uv;
        vFaceSize = faceSize;
        mat4 mvp = projection * view * model;

        gl_Position = mvp * vec4(position, 1.);
        
    }
    
    `,

        attributes: {
            position: cubePosition,
            uv: cubeUv,
            normal: cubeNormal,
            faceSize: cubeFaceSize
        },
        elements: cubeElements,
        uniforms: {
            model: regl.prop<any, any>("model"),
            view: regl.prop<any, any>("view"),
            normalMat: regl.prop<any, any>("normalMat"),
            projection: ({ viewportWidth, viewportHeight, time }) => camera.mkPerspectiveProj(viewportWidth, viewportHeight),
            objSize: [l, w, h],
            lightPos: regl.prop<any, any>("lightPos"),
            color: regl.prop<any, any>("color"),
            viewportSize: ({ viewportWidth, viewportHeight }) => [viewportWidth, viewportHeight]
        },
        cull: { enable: true }
    });
}

function mkRectPrismPositions(l: number, h: number, w: number) {
    return [
        [0, +h, +w], [+l, +h, +w], [+l, 0, +w], [0, 0, +w], // positive z face
        [+l, +h, +w], [+l, +h, 0], [+l, 0, 0], [+l, 0, +w], // positive x face
        [+l, +h, 0], [0, +h, 0], [0, 0, 0], [+l, 0, 0], // negative z face
        [0, +h, 0], [0, +h, +w], [0, 0, +w], [0, 0, 0], // negative x face
        [0, +h, 0], [+l, +h, 0], [+l, +h, +w], [0, +h, +w], // top face
        [0, 0, 0], [+l, 0, 0], [+l, 0, +w], [0, 0, +w] // bottom face
    ];
}