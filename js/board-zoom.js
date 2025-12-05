/**
 * BoardZoomController
 * Handles pinch-to-zoom and pan gestures for the game board
 * Preserves percentage-based card positioning by only transforming the container
 */
class BoardZoomController {
    constructor(viewportElement, boardElement) {
        this.viewport = viewportElement;
        this.board = boardElement;

        // Zoom state
        this.scale = 1;
        this.minScale = 1;
        this.maxScale = 3;

        // Pan state
        this.translateX = 0;
        this.translateY = 0;

        // Touch tracking
        this.activeTouches = new Map();
        this.lastTouchDistance = 0;
        this.lastTouchCenter = { x: 0, y: 0 };
        this.isPanning = false;
        this.isZooming = false;

        // Double-tap detection
        this.lastTapTime = 0;
        this.lastTapPosition = { x: 0, y: 0 };
        this.doubleTapThreshold = 300; // ms
        this.doubleTapDistance = 30; // px

        // Momentum/inertia
        this.velocity = { x: 0, y: 0 };
        this.lastMoveTime = 0;
        this.momentumAnimationId = null;

        // Zoom indicator
        this.zoomIndicator = null;
        this.zoomIndicatorTimeout = null;

        this.init();
    }

    init() {
        this.calculateMinScale();
        this.createZoomIndicator();
        this.bindEvents();
        this.updateTransform();
    }

    /**
     * Calculate minimum scale to fit board in viewport
     */
    calculateMinScale() {
        const viewportRect = this.viewport.getBoundingClientRect();
        const boardAspect = 1200 / 1311; // Board aspect ratio

        // Calculate what scale would fit the board width to viewport width
        const scaleByWidth = viewportRect.width / (viewportRect.height * boardAspect);

        // Minimum scale should allow board to fit while maintaining aspect ratio
        // But never less than a threshold that makes the board too small
        this.minScale = Math.max(0.5, Math.min(1, scaleByWidth));

        // Start at minimum scale (fit to viewport)
        this.scale = this.minScale;
    }

    /**
     * Create zoom indicator element
     */
    createZoomIndicator() {
        this.zoomIndicator = document.createElement('div');
        this.zoomIndicator.className = 'zoom-indicator';
        this.zoomIndicator.textContent = '100%';
        this.viewport.appendChild(this.zoomIndicator);
    }

