import { mat4, vec3 } from 'gl-matrix';
import { Regl } from 'regl';
import { camera } from './cam';

export function mkDrawBoxBorders(regl: Regl, l: number, h: number, w: number, thickness: number) {
    const cubeElements = [
        [2, 1, 0], [2, 0, 3], // positive z face
        [6, 5, 4], [6, 4, 7], // positive x face
        [10, 9, 8], [10, 8, 11], // negative z face
        [14, 13, 12], [14, 12, 15], // negative x face
        [18, 17, 16], [18, 16, 19], // top face
        [20, 21, 22], [23, 20, 22] // bottom face
    ];
    const cubeUv = Array(6).fill(0).map(() => [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]);
    const cubePosition = mkRectPrismPositions(l + thickness * 2., h + thickness * 2., w + thickness * 2.)
        .map(a => vec3.subtract([], a, [l / 2. + thickness, h / 2 + thickness, w / 2 + thickness]));

    const drawBoxBorder = regl({
        vert: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 view, model, projection;
        uniform vec3 boxSize;
        uniform float thickness;
        varying vec2 vUv;

        void main() {
            vUv = uv;
            vec3 boxPos = vec3(model[3][0],model[3][1],model[3][2]);
            // manual inverse matmul to extract cmra pos from view mtrx
            vec3 t = vec3(view[3][0], view[3][1], view[3][2]);
            vec3 cameraPos = vec3(
                -dot(t, vec3(view[0][0], view[0][1], view[0][2])),
                -dot(t, vec3(view[1][0], view[1][1], view[1][2])),
                -dot(t, vec3(view[2][0], view[2][1], view[2][2]))
            );
            vec3 boxCenter = boxSize / 2.;
            float d = distance(boxPos + boxSize / 2., cameraPos) / 20.;
            mat4 trans = mat4(1.);
            trans[0][0] = d;
            trans[1][1] = d;
            trans[2][2] = d;
            trans[3][0] = boxCenter.x;
            trans[3][1] = boxCenter.y;
            trans[3][2] = boxCenter.z;
            gl_Position = projection * view * model * trans * vec4(position, 1.);
        }
        `,
        frag: `
        precision highp float;
        uniform vec2 viewportSize;
        varying vec2 vUv;
        void main() {
            vec4 c;
            //c = 1. - mix(vec4(0.), vec4(1.), smoothstep(0., .1, vUv.x));
            c = vec4(vUv, 0., 1.);
            gl_FragColor = c;
        }
        `,
        attributes: {
            position: cubePosition,
            uv: cubeUv
        },
        uniforms: {
            model: regl.prop<any, any>("model"),
            view: regl.prop<any, any>("view"),
            boxSize: [l, h, w],
            thickness,
            projection: ({ viewportWidth, viewportHeight, time }) => camera.mkPerspectiveProj(viewportWidth, viewportHeight),
            viewportSize: ({viewportWidth, viewportHeight }) => [viewportWidth, viewportHeight]
        },
        elements: cubeElements
    });
    return drawBoxBorder;
}
export function mkDrawBox(regl: Regl, l: number, h: number, w: number) {
    const cubePosition = mkRectPrismPositions(l, h, w);
    const cubeUv = Array(6).fill(0).map(() => [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]);
    const cubeNormal = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].map(a => [...a, ...a, ...a, ...a]);
    const cubeMaxVertexPos = [[l, h, w], [l, w, h], [l, h, 0], [0, w, h], [l, h, w], [l, 0, w]].map(a => [...a, ...a, ...a, ...a]);
    const cubeMinVertexPos = [[0, 0, w], [l, 0, 0], [0, 0, 0], [0, 0, 0], [0, h, 0], [0, 0, 0]].map(a => [...a, ...a, ...a, ...a]);
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
    //varying vec2 vMinVertexPos;
    //varying vec2 vMaxVertexPos;
    varying vec2 isMinVertex;
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
                    (vUv * vFaceSize) * .5
                )
            )
        );

        gl_FragColor = vec4(c, 1.);
        //gl_FragColor = vec4((normal + 1.) * .5, 1.);
    }
    
    `,

        vert: `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    attribute vec3 normal;
    attribute vec3 minVertexPos;
    attribute vec3 maxVertexPos;
    attribute vec2 faceSize;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec2 vFaceSize;
    //varying vec3 vMinVertexPos;
    //varying vec3 vMaxVertexPos;
    uniform mat4 projection, view, model;
    
    void main() {
        vUv = uv;
        vNormal = normal;
        vFaceSize = faceSize;
        mat4 mvp = projection * view * model;
        //vMinVertexPos = minVertexPos;
        //vMaxVertexPos = maxVertexPos;
        gl_Position = mvp * vec4(position, 1.);
        
    }
    
    `,

        attributes: {
            position: cubePosition,
            uv: cubeUv,
            normal: cubeNormal,
            minVertexPos: cubeMinVertexPos,
            maxVertexPos: cubeMaxVertexPos,
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