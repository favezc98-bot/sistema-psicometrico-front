// Detecta automáticamente si esta en compu local o en el servidor desplegado
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8080"
  : "https://sistema-psicometrico-back-7.onrender.com";