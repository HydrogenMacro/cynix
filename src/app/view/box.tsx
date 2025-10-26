import { mat4, vec2, vec3 } from 'gl-matrix';
import { Regl } from 'regl';
import { camera } from './cam';

export function mkDrawBox(regl: Regl, l: number, h: number, w: number) {
    const cubePosition = mkRectPrismPositions(l, h, w);
    const cubeUv = Array(6).fill(0).map(() => [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]);
    const cubeNormal = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].map(a => [...a, ...a, ...a, ...a]);
    const cubeMaxVertexPos = [[l, h, w], [l, w, h], [l, h, 0], [0, w, h], [l, h, w], [l, 0, w]].map(a => [...a, ...a, ...a, ...a]);
    const cubeMinVertexPos = [[0, 0, w], [l, 0, 0], [0, 0, 0], [0, 0, 0], [0, h, 0], [0, 0, 0]].map(a => [...a, ...a, ...a, ...a]); const cubeFaceSize = [[l, h], [w, h], [l, h], [w, h], [l, w], [l, w]].map(a => [...a, ...a, ...a, ...a]);
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
    uniform vec3 colorStart;
    uniform vec3 colorEnd;
    uniform vec2 viewportSize;
    varying vec2 vFaceSize;
    uniform float borderThickness;
    uniform int patternType;
    uniform float patternColor;
    uniform float gradAngle;
    uniform float patternStartScale;
    uniform float patternEndScale;
    uniform float patternBlur;
    uniform float patternAmount;
    
    // smoothstep but linear instead of cubic hermite interpolation
    float linstep(float start, float end, float x) {
        if (start == end) return start;
        return (clamp(x,start,end)-start)/(end-start);
    }
    vec3 tilingCircle(vec3 scrColor, vec2 uv, vec3 tileColor, float tileStartSize, float tileEndSize) {
        float startShapeSize = tileStartSize / 2.;
        float midShapeSize = ((tileStartSize + tileEndSize) / 2.) / 2.;
        float endShapeSize = tileEndSize / 2.;
        float prog = 1. - smoothstep(.5 * midShapeSize, .5 * midShapeSize + patternBlur, distance(uv, vec2(.5))) // center circle
        + 1. - smoothstep(.5 * startShapeSize, .5 * startShapeSize + patternBlur, distance(uv, vec2(0., 1.))) // top left circle
        + 1. - smoothstep(.5 * endShapeSize, .5 * endShapeSize + patternBlur, distance(uv, vec2(1., 1.))) // top right circle
        + 1. - smoothstep(.5 * startShapeSize, .5 * startShapeSize + patternBlur, distance(uv, vec2(0., 0.))) // bottom left circle
        + 1. - smoothstep(.5 * endShapeSize, .5 * endShapeSize + patternBlur, distance(uv, vec2(1., 0.))); // bottom right circle
        return mix(scrColor, tileColor, prog);
    }

    float mhnDist(vec2 a, vec2 b) {
        vec2 k = abs(a - b);
        return k.x + k.y;
    }
    vec3 tilingDiamond(vec3 scrColor, vec2 uv, vec3 tileColor, float tileStartSize, float tileEndSize) {
        float startShapeSize = tileStartSize * (patternEndScale - patternStartScale) + patternStartScale;
        float midShapeSize = ((tileStartSize + tileEndSize) / 2.) * (patternEndScale - patternStartScale) + patternStartScale;
        float endShapeSize = tileEndSize * (patternEndScale - patternStartScale) + patternStartScale;
        float prog = 1. - linstep(.5 * midShapeSize, .5 * midShapeSize + patternBlur, mhnDist(uv, vec2(.5))) // center circle
        + 1. - smoothstep(.5 * startShapeSize, .5 * startShapeSize + patternBlur, mhnDist(uv, vec2(0., 1.))) // top left circle
        + 1. - smoothstep(.5 * endShapeSize, .5 * endShapeSize + patternBlur, mhnDist(uv, vec2(1., 1.))) // top right circle
        + 1. - smoothstep(.5 * startShapeSize, .5 * startShapeSize + patternBlur, mhnDist(uv, vec2(0., 0.))) // bottom left circle
        + 1. - smoothstep(.5 * endShapeSize, .5 * endShapeSize + patternBlur, mhnDist(uv, vec2(1., 0.))); // bottom right circle
        return mix(scrColor, tileColor, prog);
    }
    
    
    void main() {
        vec3 c;
        vec2 screenUv = gl_FragCoord.xy / viewportSize.xx;
        
        mat2 rotMtrx = mat2(
            cos(gradAngle), -sin(gradAngle),
            sin(gradAngle), cos(gradAngle)
        );
        vec2 rotatedScreenUv = rotMtrx * (screenUv - vec2(.5)) + vec2(.5);
        vec2 rotatedUv = rotMtrx * (vUv * vFaceSize.yy/vFaceSize.yx - vec2(.5)) + vec2(.5);
        c = mix(colorStart, colorEnd, rotatedUv.x);
        vec3 oppoC = mix(colorEnd, colorStart, rotatedUv.x);
        float n = patternAmount;
        float tileSize = 1. / n;
        vec2 a = rotatedUv * n;
        vec2 tileUv = fract(a);
        float b = ((a.x - tileUv.x)) / n;
        float tileEnd = b + tileSize;
        vec3 patternC = patternColor > 100. ? oppoC : mix(c,vec3(1.), patternColor);
        if (patternType == 0) {
        } else if (patternType == 1) {
            c = tilingCircle(
                c,
                tileUv,
                patternC,
                b,
                tileEnd
            ); 
        } else if (patternType == 2) {
            c = tilingDiamond(
                c,
                tileUv,
                patternC,
                b,
                tileEnd
            ); 
        }       
        
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
    varying vec2 vMinVertexNdc;
    varying vec2 vMaxVertexNdc;
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
            faceSize: cubeFaceSize,
        },
        elements: cubeElements,
        uniforms: {
            model: regl.prop<any, any>("model"),
            view: regl.prop<any, any>("view"),
            normalMat: regl.prop<any, any>("normalMat"),
            projection: ({ viewportWidth, viewportHeight, time }) => camera.mkPerspectiveProj(viewportWidth, viewportHeight),
            objSize: [l, w, h],
            lightPos: regl.prop<any, any>("lightPos"),
            colorStart: regl.prop<any, any>("colorStart"),
            colorEnd: regl.prop<any, any>("colorEnd"),
            gradAngle: regl.prop<any, any>("gradAngle"),
            patternType: regl.prop<any, any>("patternType"),
            patternColor: regl.prop<any, any>("patternColor"),
            patternStartScale: regl.prop<any, any>("patternStartScale"),
            patternEndScale: regl.prop<any, any>("patternEndScale"),
            patternBlur: regl.prop<any, any>("patternBlur"),
            patternAmount: regl.prop<any, any>("patternAmount"),
            viewportSize: ({ viewportWidth, viewportHeight }) => [viewportWidth, viewportHeight],
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