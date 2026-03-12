// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState, useEffect, useRef, useCallback,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';

import { linkIdToColor, getLinkIdFromState } from '../utils/color';

interface Canvas3DPanelProps {
    job: any;
    frame: number;
    annotations: any[];
    selectedLinkId: string | null;
    onSelectAnnotation: (state: any) => void;
}

const BACKGROUND_COLOR = 0x1a1a2e;
const POINT_SIZE = 0.035;
const POINT_COLOR = 0xcccccc;
const RAYCASTER_THRESHOLD = 0.3;
const SELECTED_OPACITY = 0.15;

/** Parse an HSL color string to a THREE.Color. */
function parseColorToThree(colorStr: string): THREE.Color {
    const el = document.createElement('div');
    el.style.color = colorStr;
    document.body.appendChild(el);
    const computed = getComputedStyle(el).color;
    document.body.removeChild(el);

    const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        return new THREE.Color(
            parseInt(match[1], 10) / 255,
            parseInt(match[2], 10) / 255,
            parseInt(match[3], 10) / 255,
        );
    }
    return new THREE.Color(colorStr);
}

/** Brighten a THREE.Color for selection highlight. */
function brightenColor(color: THREE.Color, factor: number = 0.4): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    return new THREE.Color().setHSL(
        hsl.h,
        Math.min(1, hsl.s * 1.3),
        Math.min(1, hsl.l + factor),
    );
}

