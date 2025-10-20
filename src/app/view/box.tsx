import { mat4, vec3 } from 'gl-matrix';
import { Regl } from 'regl';
import { camera } from './cam';

export function mkDrawBox(regl: Regl, l: number, h: number, w: number) {
    const cubePosition = mkRectPrismPositions(l, h, w);
    const cubeUv = Array(6).fill(0).map(() => [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]);
    const cubeNormal = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].map(a => [...a, ...a, ...a, ...a]);
    const cubeMaxVertexPos = [[l, h, w], [l, w, h], [l, h, 0], [0, w, h], [l, h, w], [l, 0, w]].map(a => [...a, ...a, ...a, ...a]);
    const cubeMinVertexPos = [[0, 0, w], [l, 0, 0], [0, 0, 0], [0, 0, 0], [0, h, 0], [0, 0, 0]].map(a => [...a, ...a, ...a, ...a]);

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
    uniform float outlineThickness;
    uniform mat4 view;
    varying vec4 vMaxVertexPos;
    varying vec4 vMinVertexPos;

    void main() {
        vec2 fragUv = gl_FragCoord.xy / viewportSize;
        vec2 pixelSize = 1. / viewportSize;
        vec2 maxVertexUvPos = (vMaxVertexPos.xy / vMaxVertexPos.w + 1.) / 2.;
        vec2 minVertexUvPos = (vMinVertexPos.xy / vMinVertexPos.w + 1.) / 2.;
        vec3 cameraPos = vec3(view[0][3], view[1][3], view[2][3]);
        vec3 c;
        c = vec3(color);
        float q = (1. - fragUv.y) / sin(
            acos(dot(view[1].xyz, vec3(1., 0., 0)) 
                / length(view[1].xyz)
            )
        );
        if (fragUv.x > .95) {
            gl_FragColor = vec4(q, 0., 0., 1.);
            //return;
        }
        vec2 d = fragUv - minVertexUvPos;
        if (fragUv.x > .5) {
            if (0. - pixelSize.x <= d.x && d.x <= pixelSize.x * outlineThickness * .5 && vNormal.y == 0.) {
                c = vec3(smoothstep(0. - pixelSize.x, pixelSize.x * outlineThickness * .5, d.x));
            }
            if (
                (maxVertexUvPos.x - minVertexUvPos.x) - pixelSize.x * outlineThickness <= d.x 
                && d.x <= (maxVertexUvPos.x - minVertexUvPos.x) + pixelSize.x
                && vNormal.y == 0.
            ) {
                c = vec3(smoothstep(
                (maxVertexUvPos.x - minVertexUvPos.x) - pixelSize.x * (fragUv.x < .5 ? outlineThickness * .5 : outlineThickness),
                (maxVertexUvPos.x - minVertexUvPos.x) + pixelSize.x,
                d.x
                ));
            }
        } else {
            
        }
        
        
        //c = vec3(maxVertex.x, 0., 0.);
        //if (0. <= d.y && d.y <= pixelSize.y * 5. && vNormal.x != 0.)c = vec3(.5);
        gl_FragColor = vec4(c, 1.);
        //gl_FragColor = vec4((vNormal + 1.) * .5, 1.);
    }
    
    `,

        vert: `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    attribute vec3 normal;
    attribute vec3 maxVertexPos;
    attribute vec3 minVertexPos;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec4 vMaxVertexPos;
    varying vec4 vMinVertexPos;
    uniform mat4 projection, view, model;
    uniform float outlineThickness;

    void main() {
        vUv = uv;
        vNormal = normal;
        mat4 mvp = projection * view * model;
        gl_Position = mvp * vec4(position, 1.);
        vMaxVertexPos = mvp * vec4(maxVertexPos, 1.);
        vMinVertexPos = mvp * vec4(minVertexPos, 1.);
    }
    
    `,

        attributes: {
            position: cubePosition,
            uv: cubeUv,
            normal: cubeNormal,
            maxVertexPos: cubeMaxVertexPos,
            minVertexPos: cubeMinVertexPos,
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
            outlineThickness: 10.,
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