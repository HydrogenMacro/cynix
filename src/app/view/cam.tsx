import { mat4, vec2, vec3 } from "gl-matrix";

export const camera = {
    pos: [2, 8, 2],
    trgtDir: [Math.PI * 3 / 4, -Math.PI * 1 / 6],
    fov: Math.PI / 2,
    mkTrgtDirMat() {
        let rot = mat4.multiply(
            [], 
            mat4.fromYRotation([], -this.trgtDir[0]),
            mat4.fromXRotation([], this.trgtDir[1])
        );
        return rot;
    },
    mkView() {
        let trgtDirVec = vec3.transformMat4([], [0, 0, -1], this.mkTrgtDirMat());
        return mat4.lookAt([], camera.pos, vec3.add([], camera.pos, trgtDirVec), [0, 1, 0]);
    },
    mkPerspectiveProj(viewportWidth: number, viewportHeight: number) {
        return mat4.perspective([],
            camera.fov,
            viewportWidth / viewportHeight,
            0.1,
            100);
    },
    initControls() {
        const moveDir = [0, 0, 0];
        const lookDir = [0, 0];
        window.addEventListener("keydown", (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (e.repeat) return;
            switch (e.code) {
                case "KeyW":
                    moveDir[2] = -1;
                    break;
                case "KeyS":
                    moveDir[2] = 1;
                    break;
                case "KeyA":
                    moveDir[0] = -1;
                    break;
                case "KeyD":
                    moveDir[0] = 1;
                    break;
                case "Space":
                    moveDir[1] = 1;
                    break;
                case "ShiftLeft":
                    moveDir[1] = -1;
                    break;
                case "ArrowUp":
                    lookDir[1] = 1;
                    break;

                case "ArrowDown":
                    lookDir[1] = -1;
                    break;

                case "ArrowLeft":
                    lookDir[0] = -1;
                    break;

                case "ArrowRight":
                    lookDir[0] = 1;
                    break;
            }
        });
        window.addEventListener("keyup", (e) => {
            switch (e.code) {
                case "KeyW":
                case "KeyS":
                    moveDir[2] = 0;
                    break;
                case "KeyA":
                case "KeyD":
                    moveDir[0] = 0;
                    break;
                case "Space":
                case "ShiftLeft":
                    moveDir[1] = 0;
                    break;
                case "ArrowUp":
                case "ArrowDown":
                    lookDir[1] = 0;
                    break;
                case "ArrowLeft":
                case "ArrowRight":
                    lookDir[0] = 0;
                    break;
            }
        });

        let lastFrameMs = 0;
        requestAnimationFrame(function loop(nowMs) {
            let moveSpeed = 4;
            let lookSpeed = .7;
            vec2.scaleAndAdd(camera.trgtDir, camera.trgtDir, lookDir, (nowMs - lastFrameMs) / 1000 * lookSpeed);
            let trgtDirMat = camera.mkTrgtDirMat();
            vec3.scaleAndAdd(camera.pos, camera.pos, vec3.transformMat4([], moveDir, trgtDirMat), (nowMs - lastFrameMs) / 1000 * moveSpeed);
            lastFrameMs = nowMs;
            requestAnimationFrame(loop);
        });
    },

}