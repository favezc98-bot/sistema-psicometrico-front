(function () {
  var sesion = null;
  try {
    sesion = JSON.parse(sessionStorage.getItem("shyplay_sesion") || "null");
  } catch (error) {
    sesion = null;
  }

  var nombre = document.getElementById("aspirante-nombre");
  if (nombre && sesion && sesion.usuario) {
    nombre.textContent = sesion.usuario + " (ID: " + (sesion.id || "12345") + ")";
  }

  var pruebaLista = sessionStorage.getItem("shyplay_prueba") === "completada";
  var estado = document.getElementById("estado-personalidad");
  if (estado && pruebaLista) {
    estado.textContent = "Completada";
    estado.classList.add("estado-ok");
  }

  var enlace = document.getElementById("enlace-prueba");
  if (enlace && pruebaLista) {
    enlace.textContent = "Revisar";
  }

  var nota = document.getElementById("nota-prueba-activa");
  var botonInicio = document.getElementById("boton-prueba-inicio");
  if (nota && pruebaLista) {
    nota.textContent = "Completaste el Test de Personalidad (SHYPLAY).";
  }
  if (botonInicio && pruebaLista) {
    botonInicio.textContent = "Revisar prueba";
  }

  var resumenEstado = document.getElementById("resumen-pruebas");
  if (resumenEstado) {
    resumenEstado.textContent = pruebaLista ? "Lista" : "En curso";
  }

  var resumenResultados = document.getElementById("resumen-resultados");
  if (resumenResultados && pruebaLista) {
    resumenResultados.textContent = "1";
  }

  var vacio = document.getElementById("resultados-vacio");
  var pendiente = document.getElementById("resultados-pendiente");
  if (vacio && pendiente) {
    vacio.hidden = pruebaLista;
    pendiente.hidden = !pruebaLista;
  }
})();
