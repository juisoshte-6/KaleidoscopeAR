const video = document.getElementById('video');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
const zoomSlider = document.getElementById('zoomSlider');
const speedSlider = document.getElementById('speedSlider');

// Resize canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Initialize MediaPipe FaceMesh
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});
faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
let latestFaceResults = null;
faceMesh.onResults((results) => latestFaceResults = results);

// Initialize MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
let latestHandResults = null;
hands.onResults((results) => latestHandResults = results);

// Camera setup
const camera = new Camera(video, {
    onFrame: async () => {
        await faceMesh.send({ image: video });
        await hands.send({ image: video });
    },
    width: 640,
    height: 480
});
camera.start();

// Key face landmarks for smooth outline
const FACE_OUTLINE = [
    10, 338, 297, 332, 284, 251, 389, 356, 454,
    323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
    148, 176, 149, 150, 136, 172, 58, 132, 93,
    234, 127, 162, 21, 54, 103, 67, 109, 10
];

// Eye landmarks
const LEFT_EYE = [33, 160, 158, 133, 153, 144, 145, 153];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380, 374, 373];

// Draw kaleidoscope with face and hand overlays
let lastFrameTime = 0;

function draw(timestamp) {
    const zoom = parseFloat(zoomSlider.value);
    const speed = parseInt(speedSlider.value);
    
    // Slowest speed = 1 frame every 1000 ms (1 second), Fastest = 1000/100 ms = 10 frames per second
    const frameInterval = 1000 / Math.max(0.01, speed);

    if (timestamp - lastFrameTime > frameInterval) {
        lastFrameTime = timestamp;

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const slices = 6;
        const sliceAngle = (2 * Math.PI) / slices;
        const radius = (Math.min(canvas.width, canvas.height) / 2) * zoom;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        for (let i = 0; i < slices; i++) {
            ctx.save();
            ctx.rotate(i * sliceAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(radius * Math.cos(sliceAngle / 2), radius * Math.sin(sliceAngle / 2));
            ctx.lineTo(radius * Math.cos(-sliceAngle / 2), radius * Math.sin(-sliceAngle / 2));
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2, video.videoWidth, video.videoHeight);

            // Draw face overlay (Pink)
            if (latestFaceResults) {
                latestFaceResults.multiFaceLandmarks.forEach((faceLandmarks) => {
                    ctx.beginPath();
                    FACE_OUTLINE.forEach((index, i) => {
                        const x = (faceLandmarks[index].x - 0.5) * canvas.width;
                        const y = (faceLandmarks[index].y - 0.5) * canvas.height;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    });
                    ctx.closePath();
                    ctx.fillStyle = 'rgba(255, 20, 147, 0.7)'; // Pink
                    ctx.fill();

                    // Draw eyes (Orange)
                    [LEFT_EYE, RIGHT_EYE].forEach((eye) => {
                        ctx.beginPath();
                        eye.forEach((index, i) => {
                            const x = (faceLandmarks[index].x - 0.5) * canvas.width;
                            const y = (faceLandmarks[index].y - 0.5) * canvas.height;
                            if (i === 0) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        });
                        ctx.closePath();
                        ctx.fillStyle = 'rgba(255, 165, 0, 0.7)';
                        ctx.fill();
                    });
                });
            }

            // Draw hands (Cyan and Blue)
            if (latestHandResults) {
                latestHandResults.multiHandLandmarks.forEach((handLandmarks, handIndex) => {
                    ctx.beginPath();
                    handLandmarks.forEach((landmark, index) => {
                        const x = (landmark.x - 0.5) * canvas.width;
                        const y = (landmark.y - 0.5) * canvas.height;
                        if (index === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    });
                    ctx.closePath();
                    ctx.fillStyle = handIndex === 0 ? 'rgba(0, 255, 255, 0.7)' : 'rgba(50, 205, 50, 0.7)';
                    ctx.fill();
                });
            }

            ctx.restore();
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