    /**
     * Bind touch and mouse events
     */
    bindEvents() {
        // Touch events
        this.viewport.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.viewport.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.viewport.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.viewport.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });

        // Mouse wheel for desktop testing
        this.viewport.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        // Check if touch target is an interactive element (guild card or expedition)
        const target = e.target;
        const isInteractiveElement = target.closest('.guild-card') ||
                                      target.closest('#expedition-card');

        // Only prevent default if NOT touching an interactive element
        // This allows click events to be generated for guild/expedition taps
        if (!isInteractiveElement) {
            e.preventDefault();
        }

        // Stop any ongoing momentum animation
        this.stopMomentum();

        // Track all active touches
        for (const touch of e.changedTouches) {
            this.activeTouches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY
            });
        }

        const touchCount = this.activeTouches.size;

        if (touchCount === 2) {
            // Start pinch zoom
            this.isZooming = true;
            this.isPanning = false;
            const touches = Array.from(this.activeTouches.values());
            this.lastTouchDistance = this.getDistance(touches[0], touches[1]);
            this.lastTouchCenter = this.getCenter(touches[0], touches[1]);
        } else if (touchCount === 1 && this.scale > this.minScale) {
            // Start pan (only when zoomed in)
            this.isPanning = true;
            this.isZooming = false;
            const touch = Array.from(this.activeTouches.values())[0];
            this.lastTouchCenter = { x: touch.x, y: touch.y };
            this.lastMoveTime = Date.now();
            this.velocity = { x: 0, y: 0 };
        }
    }

    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        // Update tracked touches
        for (const touch of e.changedTouches) {
            if (this.activeTouches.has(touch.identifier)) {
                this.activeTouches.set(touch.identifier, {
                    x: touch.clientX,
                    y: touch.clientY
                });
            }
        }

        const touchCount = this.activeTouches.size;

        if (this.isZooming && touchCount === 2) {
            // Pinch zoom
            const touches = Array.from(this.activeTouches.values());
            const newDistance = this.getDistance(touches[0], touches[1]);
            const newCenter = this.getCenter(touches[0], touches[1]);

            // Calculate scale change
            const scaleDelta = newDistance / this.lastTouchDistance;
            const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * scaleDelta));

            // Zoom toward the pinch center
            if (newScale !== this.scale) {
                const viewportRect = this.viewport.getBoundingClientRect();
                const centerX = newCenter.x - viewportRect.left - viewportRect.width / 2;
                const centerY = newCenter.y - viewportRect.top - viewportRect.height / 2;

                // Adjust translation to zoom toward center
                const scaleRatio = newScale / this.scale;
                this.translateX = centerX - (centerX - this.translateX) * scaleRatio;
                this.translateY = centerY - (centerY - this.translateY) * scaleRatio;

                this.scale = newScale;
                this.constrainPan();
                this.updateTransform();
                this.showZoomIndicator();
            }

            this.lastTouchDistance = newDistance;
            this.lastTouchCenter = newCenter;
            e.preventDefault();

        } else if (this.isPanning && touchCount === 1) {
            // Pan
            const touch = Array.from(this.activeTouches.values())[0];
            const deltaX = touch.x - this.lastTouchCenter.x;
            const deltaY = touch.y - this.lastTouchCenter.y;

            // Calculate velocity for momentum
            const now = Date.now();
            const dt = now - this.lastMoveTime;
            if (dt > 0) {
                this.velocity.x = deltaX / dt * 16; // Normalize to ~60fps
                this.velocity.y = deltaY / dt * 16;
            }
            this.lastMoveTime = now;

            this.translateX += deltaX;
            this.translateY += deltaY;
            this.constrainPan();
            this.updateTransform();

            this.lastTouchCenter = { x: touch.x, y: touch.y };
            e.preventDefault();
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        // Double-tap zoom disabled - conflicts with guild/expedition investment
        // If needed, can be re-enabled by uncommenting:
        // if (e.changedTouches.length === 1 && this.activeTouches.size === 1) {
        //     const touch = e.changedTouches[0];
        //     this.checkDoubleTap(touch.clientX, touch.clientY);
        // }

        // Remove ended touches
        for (const touch of e.changedTouches) {
            this.activeTouches.delete(touch.identifier);
        }

        // Start momentum if we were panning
        if (this.isPanning && this.activeTouches.size === 0) {
            this.startMomentum();
        }

        // Reset states if no more touches
        if (this.activeTouches.size === 0) {
            this.isZooming = false;
            this.isPanning = false;
        } else if (this.activeTouches.size === 1) {
            // Switched from pinch to pan
            this.isZooming = false;
            if (this.scale > this.minScale) {
                this.isPanning = true;
                const touch = Array.from(this.activeTouches.values())[0];
                this.lastTouchCenter = { x: touch.x, y: touch.y };
            }
        }
    }

    /**
     * Check for double-tap gesture
     */
    checkDoubleTap(x, y) {
        const now = Date.now();
        const timeDiff = now - this.lastTapTime;
        const distance = this.getDistance(
            { x, y },
            this.lastTapPosition
        );

        if (timeDiff < this.doubleTapThreshold && distance < this.doubleTapDistance) {
            // Double-tap detected
            if (this.scale > this.minScale) {
                // Zoom out to min scale
                this.animateToScale(this.minScale, x, y);
            } else {
                // Zoom in to 2x
                this.animateToScale(2, x, y);
            }
            this.lastTapTime = 0; // Reset to prevent triple-tap
        } else {
            this.lastTapTime = now;
            this.lastTapPosition = { x, y };
        }
    }

    /**
     * Animate zoom to target scale
     */
    animateToScale(targetScale, centerX, centerY) {
        const startScale = this.scale;
        const startTranslateX = this.translateX;
        const startTranslateY = this.translateY;

        const viewportRect = this.viewport.getBoundingClientRect();
        const relCenterX = centerX - viewportRect.left - viewportRect.width / 2;
        const relCenterY = centerY - viewportRect.top - viewportRect.height / 2;

        // Calculate target translation
        let targetTranslateX, targetTranslateY;
        if (targetScale <= this.minScale) {
            targetTranslateX = 0;
            targetTranslateY = 0;
        } else {
            const scaleRatio = targetScale / startScale;
            targetTranslateX = relCenterX - (relCenterX - startTranslateX) * scaleRatio;
            targetTranslateY = relCenterY - (relCenterY - startTranslateY) * scaleRatio;
        }

        const duration = 200; // ms
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = this.easeOutCubic(progress);

            this.scale = startScale + (targetScale - startScale) * eased;
            this.translateX = startTranslateX + (targetTranslateX - startTranslateX) * eased;
            this.translateY = startTranslateY + (targetTranslateY - startTranslateY) * eased;

            this.constrainPan();
            this.updateTransform();
            this.showZoomIndicator();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Start momentum animation after pan
     */
    startMomentum() {
        const friction = 0.95;
        const minVelocity = 0.5;

        const animate = () => {
            this.velocity.x *= friction;
            this.velocity.y *= friction;

            if (Math.abs(this.velocity.x) < minVelocity && Math.abs(this.velocity.y) < minVelocity) {
                this.stopMomentum();
                return;
            }

            this.translateX += this.velocity.x;
            this.translateY += this.velocity.y;
            this.constrainPan();
            this.updateTransform();

            this.momentumAnimationId = requestAnimationFrame(animate);
        };

        this.momentumAnimationId = requestAnimationFrame(animate);
    }

    /**
     * Stop momentum animation
     */
    stopMomentum() {
        if (this.momentumAnimationId) {
            cancelAnimationFrame(this.momentumAnimationId);
            this.momentumAnimationId = null;
        }
        this.velocity = { x: 0, y: 0 };
    }

    /**
     * Handle mouse wheel (for desktop testing)
     */
    handleWheel(e) {
        e.preventDefault();

        const viewportRect = this.viewport.getBoundingClientRect();
        const centerX = e.clientX - viewportRect.left - viewportRect.width / 2;
        const centerY = e.clientY - viewportRect.top - viewportRect.height / 2;

        // Calculate new scale
        const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * scaleDelta));

        if (newScale !== this.scale) {
            // Zoom toward mouse position
            const scaleRatio = newScale / this.scale;
            this.translateX = centerX - (centerX - this.translateX) * scaleRatio;
            this.translateY = centerY - (centerY - this.translateY) * scaleRatio;

            this.scale = newScale;
            this.constrainPan();
            this.updateTransform();
            this.showZoomIndicator();
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.calculateMinScale();
        if (this.scale < this.minScale) {
            this.scale = this.minScale;
        }
        this.constrainPan();
        this.updateTransform();
    }

    /**
     * Constrain pan to keep board visible
     */
    constrainPan() {
        const viewportRect = this.viewport.getBoundingClientRect();
        const boardRect = this.board.getBoundingClientRect();

        // Calculate scaled board dimensions
        const scaledWidth = boardRect.width;
        const scaledHeight = boardRect.height;

        // Calculate max pan distances
        const maxPanX = Math.max(0, (scaledWidth * this.scale - viewportRect.width) / 2 / this.scale);
        const maxPanY = Math.max(0, (scaledHeight * this.scale - viewportRect.height) / 2 / this.scale);

        // Constrain
        this.translateX = Math.min(maxPanX, Math.max(-maxPanX, this.translateX));
        this.translateY = Math.min(maxPanY, Math.max(-maxPanY, this.translateY));

        // If at min scale, center the board
        if (this.scale <= this.minScale) {
            this.translateX = 0;
            this.translateY = 0;
        }
    }

    /**
     * Update CSS transform
     */
    updateTransform() {
        // Apply transform to board element only
        this.board.style.transform = `scale(${this.scale}) translate(${this.translateX / this.scale}px, ${this.translateY / this.scale}px)`;
    }

    /**
     * Show zoom indicator briefly
     */
    showZoomIndicator() {
        if (this.zoomIndicator) {
            const percentage = Math.round(this.scale * 100 / this.minScale);
            this.zoomIndicator.textContent = `${percentage}%`;
            this.zoomIndicator.classList.add('visible');

            clearTimeout(this.zoomIndicatorTimeout);
            this.zoomIndicatorTimeout = setTimeout(() => {
                this.zoomIndicator.classList.remove('visible');
            }, 1000);
        }
    }

    /**
     * Calculate distance between two points
     */
    getDistance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate center point between two points
     */
    getCenter(p1, p2) {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    }

    /**
     * Easing function for animations
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Reset zoom and pan to default
     */
    reset() {
        this.stopMomentum();
        this.scale = this.minScale;
        this.translateX = 0;
        this.translateY = 0;
        this.updateTransform();
    }

    /**
     * Get current zoom level (as percentage of min scale)
     */
    getZoomLevel() {
        return this.scale / this.minScale;
    }

    /**
     * Check if board is zoomed in
     */
    isZoomedIn() {
        return this.scale > this.minScale + 0.01;
    }
}

// Export for use in portrait-ui.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoardZoomController;
}
