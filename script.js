let selectedDetails = {
  location: null,
  food: null,
  date: null,
  time: null
};

// --- RUNAWAY "NO" BUTTON LOGIC ---
const noBtn = document.getElementById("btn-no");

function moveNoButton() {
  // Make position fixed so it can escape anywhere on screen
  noBtn.style.position = "fixed";
  noBtn.style.zIndex = "999";

  const btnWidth = noBtn.offsetWidth;
  const btnHeight = noBtn.offsetHeight;

  const maxX = window.innerWidth - btnWidth - 40;
  const maxY = window.innerHeight - btnHeight - 40;

  const randomX = Math.max(20, Math.floor(Math.random() * maxX));
  const randomY = Math.max(20, Math.floor(Math.random() * maxY));

  noBtn.style.left = `${randomX}px`;
  noBtn.style.top = `${randomY}px`;
}

noBtn.addEventListener("mouseenter", moveNoButton);
noBtn.addEventListener("mouseover", moveNoButton);
noBtn.addEventListener("click", (e) => {
  e.preventDefault();
  moveNoButton();
});
noBtn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  moveNoButton();
});

// --- STEP NAVIGATION ---
function nextStep(stepNumber) {
  // Reset No button if leaving step 1
  if (stepNumber !== 1) {
    noBtn.style.display = "none";
  }

  document.querySelectorAll(".step").forEach((step) => {
    step.classList.remove("active");
  });
  document.getElementById(`step-${stepNumber}`).classList.add("active");
}

// --- OPTION SELECTION ---
function selectOption(button, type) {
  const parent = button.parentElement;
  parent.querySelectorAll(".select-chip").forEach((btn) => btn.classList.remove("selected"));
  button.classList.add("selected");
  selectedDetails[type] = button.innerText.trim();
}

function validateAndNext(currentStep, nextStepNum, type) {
  if (!selectedDetails[type]) {
    alert("Please choose an option first! 💕");
    return;
  }
  nextStep(nextStepNum);
}

// --- DATE & TIME VALIDATION ---
function validateDateTimeAndNext() {
  const dateInput = document.getElementById("date-input").value;
  const timeInput = document.getElementById("time-input").value;

  if (!dateInput || !timeInput) {
    alert("Please select both date and time! ⏰");
    return;
  }

  selectedDetails.date = dateInput;
  selectedDetails.time = timeInput;

  document.getElementById("summary-location").innerText = selectedDetails.location;
  document.getElementById("summary-food").innerText = selectedDetails.food;
  document.getElementById("summary-date").innerText = selectedDetails.date;
  document.getElementById("summary-time").innerText = selectedDetails.time;

  nextStep(5);
}

// --- FLOATING HEARTS ANIMATION ---
function createFloatingHearts() {
  const heartBg = document.getElementById("heart-bg");
  const heartSymbols = ["❤️", "💖", "💕", "🌸", "✨", "💘", "🌹"];

  setInterval(() => {
    const heart = document.createElement("div");
    heart.classList.add("floating-heart");
    heart.innerText = heartSymbols[Math.floor(Math.random() * heartSymbols.length)];
    
    heart.style.left = Math.random() * 100 + "vw";
    heart.style.animationDuration = Math.random() * 3 + 4 + "s";
    heart.style.fontSize = Math.random() * 1.2 + 0.9 + "rem";

    heartBg.appendChild(heart);

    setTimeout(() => {
      heart.remove();
    }, 6000);
  }, 300);
}

createFloatingHearts();
