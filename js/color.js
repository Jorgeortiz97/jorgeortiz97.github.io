
const input = document.getElementById('imgInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const paletteDiv = document.getElementById('palette');


function kmeans(data, k = 4, maxIter = 10) {
    // initialize centroids randomly
    const centroids = data.slice(0).sort(() => 0.5 - Math.random()).slice(0, k);
    let assignments = new Array(data.length).fill(0);
    for (let iter = 0; iter < maxIter; iter++) {
        // assign points to nearest centroid
        for (let i = 0; i < data.length; i++) {
            let minDist = Infinity, best = 0;
            for (let c = 0; c < k; c++) {
                const dist = distanceSq(data[i], centroids[c]);
                if (dist < minDist) { minDist = dist; best = c; }
            }
            assignments[i] = best;
        }
        // recompute centroids
        const sums = Array.from({ length: k }, () => [0, 0, 0, 0]); // [r,g,b,count]
        for (let i = 0; i < data.length; i++) {
            const c = assignments[i];
            const p = data[i];
            sums[c][0] += p[0]; sums[c][1] += p[1]; sums[c][2] += p[2]; sums[c][3]++;
        }
        for (let c = 0; c < k; c++) {
            if (sums[c][3] === 0) continue; // avoid empty cluster
            centroids[c] = [
                sums[c][0] / sums[c][3],
                sums[c][1] / sums[c][3],
                sums[c][2] / sums[c][3],
            ];
        }
    }
    return { centroids, assignments };
}

const distanceSq = (p1, p2) => {
    return (p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2;
};

function renderPalette(centroids) {
    paletteDiv.innerHTML = '';
    centroids.forEach(c => {
        const color = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
        const swatch = document.createElement('div');
        swatch.className = 'swatch';
        swatch.style.background = color;
        const label = document.createElement('span');
        label.textContent = rgbToHex(c[0], c[1], c[2]);
        swatch.appendChild(label);
        paletteDiv.appendChild(swatch);
    });
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16).padStart(2, '0');
        return hex;
    }).join('');
}



const fileButton = document.getElementById("fileButton");
const fileInput = document.getElementById("fileInput");

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
  
    if (file) {
        const img = new Image();
        img.onload = () => {
            // draw scaled 64x64
            ctx.clearRect(0, 0, 64, 64);
            ctx.drawImage(img, 0, 0, 64, 64);
            const imageData = ctx.getImageData(0, 0, 64, 64);
            const pixels = [];
            for (let i = 0; i < imageData.data.length; i += 4) {
                pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
            }
            const clusters = kmeans(pixels, 4, 10);
            renderPalette(clusters.centroids);
        };
        img.src = URL.createObjectURL(file);
    }
  });

fileButton.addEventListener("click", () => {
  fileInput.click();
});

