// State variables to hold selected date data
let selectedDetails = {
  location: null,
  food: null,
  date: null,
  time: null
};

// 1. Runaway "No" Button
const noBtn = document.getElementById("btn-no");

function moveNoButton() {
  const container = document.querySelector(".card-container");
  const containerRect = container.getBoundingClientRect();
  
  // Calculate maximum offsets inside the container window
  const maxX = 120;
  const maxY = 60;
  
  const randomX = (Math.random() - 0.5) * 2 * maxX;
  const randomY = (Math.random() - 0.5) * 2 * maxY;

  noBtn.style.transform = `translate(${randomX}px, ${randomY}px)`;
}

noBtn.addEventListener("mouseover", moveNoButton);
noBtn.addEventListener("click", moveNoButton);
noBtn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  moveNoButton();
});

// 2. Step Navigator
function nextStep(stepNumber) {
  document.querySelectorAll(".step").forEach((step) => {
    step.classList.remove("active");
  });
  document.getElementById(`step-${stepNumber}`).classList.add("active");
}

// 3. Chip Selector (Location & Food)
function selectOption(button, type) {
  const parent = button.parentElement;
  parent.querySelectorAll(".select-chip").forEach((btn) => btn.classList.remove("selected"));
  button.classList.add("selected");
  selectedDetails[type] = button.innerText.trim();
}

function validateAndNext(currentStep, nextStepNum, type) {
  if (!selectedDetails[type]) {
    alert(`Please select an option before continuing! 💕`);
    return;
  }
  nextStep(nextStepNum);
}

// 4. Validate Date/Time and Finalize
function validateDateTimeAndNext() {
  const dateInput = document.getElementById("date-input").value;
  const timeInput = document.getElementById("time-input").value;

  if (!dateInput || !timeInput) {
    alert("Please choose both a date and a time! ⏰");
    return;
  }

  selectedDetails.date = dateInput;
  selectedDetails.time = timeInput;

  // Format and show on summary card
  document.getElementById("summary-location").innerText = selectedDetails.location;
  document.getElementById("summary-food").innerText = selectedDetails.food;
  document.getElementById("summary-date").innerText = selectedDetails.date;
  document.getElementById("summary-time").innerText = selectedDetails.time;

  nextStep(5);
}

// 5. Create Background Floating Hearts
function createFloatingHearts() {
  const heartBg = document.getElementById("heart-bg");
  const heartSymbols = ["❤️", "💖", "💕", "🌸", "✨", "💘"];

  setInterval(() => {
    const heart = document.createElement("div");
    heart.classList.add("floating-heart");
    heart.innerText = heartSymbols[Math.floor(Math.random() * heartSymbols.length)];
    
    heart.style.left = Math.random() * 100 + "vw";
    heart.style.animationDuration = Math.random() * 3 + 4 + "s";
    heart.style.fontSize = Math.random() * 1.2 + 0.8 + "rem";

    heartBg.appendChild(heart);

    setTimeout(() => {
      heart.remove();
    }, 7000);
  }, 350);
}

createFloatingHearts();