function Canvas3DPanel(props: Canvas3DPanelProps): JSX.Element {
    const {
        job, frame, annotations, selectedLinkId, onSelectAnnotation,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const animFrameRef = useRef<number>(0);
    const cuboidGroupRef = useRef<THREE.Group>(new THREE.Group());
    const hitTargetsRef = useRef<THREE.Group>(new THREE.Group());
    const pointCloudRef = useRef<THREE.Points | null>(null);
    const annotationsMapRef = useRef<Map<number, any>>(new Map());
    const mountedRef = useRef<boolean>(true);

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // ---- Scene initialization (mount only) ----
    useEffect(() => {
        mountedRef.current = true;
        const container = containerRef.current;
        if (!container) return undefined;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(BACKGROUND_COLOR);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / (container.clientHeight || 1),
            0.1,
            2000,
        );
        camera.position.set(0, 0, 30);
        camera.up.set(0, 0, 1);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(container.clientWidth, container.clientHeight || 1);
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.15;
        controls.screenSpacePanning = true;
        controlsRef.current = controls;

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(10, 10, 20);
        scene.add(directional);

        // Cuboid groups
        scene.add(cuboidGroupRef.current);
        scene.add(hitTargetsRef.current);

        // Animation loop
        const animate = (): void => {
            if (!mountedRef.current) return;
            animFrameRef.current = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Resize observer
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                    renderer.setSize(width, height);
                }
            }
        });
        resizeObserver.observe(container);

        return () => {
            mountedRef.current = false;
            cancelAnimationFrame(animFrameRef.current);
            resizeObserver.disconnect();
            controls.dispose();
            renderer.dispose();
            if (renderer.domElement.parentElement) {
                renderer.domElement.parentElement.removeChild(renderer.domElement);
            }
            // Dispose scene objects
            scene.traverse((obj) => {
                if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
                    obj.geometry?.dispose();
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach((m: THREE.Material) => m.dispose());
                    } else {
                        obj.material?.dispose();
                    }
                }
                if (obj instanceof THREE.Points) {
                    obj.geometry?.dispose();
                    (obj.material as THREE.Material)?.dispose();
                }
            });
        };
    }, []);

    // ---- Point Cloud Loading (frame / job changes) ----
    useEffect(() => {
        if (!job || !sceneRef.current) return;

        const scene = sceneRef.current;

        setLoading(true);
        setError(null);

        // Remove previous point cloud
        if (pointCloudRef.current) {
            scene.remove(pointCloudRef.current);
            pointCloudRef.current.geometry?.dispose();
            (pointCloudRef.current.material as THREE.Material)?.dispose();
            pointCloudRef.current = null;
        }

        const url = `/api/jobs/${job.id}/data?type=frame&number=${frame}&quality=compressed`;
        const loader = new PCDLoader();

        loader.load(
            url,
            (points: THREE.Points) => {
                if (!mountedRef.current) return;

                // Style the point cloud
                const material = points.material as THREE.PointsMaterial;
                material.size = POINT_SIZE;
                material.color.set(POINT_COLOR);
                material.sizeAttenuation = true;

                // If point cloud has vertex colors, use them
                if (points.geometry.attributes.color) {
                    material.vertexColors = true;
                }

                scene.add(points);
                pointCloudRef.current = points;

                // Auto-center camera on point cloud
                const bbox = new THREE.Box3().setFromObject(points);
                const sphere = new THREE.Sphere();
                bbox.getBoundingSphere(sphere);

                const camera = cameraRef.current;
                const controls = controlsRef.current;
                if (camera && controls) {
                    const radius = Math.max(sphere.radius, 1);
                    const { center } = sphere;
                    camera.position.set(
                        center.x + radius * 1.5,
                        center.y - radius * 1.5,
                        center.z + radius * 1.5,
                    );
                    camera.lookAt(center);
                    controls.target.copy(center);
                    controls.update();
                }

                setLoading(false);
            },
            undefined,
            (err: unknown) => {
                if (!mountedRef.current) return;
                const message = err instanceof Error ? err.message : 'Failed to load point cloud';
                console.error('PCD load error:', err);
                setError(message);
                setLoading(false);
            },
        );
    }, [job, frame]);

    // ---- Cuboid rendering (annotations / selection changes) ----
    useEffect(() => {
        const cuboidGroup = cuboidGroupRef.current;
        const hitTargets = hitTargetsRef.current;

        // Clear previous cuboids
        while (cuboidGroup.children.length > 0) {
            const child = cuboidGroup.children[0];
            cuboidGroup.remove(child);
            if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
                child.geometry?.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach((m: THREE.Material) => m.dispose());
                } else {
                    child.material?.dispose();
                }
            }
            child.traverse?.((obj: THREE.Object3D) => {
                if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
                    obj.geometry?.dispose();
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach((m: THREE.Material) => m.dispose());
                    } else {
                        obj.material?.dispose();
                    }
                }
            });
        }

        while (hitTargets.children.length > 0) {
            const child = hitTargets.children[0];
            hitTargets.remove(child);
            if (child instanceof THREE.Mesh) {
                child.geometry?.dispose();
                (child.material as THREE.Material)?.dispose();
            }
        }

        annotationsMapRef.current.clear();

        if (!annotations || annotations.length === 0) return;

        const cuboidAnnotations = annotations.filter(
            (state: any) => state.shapeType && state.shapeType.includes('cuboid') && !state.outside,
        );

        for (const state of cuboidAnnotations) {
            const points = state.points || [];
            if (points.length < 9) continue;

            // CVAT 3D format: [x, y, z, rx, ry, rz, dx, dy, dz]
            const cx = points[0];
            const cy = points[1];
            const cz = points[2];
            const rx = points[3];
            const ry = points[4];
            const rz = points[5];
            const dx = points[6];
            const dy = points[7];
            const dz = points[8];

            const linkId = getLinkIdFromState(state);
            const colorStr = linkIdToColor(linkId);
            const threeColor = parseColorToThree(colorStr);
            const isSelected = linkId !== null && linkId === selectedLinkId;

            // Wireframe cuboid
            const boxGeo = new THREE.BoxGeometry(1, 1, 1);
            const edgesGeo = new THREE.EdgesGeometry(boxGeo);
            const wireColor = isSelected ? brightenColor(threeColor) : threeColor;
            const lineMat = new THREE.LineBasicMaterial({ color: wireColor, linewidth: 2 });
            const wireframe = new THREE.LineSegments(edgesGeo, lineMat);

            wireframe.position.set(cx, cy, cz);
            wireframe.rotation.set(rx, ry, rz);
            wireframe.scale.set(dx, dy, dz);
            wireframe.userData = { clientID: state.clientID };

            cuboidGroup.add(wireframe);

            // For selected: add a second wireframe slightly scaled up for emphasis
            if (isSelected) {
                const glowEdgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
                const glowMat = new THREE.LineBasicMaterial({
                    color: brightenColor(threeColor, 0.6),
                    linewidth: 2,
                    transparent: true,
                    opacity: 0.5,
                });
                const glowWireframe = new THREE.LineSegments(glowEdgesGeo, glowMat);
                glowWireframe.position.set(cx, cy, cz);
                glowWireframe.rotation.set(rx, ry, rz);
                glowWireframe.scale.set(dx * 1.02, dy * 1.02, dz * 1.02);
                cuboidGroup.add(glowWireframe);

                // Semi-transparent fill for selected cuboid
                const fillGeo = new THREE.BoxGeometry(1, 1, 1);
                const fillMat = new THREE.MeshBasicMaterial({
                    color: threeColor,
                    transparent: true,
                    opacity: SELECTED_OPACITY,
                    depthWrite: false,
                });
                const fillMesh = new THREE.Mesh(fillGeo, fillMat);
                fillMesh.position.set(cx, cy, cz);
                fillMesh.rotation.set(rx, ry, rz);
                fillMesh.scale.set(dx, dy, dz);
                cuboidGroup.add(fillMesh);
            }

            // Invisible hit-test mesh (solid box for reliable raycasting)
            const hitGeo = new THREE.BoxGeometry(1, 1, 1);
            const hitMat = new THREE.MeshBasicMaterial({
                visible: false,
                side: THREE.DoubleSide,
            });
            const hitMesh = new THREE.Mesh(hitGeo, hitMat);
            hitMesh.position.set(cx, cy, cz);
            hitMesh.rotation.set(rx, ry, rz);
            hitMesh.scale.set(dx, dy, dz);
            hitMesh.userData = { clientID: state.clientID };
            hitTargets.add(hitMesh);

            annotationsMapRef.current.set(state.clientID, state);

            boxGeo.dispose();
        }
    }, [annotations, selectedLinkId]);

    // ---- Click interaction (raycasting) ----
    const handleClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            const container = containerRef.current;
            const camera = cameraRef.current;
            if (!container || !camera) return;

            const rect = container.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1,
            );

            const raycaster = new THREE.Raycaster();
            raycaster.params.Line = { threshold: RAYCASTER_THRESHOLD };
            raycaster.setFromCamera(mouse, camera);

            // Ray against invisible hit-test meshes
            const intersects = raycaster.intersectObjects(hitTargetsRef.current.children, false);
            if (intersects.length > 0) {
                const clientID = intersects[0].object.userData?.clientID;
                const state = annotationsMapRef.current.get(clientID);
                if (state) {
                    onSelectAnnotation(state);
                    return;
                }
            }

            // Nothing hit — deselect
            onSelectAnnotation(null);
        },
        [onSelectAnnotation],
    );

    const containerStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#1a1a2e',
    };

    const overlayStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#aaaaaa',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        pointerEvents: 'none',
    };

    const errorStyle: React.CSSProperties = {
        ...overlayStyle,
        color: '#ff6b6b',
    };

    return (
        <div
            ref={containerRef}
            style={containerStyle}
            onClick={handleClick}
            role="presentation"
        >
            {loading && !error && (
                <div style={overlayStyle}>Loading point cloud...</div>
            )}
            {error && (
                <div style={errorStyle}>
                    Error:
                    {' '}
                    {error}
                </div>
            )}
        </div>
    );
}

export default Canvas3DPanel;
