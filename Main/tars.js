// Particle background
const canvas = document.getElementById("particleCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const particles = [];
const numParticles = 400;
const mouse = { x: null, y: null, radius: 150 };
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

for (let i = 0; i < numParticles; i++) {
  const rand = Math.random();
  let color = rand > 0.5 ? "white" : "#1fcfeb";
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 2 + 1,
    dx: (Math.random() - 0.5) * 0.5,
    dy: (Math.random() - 0.5) * 0.5,
    color: color,
    originalColor: color
  });
}

function drawLine(p) {
  const distance = Math.hypot(mouse.x - p.x, mouse.y - p.y);
  if (distance < mouse.radius) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(mouse.x, mouse.y);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

function updateParticleColors() {
  const isLight = document.body.classList.contains("light-mode");
  for (const p of particles) {
    p.color = isLight ? "black" : p.originalColor;
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    drawLine(p);
    p.x += p.dx;
    p.y += p.dy;
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
  }
  requestAnimationFrame(animate);
}

animate();

function toggleTheme() {
  document.body.classList.toggle("light-mode");
  updateParticleColors();
}

async function sendMessage() {
  const input = document.getElementById("user-input").value.trim();
  const responseBox = document.getElementById("response");
  if (!input) return;

  const sarcasm = document.getElementById("sarcasm")?.value || 50;
  const humor = document.getElementById("humor")?.value || 50;
  const serious = document.getElementById("serious")?.value || 50;

  responseBox.innerHTML = "<span class='text-gray-500'>🔄 Thinking...</span>";

  try {
    const res = await fetch("http://127.0.0.1:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input, sarcasm, humor, serious })
    });

    const data = await res.json();
    if (data.response) {
      responseBox.textContent = data.response;
      playVoice(data.response);
    } else {
      responseBox.textContent = "❌ Error contacting TARS";
    }
  } catch (err) {
    responseBox.textContent = "❌ Error contacting TARS";
    console.error(err);
  }
}

async function playVoice(text) {
  try {
    const res = await fetch("http://127.0.0.1:5000/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  } catch (err) {
    console.error("Voice error:", err);
  }
}

function startVoiceInput() {
  try {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      document.getElementById("user-input").value = text;
      sendMessage();
    };

    recognition.onerror = () => {
      document.getElementById("response").textContent = "❌ Voice recognition failed.";
    };
  } catch (err) {
    alert("🎤 Microphone access is not supported or denied.");
  }
}
