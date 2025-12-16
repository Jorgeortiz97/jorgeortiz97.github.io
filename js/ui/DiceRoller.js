// DiceRoller - Animated dice display with true 3D rotating cube animation

class DiceRoller extends Phaser.GameObjects.Container {
    constructor(scene, x, y, fontSize) {
        super(scene, x, y);

        this.fontSize = fontSize || 14;
        const dieSize = Math.floor(fontSize * 1.8);
        const dieSpacing = Math.floor(dieSize * 1.3);
        const bgWidth = dieSpacing * 2 + 10;
        const bgHeight = Math.floor(fontSize * 3);

        // Background
        this.bg = scene.add.rectangle(0, 0, bgWidth, bgHeight, 0x2a2015)
            .setStrokeStyle(2, 0x555555);
        this.add(this.bg);

        // Die 1
        const dieY = 0;
        this.die1Bg = scene.add.rectangle(-dieSpacing / 2, dieY, dieSize, dieSize, 0xf4e8d0)
            .setStrokeStyle(2, 0x1a1510);
        this.die1Text = scene.add.text(-dieSpacing / 2, dieY, '-', {
            fontFamily: 'Arial, sans-serif',
            fontSize: fontSize + 'px',
            color: '#1a1510',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add([this.die1Bg, this.die1Text]);

        // Die 2
        this.die2Bg = scene.add.rectangle(dieSpacing / 2, dieY, dieSize, dieSize, 0xf4e8d0)
            .setStrokeStyle(2, 0x1a1510);
        this.die2Text = scene.add.text(dieSpacing / 2, dieY, '-', {
            fontFamily: 'Arial, sans-serif',
            fontSize: fontSize + 'px',
            color: '#1a1510',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add([this.die2Bg, this.die2Text]);

        // Store original positions for shake reset
        this.die1OrigX = -dieSpacing / 2;
        this.die2OrigX = dieSpacing / 2;
        this.dieOrigY = dieY;

        // 3D cube geometry setup
        this.setupCubeGeometry();

        scene.add.existing(this);
    }

    // Animation Helper Functions

    // Smooth noise function for natural-feeling randomness
    smoothNoise(t, seed = 0) {
        // Deterministic smooth oscillation using multiple sine waves
        return Math.sin(t * 0.017 + seed) * 0.5 +
               Math.sin(t * 0.023 + seed * 1.3) * 0.3 +
               Math.sin(t * 0.031 + seed * 0.7) * 0.2;
    }

    // Physics-based decaying bounce - simpler and smoother
    decayingBounce(t, maxHeight) {
        if (t <= 0) return 0;
        // Simple exponential decay with sine bounce
        const decay = Math.exp(-t * 4);
        const bounce = Math.abs(Math.sin(t * Math.PI * 4));
        return bounce * decay * maxHeight;
    }

    // Smooth ease-out curve (quintic for smooth deceleration)
    easeOutQuint(t) {
        return 1 - Math.pow(1 - t, 5);
    }

    // 3D Math Utilities
    rotateX(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: point.x,
            y: point.y * cos - point.z * sin,
            z: point.y * sin + point.z * cos
        };
    }

    rotateY(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: point.x * cos + point.z * sin,
            y: point.y,
            z: -point.x * sin + point.z * cos
        };
    }

    rotateZ(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: point.x * cos - point.y * sin,
            y: point.x * sin + point.y * cos,
            z: point.z
        };
    }

    rotatePoint(point, rotX, rotY, rotZ) {
        let p = this.rotateX(point, rotX);
        p = this.rotateY(p, rotY);
        p = this.rotateZ(p, rotZ);
        return p;
    }

    projectTo2D(point, focalLength) {
        const scale = focalLength / (focalLength + point.z);
        return {
            x: point.x * scale,
            y: point.y * scale,
            scale: scale
        };
    }

    // Cube geometry definition
    setupCubeGeometry() {
        // Base vertices for unit cube (will be scaled)
        this.cubeVertices = [
            { x: -1, y: -1, z: -1 }, // 0: back-bottom-left
            { x:  1, y: -1, z: -1 }, // 1: back-bottom-right
            { x:  1, y:  1, z: -1 }, // 2: back-top-right
            { x: -1, y:  1, z: -1 }, // 3: back-top-left
            { x: -1, y: -1, z:  1 }, // 4: front-bottom-left
            { x:  1, y: -1, z:  1 }, // 5: front-bottom-right
            { x:  1, y:  1, z:  1 }, // 6: front-top-right
            { x: -1, y:  1, z:  1 }, // 7: front-top-left
        ];

        // Face definitions with vertex indices and die values
        // Standard die: opposite faces sum to 7 (1-6, 2-5, 3-4)
        this.cubeFaces = [
            { vertices: [4, 5, 6, 7], value: 1, normal: { x: 0, y: 0, z: 1 } },   // Front
            { vertices: [1, 0, 3, 2], value: 6, normal: { x: 0, y: 0, z: -1 } },  // Back
            { vertices: [0, 4, 7, 3], value: 3, normal: { x: -1, y: 0, z: 0 } },  // Left
            { vertices: [5, 1, 2, 6], value: 4, normal: { x: 1, y: 0, z: 0 } },   // Right
            { vertices: [7, 6, 2, 3], value: 2, normal: { x: 0, y: 1, z: 0 } },   // Top
            { vertices: [0, 1, 5, 4], value: 5, normal: { x: 0, y: -1, z: 0 } },  // Bottom
        ];

        // Pip positions for each face value (in local 2D face coordinates, -1 to 1)
        this.pipPositions = {
            1: [[0, 0]],
            2: [[-0.5, -0.5], [0.5, 0.5]],
            3: [[-0.5, -0.5], [0, 0], [0.5, 0.5]],
            4: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]],
            5: [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]],
            6: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0], [0.5, 0], [-0.5, 0.5], [0.5, 0.5]]
        };

        // Map die value to rotation angles (rotX, rotY) to show that face
        this.faceRotations = {
            1: { rotX: 0, rotY: 0 },
            2: { rotX: -Math.PI / 2, rotY: 0 },
            3: { rotX: 0, rotY: Math.PI / 2 },
            4: { rotX: 0, rotY: -Math.PI / 2 },
            5: { rotX: Math.PI / 2, rotY: 0 },
            6: { rotX: Math.PI, rotY: 0 }
        };
    }

    roll(die1Value, die2Value, callback) {
        this.showDiceModal(die1Value, die2Value, callback);
    }

    showDiceModal(die1Value, die2Value, callback) {
        const scene = this.scene;
        const { width, height } = scene.cameras.main;

        // Create modal container
        const modalContainer = scene.add.container(0, 0);
        modalContainer.setDepth(1000);

        // Dark overlay
        const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        modalContainer.add(overlay);

        // Die size and positions
        const dieSize = Math.min(width, height) * 0.12;
        const dieSpacing = dieSize * 2.5;
        const centerY = height * 0.45;
        const die1X = width / 2 - dieSpacing / 2;
        const die2X = width / 2 + dieSpacing / 2;

        // Create dice containers
        const die1Container = scene.add.container(die1X, centerY);
        const die2Container = scene.add.container(die2X, centerY);
        modalContainer.add([die1Container, die2Container]);

        // Animation parameters
        const rollDuration = GAME_CONSTANTS.DICE_ROLL_DURATION;
        const focalLength = dieSize * 8;

        // Starting rotations (random for variety)
        const rot1 = { x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2, z: 0 };
        const rot2 = { x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2, z: 0 };

        // Target rotations for final values
        const target1 = this.faceRotations[die1Value];
        const target2 = this.faceRotations[die2Value];

        // Total rotation (multiple full spins + final position)
        // IMPORTANT: All offsets must be multiples of 2π to avoid visual "pop" at animation end
        const targetRot1 = {
            x: target1.rotX + Math.PI * 6,   // 3 full X rotations (6π = 3 × 2π)
            y: target1.rotY + Math.PI * 4,   // 2 full Y rotations (4π = 2 × 2π)
            z: 0
        };
        const targetRot2 = {
            x: target2.rotX + Math.PI * 6,   // 3 full X rotations
            y: target2.rotY + Math.PI * 2,   // 1 full Y rotation (variety between dice)
            z: 0
        };

        // Seeds for smooth noise (different per die)
        const seed1 = Math.random() * 100;
        const seed2 = Math.random() * 100 + 50;

        // Max bounce height
        const maxBounceHeight = dieSize * 0.35;

        // Draw initial state
        this.drawDropShadow(scene, die1Container, dieSize);
        this.draw3DCube(scene, die1Container, dieSize, focalLength, rot1.x, rot1.y, rot1.z);
        this.drawDropShadow(scene, die2Container, dieSize);
        this.draw3DCube(scene, die2Container, dieSize, focalLength, rot2.x, rot2.y, rot2.z);

        const startTime = scene.time.now;

        // Animation loop
        const animEvent = scene.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => {
                const elapsed = scene.time.now - startTime;
                const progress = Math.min(elapsed / rollDuration, 1);

                // Simple smooth easing (quintic ease-out)
                const eased = this.easeOutQuint(progress);

                // Interpolate rotations smoothly
                const currentRot1 = {
                    x: rot1.x + (targetRot1.x - rot1.x) * eased,
                    y: rot1.y + (targetRot1.y - rot1.y) * eased,
                    z: 0
                };
                const currentRot2 = {
                    x: rot2.x + (targetRot2.x - rot2.x) * eased,
                    y: rot2.y + (targetRot2.y - rot2.y) * eased,
                    z: 0
                };

                // Bounce effect - decays over time
                const t = elapsed / 1000;
                const bounce1 = this.decayingBounce(t, maxBounceHeight);
                const bounce2 = this.decayingBounce(t + 0.05, maxBounceHeight * 0.85);

                // Smooth shake that decays
                const shakeDecay = Math.max(0, 1 - progress * 1.3);
                const shake1X = this.smoothNoise(elapsed, seed1) * 8 * shakeDecay;
                const shake2X = this.smoothNoise(elapsed, seed2) * 8 * shakeDecay;

                // Clear and redraw
                die1Container.removeAll(true);
                die2Container.removeAll(true);

                this.drawDropShadow(scene, die1Container, dieSize, bounce1);
                this.draw3DCube(scene, die1Container, dieSize, focalLength, currentRot1.x, currentRot1.y, currentRot1.z);
                this.drawDropShadow(scene, die2Container, dieSize, bounce2);
                this.draw3DCube(scene, die2Container, dieSize, focalLength, currentRot2.x, currentRot2.y, currentRot2.z);

                // Apply position offsets
                die1Container.x = die1X + shake1X;
                die1Container.y = centerY - bounce1;
                die2Container.x = die2X + shake2X;
                die2Container.y = centerY - bounce2;

                // Animation complete
                if (progress >= 1) {
                    animEvent.destroy();

                    // Final positions
                    die1Container.x = die1X;
                    die1Container.y = centerY;
                    die2Container.x = die2X;
                    die2Container.y = centerY;

                    // Final redraw at exact target rotation
                    die1Container.removeAll(true);
                    die2Container.removeAll(true);
                    this.drawDropShadow(scene, die1Container, dieSize, 0);
                    this.draw3DCube(scene, die1Container, dieSize, focalLength, target1.rotX, target1.rotY, 0);
                    this.drawDropShadow(scene, die2Container, dieSize, 0);
                    this.draw3DCube(scene, die2Container, dieSize, focalLength, target2.rotX, target2.rotY, 0);

                    // Update small display
                    this.die1Text.setText(die1Value.toString());
                    this.die2Text.setText(die2Value.toString());

                    // Fade out modal
                    this.closeModal(scene, modalContainer, callback);
                }
            }
        });
    }

    // Draw drop shadow beneath die
    drawDropShadow(scene, container, size, offsetY = 0) {
        const shadowGraphics = scene.add.graphics();
        const shadowWidth = size * 0.9;
        const shadowHeight = size * 0.25;
        const shadowY = size * 0.55 + offsetY * 0.3;

        // Draw multiple ellipses for blur effect
        for (let i = 3; i >= 0; i--) {
            const alpha = 0.15 - i * 0.03;
            const expand = i * 4;
            shadowGraphics.fillStyle(0x000000, alpha);
            shadowGraphics.fillEllipse(0, shadowY, shadowWidth + expand, shadowHeight + expand * 0.3);
        }
        container.add(shadowGraphics);
    }

    // Calculate lighting with ambient, diffuse, and specular components
    calculateLighting(rotatedNormal) {
        // Light direction (from top-front-right)
        const lightDir = { x: 0.3, y: -0.6, z: 0.75 };
        const lightMag = Math.sqrt(lightDir.x * lightDir.x + lightDir.y * lightDir.y + lightDir.z * lightDir.z);
        const light = { x: lightDir.x / lightMag, y: lightDir.y / lightMag, z: lightDir.z / lightMag };

        // View direction (toward camera)
        const view = { x: 0, y: 0, z: 1 };

        // Diffuse component
        const diffuse = Math.max(0, rotatedNormal.x * light.x + rotatedNormal.y * light.y + rotatedNormal.z * light.z);

        // Specular component (Blinn-Phong)
        const halfVector = {
            x: (light.x + view.x),
            y: (light.y + view.y),
            z: (light.z + view.z)
        };
        const halfMag = Math.sqrt(halfVector.x * halfVector.x + halfVector.y * halfVector.y + halfVector.z * halfVector.z);
        const half = { x: halfVector.x / halfMag, y: halfVector.y / halfMag, z: halfVector.z / halfMag };
        const specDot = Math.max(0, rotatedNormal.x * half.x + rotatedNormal.y * half.y + rotatedNormal.z * half.z);
        const specular = Math.pow(specDot, 32) * 0.4;

        // Combine: ambient + diffuse + specular
        const ambient = 0.35;
        const brightness = Math.min(1, ambient + diffuse * 0.55 + specular);

        return { brightness, specular };
    }

    // Get color with brightness applied
    applyBrightness(baseR, baseG, baseB, brightness, specular) {
        // Add specular as white highlight
        const r = Math.min(255, Math.floor(baseR * brightness + specular * 255));
        const g = Math.min(255, Math.floor(baseG * brightness + specular * 255));
        const b = Math.min(255, Math.floor(baseB * brightness + specular * 255));
        return (r << 16) | (g << 8) | b;
    }

    // Shrink vertices toward center for bevel effect
    shrinkVertices(vertices, factor) {
        const cx = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
        const cy = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
        return vertices.map(v => ({
            x: cx + (v.x - cx) * factor,
            y: cy + (v.y - cy) * factor
        }));
    }

    draw3DCube(scene, container, size, focalLength, rotX, rotY, rotZ) {
        const halfSize = size / 2;

        // Scale and rotate vertices
        const transformedVertices = this.cubeVertices.map(v => {
            const scaled = { x: v.x * halfSize, y: v.y * halfSize, z: v.z * halfSize };
            return this.rotatePoint(scaled, rotX, rotY, rotZ);
        });

        // Project vertices to 2D
        const projectedVertices = transformedVertices.map(v => this.projectTo2D(v, focalLength));

        // Calculate face data for sorting and visibility
        const faceData = this.cubeFaces.map((face, index) => {
            const rotatedNormal = this.rotatePoint(face.normal, rotX, rotY, rotZ);
            const visible = rotatedNormal.z > 0.01;  // Epsilon threshold for edge-on faces
            const avgZ = face.vertices.reduce((sum, vi) => sum + transformedVertices[vi].z, 0) / 4;
            return { index, face, visible, avgZ, rotatedNormal };
        });

        // Filter visible faces and sort by depth (back to front)
        const visibleFaces = faceData
            .filter(f => f.visible)
            .sort((a, b) => a.avgZ - b.avgZ);

        // Base colors (ivory/bone dice)
        const baseR = 0xf8, baseG = 0xf0, baseB = 0xe0;
        const bevelR = 0xd0, bevelG = 0xc8, bevelB = 0xb8;

        // Draw faces with bevel effect
        visibleFaces.forEach(faceInfo => {
            const face = faceInfo.face;
            const vertices = face.vertices.map(vi => projectedVertices[vi]);
            const lighting = this.calculateLighting(faceInfo.rotatedNormal);

            // Outer bevel (darker edge)
            const bevelColor = this.applyBrightness(bevelR, bevelG, bevelB, lighting.brightness * 0.7, 0);
            const bevelGraphics = scene.add.graphics();
            bevelGraphics.fillStyle(bevelColor);
            bevelGraphics.beginPath();
            bevelGraphics.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
                bevelGraphics.lineTo(vertices[i].x, vertices[i].y);
            }
            bevelGraphics.closePath();
            bevelGraphics.fill();
            container.add(bevelGraphics);

            // Inner face (main surface) - shrunk slightly for bevel effect
            const innerVertices = this.shrinkVertices(vertices, 0.88);
            const faceColor = this.applyBrightness(baseR, baseG, baseB, lighting.brightness, lighting.specular);
            const faceGraphics = scene.add.graphics();
            faceGraphics.fillStyle(faceColor);
            faceGraphics.beginPath();
            faceGraphics.moveTo(innerVertices[0].x, innerVertices[0].y);
            for (let i = 1; i < innerVertices.length; i++) {
                faceGraphics.lineTo(innerVertices[i].x, innerVertices[i].y);
            }
            faceGraphics.closePath();
            faceGraphics.fill();
            container.add(faceGraphics);

            // Draw pips on this face
            this.drawPipsOnFace(scene, container, face, faceInfo.rotatedNormal, transformedVertices, projectedVertices, focalLength, size, faceInfo.index);
        });

        // Draw visible edges for cube definition
        this.drawCubeEdges(scene, container, transformedVertices, projectedVertices, focalLength, rotX, rotY, rotZ);
    }

    // Draw visible cube edges (silhouette edges only)
    drawCubeEdges(scene, container, transformedVertices, projectedVertices, focalLength, rotX, rotY, rotZ) {
        // Edge-to-face adjacency: which faces share each edge
        const edgeFaces = [
            // Back face edges
            { edge: [0, 1], faces: [1, 5] }, // back-bottom
            { edge: [1, 2], faces: [1, 3] }, // back-right
            { edge: [2, 3], faces: [1, 4] }, // back-top
            { edge: [3, 0], faces: [1, 2] }, // back-left
            // Front face edges
            { edge: [4, 5], faces: [0, 5] }, // front-bottom
            { edge: [5, 6], faces: [0, 3] }, // front-right
            { edge: [6, 7], faces: [0, 4] }, // front-top
            { edge: [7, 4], faces: [0, 2] }, // front-left
            // Connecting edges
            { edge: [0, 4], faces: [2, 5] }, // bottom-left
            { edge: [1, 5], faces: [3, 5] }, // bottom-right
            { edge: [2, 6], faces: [3, 4] }, // top-right
            { edge: [3, 7], faces: [2, 4] }, // top-left
        ];

        const edgeGraphics = scene.add.graphics();

        edgeFaces.forEach(({ edge: [i1, i2], faces: [f1, f2] }) => {
            // Get face normals
            const normal1 = this.rotatePoint(this.cubeFaces[f1].normal, rotX, rotY, rotZ);
            const normal2 = this.rotatePoint(this.cubeFaces[f2].normal, rotX, rotY, rotZ);

            // Edge is visible if one face is visible and one is hidden (silhouette edge)
            const face1Visible = normal1.z > 0;
            const face2Visible = normal2.z > 0;

            // Draw edge if it's a silhouette edge (one face visible, one hidden)
            // OR if both faces are visible (shared edge between visible faces)
            if (face1Visible !== face2Visible || (face1Visible && face2Visible)) {
                const p1 = projectedVertices[i1];
                const p2 = projectedVertices[i2];

                // Silhouette edges are darker, shared edges are lighter
                const isSilhouette = face1Visible !== face2Visible;
                const edgeColor = isSilhouette ? 0x2a2520 : 0x8a8070;
                const alpha = isSilhouette ? 0.8 : 0.3;
                const lineWidth = isSilhouette ? 2 : 1;

                edgeGraphics.lineStyle(lineWidth, edgeColor, alpha);
                edgeGraphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
            }
        });

        container.add(edgeGraphics);
    }

    drawPipsOnFace(scene, container, face, rotatedNormal, transformedVertices, projectedVertices, focalLength, size, faceIndex) {
        const value = face.value;
        const pips = this.pipPositions[value];
        if (!pips) return;

        // Calculate pip opacity based on face angle toward camera
        // Fade out pips as face rotates away (smoother visual transition)
        const pipOpacity = Math.min(1, Math.max(0, (rotatedNormal.z - 0.15) / 0.35));
        // z <= 0.15: opacity = 0 (hidden)
        // z >= 0.5: opacity = 1 (fully visible)
        // Between: smooth linear fade

        // Skip drawing pips entirely if opacity is very low
        if (pipOpacity < 0.05) return;

        // Get the 4 corners of this face in 3D
        const corners3D = face.vertices.map(vi => transformedVertices[vi]);
        const corners2D = face.vertices.map(vi => projectedVertices[vi]);

        // Calculate average scale for pip size
        const avgScale = corners2D.reduce((sum, v) => sum + v.scale, 0) / 4;
        const pipRadius = size * 0.065 * avgScale;

        // Calculate lighting for pip shading
        const lighting = this.calculateLighting(rotatedNormal);

        pips.forEach(([px, py]) => {
            // Use face center and offset approach
            const centerX = corners3D.reduce((sum, c) => sum + c.x, 0) / 4;
            const centerY = corners3D.reduce((sum, c) => sum + c.y, 0) / 4;
            const centerZ = corners3D.reduce((sum, c) => sum + c.z, 0) / 4;

            // Calculate face axes
            const edge1 = {
                x: corners3D[1].x - corners3D[0].x,
                y: corners3D[1].y - corners3D[0].y,
                z: corners3D[1].z - corners3D[0].z
            };
            const edge2 = {
                x: corners3D[3].x - corners3D[0].x,
                y: corners3D[3].y - corners3D[0].y,
                z: corners3D[3].z - corners3D[0].z
            };

            const scale1 = size * 0.35;
            const scale2 = size * 0.35;
            const len1 = Math.sqrt(edge1.x * edge1.x + edge1.y * edge1.y + edge1.z * edge1.z);
            const len2 = Math.sqrt(edge2.x * edge2.x + edge2.y * edge2.y + edge2.z * edge2.z);

            const pip3D = {
                x: centerX + (edge1.x / len1) * px * scale1 + (edge2.x / len2) * py * scale2,
                y: centerY + (edge1.y / len1) * px * scale1 + (edge2.y / len2) * py * scale2,
                z: centerZ + (edge1.z / len1) * px * scale1 + (edge2.z / len2) * py * scale2
            };

            // Offset slightly toward camera
            pip3D.z += rotatedNormal.z * 0.5;
            pip3D.x += rotatedNormal.x * 0.5;
            pip3D.y += rotatedNormal.y * 0.5;

            const pip2D = this.projectTo2D(pip3D, focalLength);
            const r = pipRadius * pip2D.scale;

            // Draw pip with inset effect (outer ring lighter, inner darker)
            // Apply pipOpacity to fade out pips on faces rotating away
            const pipGraphics = scene.add.graphics();

            // Outer ring (shadow/indent effect) - slightly larger, darker
            const shadowColor = 0x2a2520;
            pipGraphics.fillStyle(shadowColor, 0.6 * pipOpacity);
            pipGraphics.fillCircle(pip2D.x + r * 0.1, pip2D.y + r * 0.1, r * 1.1);

            // Main pip (dark)
            const pipColor = 0x1a1510;
            pipGraphics.fillStyle(pipColor, pipOpacity);
            pipGraphics.fillCircle(pip2D.x, pip2D.y, r);

            // Highlight (small bright spot for depth)
            const highlightBrightness = lighting.brightness * 0.3;
            if (highlightBrightness > 0.1 && pipOpacity > 0.3) {
                pipGraphics.fillStyle(0x3a3530, highlightBrightness * pipOpacity);
                pipGraphics.fillCircle(pip2D.x - r * 0.25, pip2D.y - r * 0.25, r * 0.35);
            }

            container.add(pipGraphics);
        });
    }

    closeModal(scene, modalContainer, callback) {
        scene.time.delayedCall(500, () => {
            scene.tweens.add({
                targets: modalContainer,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    modalContainer.destroy();
                    if (callback) callback();
                }
            });
        });
    }

    clear() {
        this.die1Text.setText('-');
        this.die2Text.setText('-');
    }
}
