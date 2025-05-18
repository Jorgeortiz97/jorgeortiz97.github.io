

const steps = document.querySelectorAll(".step");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const confirmContainer = document.getElementById("confirm-container");

let currentStep = 0;


const shirtErrorMsg = document.getElementById("shirt-error");



function showStep(index) {
    steps.forEach((step, i) => {
        step.classList.toggle("active", i === index);
    });

    // Control de visibilidad de navegación
    prevBtn.style.display = index === 0 ? "none" : "block";
    nextBtn.style.display = index === steps.length - 1 ? "none" : "block";

    // Mostrar u ocultar el botón de confirmación sin afectar el flujo
    if (index === steps.length - 1) {
        confirmContainer.classList.add("visible");
    } else {
        confirmContainer.classList.remove("visible");
    }
}


nextBtn.addEventListener("click", () => {
    // Validar en el paso 1
    if (currentStep === 0 && !selectedShirt) {
        shirtErrorMsg.style.display = "block";
        return;
    }

    // Ocultar error si había uno visible
    shirtErrorMsg.style.display = "none";

    if (currentStep < steps.length - 1) {
        currentStep++;
        showStep(currentStep);
    }
});

prevBtn.addEventListener("click", () => {
    if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
    }
});

document.getElementById("confirmBtn").addEventListener("click", () => {
    alert("Pedido confirmado. ¡Gracias!");
    // Aquí puedes agregar lógica para enviar datos o reiniciar
});



const shirtCards = document.querySelectorAll(".shirt-card");
let selectedShirt = null;

shirtCards.forEach(card => {
  card.addEventListener("click", () => {
    // quitar selección previa
    shirtCards.forEach(c => c.classList.remove("selected"));
    // marcar nueva
    card.classList.add("selected");
    selectedShirt = card.dataset.id;
  });
});


// Mostrar paso inicial
showStep(currentStep);


window.addEventListener("load", () => {
    setTimeout(() => {
        const splash = document.getElementById("splash-screen");
        splash.classList.add("hidden");
        setTimeout(() => {
            splash.style.display = "none";
            document.getElementById("main-content").style.display = "flex";
        }, 500); // wait for fade to finish
    }, 1000);
});
