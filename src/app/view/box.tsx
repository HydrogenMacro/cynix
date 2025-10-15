import { mat4 } from 'gl-matrix';
import { Regl } from 'regl';
import { camera } from './cam';


export function mkDrawBox(regl: Regl, l: number, h: number, w: number) {
    const cubePosition = [
        [0, +h, +w], [+l, +h, +w], [+l, 0, +w], [0, 0, +w], // positive z face
        [+l, +h, +w], [+l, +h, 0], [+l, 0, 0], [+l, 0, +w], // positive x face
        [+l, +h, 0], [0, +h, 0], [0, 0, 0], [+l, 0, 0], // negative z face
        [0, +h, 0], [0, +h, +w], [0, 0, +w], [0, 0, 0], // negative x face
        [0, +h, 0], [+l, +h, 0], [+l, +h, +w], [0, +h, +w], // top face
        [0, 0, 0], [+l, 0, 0], [+l, 0, +w], [0, 0, +w] // bottom face
    ];
    const cubeUv = Array(6).fill(0).map(() => [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]);
    const cubeNormal = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].map(a => [...a, ...a, ...a, ...a]);
    const cubeFaceSize = [[l, h], [w, h], [l, h], [w, h], [l, w], [l, w]].map(a => [...a, ...a, ...a, ...a]);
    //const cubeFaceMinSize = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]].map(a => [...a, ...a, ...a, ...a]);
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
    varying vec2 vFaceSize;
    varying vec2 vFaceFragPos;
    uniform vec3 lightPos;
    uniform vec3 color;
    uniform vec2 viewportSize;
    varying vec2 vFragScreenNdc;

    void main() {
        vec2 ndcPixelSize = 1./viewportSize;
        vec3 c;
        float isBottomOrLeftEdge = float(min(vFaceFragPos.x, vFaceFragPos.y) < 0.1);
        vec2 distFromMaxEdge = vFaceSize - vFaceFragPos;
        float isTopOrRightEdge = float(min(distFromMaxEdge.x, distFromMaxEdge.y) < 0.1);
        c = mix(vec3(1., 0., 0.), vec3(0., 0., 1.), vFragScreenNdc.x);
        gl_FragColor = vec4(c, 1.);
        //gl_FragColor = vec4((normal + 1.) * .5, 1.);
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
    varying vec2 vFaceFragPos;
    varying vec2 vFragScreenNdc;
    varying vec2 vMinVertexNdc;
    varying vec2 vMaxVertexNdc;
    uniform mat4 projection, orthoProj, view, model;

    vec2 cullComponentFromNormal(vec3 a, vec3 norm) {
        if (norm.x != 0.) return a.yz;
        if (norm.y != 0.) return a.xz;
        if (norm.z != 0.) return a.xy;
    }
    vec3 expandVec2FromNormal(vec2 a, vec3 norm, vec3 vecToCopyComponentFrom) {
        if (norm.x != 0.) return vec3(vecToCopyComponentFrom.x, a);
        if (norm.y != 0.) return vec3(a.x, vecToCopyComponentFrom.y, a.y);
        if (norm.z != 0.) return vec3(a, vecToCopyComponentFrom.z);
    }

    void main() {
        vUv = uv;
        vec4 pos = view * model * vec4(position, 1.);
        vFaceFragPos = cullComponentFromNormal(position, normal);
        vFaceSize = faceSize;
        vec4 minVertexPosition = orthoProj * view * model * vec4(expandVec2FromNormal(vec2(0.), normal, position), 1);
        vMinVertexNdc = minVertexPosition.xy/minVertexPosition.w;
        vec4 maxVertexPosition = orthoProj * view * model * vec4(expandVec2FromNormal(faceSize, normal, position), 1);
        vMaxVertexNdc = maxVertexPosition.xy/maxVertexPosition.w;
        vec4 orthoPos = pos;
        vFragScreenNdc = orthoPos.xy/orthoPos.w;
        gl_Position = projection * pos;
    }
    
    `,

        attributes: {
            position: cubePosition,
            uv: cubeUv,
            normal: cubeNormal,
            faceSize: cubeFaceSize,
        },
        elements: cubeElements,
        uniforms: {
            model: regl.prop<any, any>("model"),
            view: regl.prop<any, any>("view"),
            normalMat: regl.prop<any, any>("normalMat"),
            projection: ({ viewportWidth, viewportHeight, time }) => camera.mkPerspectiveProj(viewportWidth, viewportHeight),
            orthoProj: ({ viewportWidth, viewportHeight, time }) => camera.mkOrthoProj(viewportWidth, viewportHeight),
            objSize: [l, w, h],
            lightPos: regl.prop<any, any>("lightPos"),
            color: regl.prop<any, any>("color"),
            viewportSize: ({ viewportWidth, viewportHeight }) => [viewportWidth, viewportHeight]
        },
        cull: { enable: true }
    });
}
