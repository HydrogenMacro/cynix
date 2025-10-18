import { mat4, vec3 } from 'gl-matrix';
import { Regl } from 'regl';
import { camera } from './cam';

export function mkDrawBoxBorders(regl: Regl, l: number, h: number, w: number, thickness: number) {
    const edges = [
        // vertical edges
        [[0, 0, 0], [0, h, 0]],
        [[l, 0, 0], [l, h, 0]],
        [[l, 0, w], [l, h, w]],
        [[0, 0, w], [0, h, w]],
        // bottom face edges
        [[0, 0, 0], [l, 0, 0]],
        [[l, 0, 0], [l, 0, w]],
        [[0, 0, w], [l, 0, w]],
        [[0, 0, 0], [0, 0, w]],
        // top face edges
        [[0, h, 0], [l, h, 0]],
        [[l, h, 0], [l, h, w]],
        [[0, h, w], [l, h, w]],
        [[0, h, 0], [0, h, w]],
    ];
    const cubeElements = [
        [2, 1, 0], [2, 0, 3], // positive z face
        [6, 5, 4], [6, 4, 7], // positive x face
        [10, 9, 8], [10, 8, 11], // negative z face
        [14, 13, 12], [14, 12, 15], // negative x face
        [18, 17, 16], [18, 16, 19], // top face
        [20, 21, 22], [23, 20, 22] // bottom face
    ];
    const boxPositions: Array<number[][]> = []
    for (const [edgeStart, edgeEnd] of edges) {
        let size =
            vec3.add([], vec3.sub([], edgeEnd, edgeStart), [thickness, thickness, thickness]);
        const edgeRectPosition = mkRectPrismPositions(
            size[0], size[1], size[2]
        ).map(pos => vec3.subtract([], vec3.add([], pos, edgeStart), [thickness / 2., thickness / 2., thickness / 2.]));
        boxPositions.push(edgeRectPosition as number[][]);
    }

    const drawBoxBorder = (cubePositions: number[][]) => regl({
        vert: `
        precision highp float;

        attribute vec3 position;
        uniform mat4 view, model, projection;
        void main() {
            gl_Position =  projection * view * model * vec4(position, 1.);
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
            position: cubePositions
        },
        uniforms: {
            model: regl.prop<any, any>("model"),
            view: regl.prop<any, any>("view"),
            projection: ({ viewportWidth, viewportHeight, time }) => camera.mkPerspectiveProj(viewportWidth, viewportHeight),
            viewportSize: ({viewportWidth, viewportHeight }) => [viewportWidth, viewportHeight]
        },
        elements: cubeElements
    });
    const boxBorderDrawFns = boxPositions.map(boxPosition => drawBoxBorder(boxPosition));
    return (a: any) => {
        boxBorderDrawFns.forEach(f => f({...a}))
    }
}
export function mkDrawBox(regl: Regl, l: number, h: number, w: number) {
    const cubePosition = mkRectPrismPositions(l, h, w);
    const cubeUv = Array(6).fill(0).map(() => [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]);
    const cubeNormal = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].map(a => [...a, ...a, ...a, ...a]);
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
    varying vec2 vMinVertexNdc;
    varying vec2 vMaxVertexNdc;
    varying vec2 isMinVertex;
    varying vec4 vFragPosViewSpace;

    void main() {
        vec3 c;
        c = vec3(color);
        gl_FragColor = vec4(c, 1.);
        //gl_FragColor = vec4((normal + 1.) * .5, 1.);
    }
    
    `,

        vert: `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    attribute vec3 normal;
    varying vec2 vUv;
    varying vec3 vNormal;
    uniform mat4 projection, view, model;
    
    void main() {
        vUv = uv;
        mat4 mvp = projection * view * model;
        gl_Position = mvp * vec4(position, 1.);
        
    }
    
    `,

        attributes: {
            position: cubePosition,
            uv: cubeUv,
            normal: cubeNormal,
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