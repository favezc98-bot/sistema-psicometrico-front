// Detecta automáticamente si esta en compu local o en el servidor desplegado
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8080"
  : "https://sistema-psicometrico-back-7.onrender.com";

//salir
document.addEventListener("DOMContentLoaded", function () {
  const btnSalir = document.getElementById("btn-salir");
  const modalSalida = document.getElementById("modal-salida");

  if (btnSalir) {
    btnSalir.addEventListener("click", function () {
      // Mostrar el círculo de carga
      if (modalSalida) {
        modalSalida.style.display = "flex";
      }

      // Dar un pequeño respiro visual de 800 milisegundos antes de salir
      setTimeout(function () {
        sessionStorage.clear();
        localStorage.removeItem("shyplay_sesion");
        window.location.href = "login.html";
      }, 800);
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
    // 1. Leer la sesión activa
    var sesionStr = sessionStorage.getItem("shyplay_sesion") || localStorage.getItem("shyplay_sesion");
    if (sesionStr) {
      var sesion = JSON.parse(sesionStr);
      var lblNombre = document.getElementById("aspirante-nombre");

      if (lblNombre) {
        // Muestra el correo o nombre guardado y su ID real
        var idMostrar = sesion.idCandidato || sesion.idUsuario || "";
        lblNombre.textContent = (sesion.usuario || "Aspirante") + (idMostrar ? " (ID: " + idMostrar + ")" : "");
      }
    }

    // 2. Funcionalidad del botón Salir en inicio.html
    const btnSalir = document.getElementById("btn-salir");
    const modalSalida = document.getElementById("modal-salida");

    if (btnSalir) {
      btnSalir.addEventListener("click", function () {
        if (modalSalida) modalSalida.style.display = "flex";
        setTimeout(function () {
          sessionStorage.clear();
          localStorage.removeItem("shyplay_sesion");
          window.location.href = "login.html";
        }, 800);
      });
    }
  });
