(function () {
  var sesion = null;
  try {
    sesion = JSON.parse(sessionStorage.getItem("shyplay_sesion") || "null");
  } catch (error) {
    sesion = null;
  }

  // Si no hay sesión activa en ninguna página protegida, mandarlo al login
  if (!sesion && window.location.pathname.indexOf("index.html") === -1 && window.location.pathname !== "/") {
    window.location.href = "index.html";
    return;
  }

  // Mostrar el nombre e ID real del usuario que viene de la BD
  var nombre = document.getElementById("aspirante-nombre");
  if (nombre && sesion) {
    nombre.textContent = (sesion.usuario || "Usuario") + " (ID: " + (sesion.idUsuario || "S/N") + ")";
  }

  // Ocultar menús si es Candidato / Usuario (idRol === 2)
  if (sesion && sesion.idRol === 2) {
    var menuRegistro = document.getElementById("menu-registro");
    var menuPruebas = document.getElementById("menu-pruebas");
    var menuResultados = document.getElementById("menu-resultados");

    if (menuRegistro) menuRegistro.style.display = "none";
    if (menuPruebas) menuPruebas.style.display = "none";
    if (menuResultados) menuResultados.style.display = "none";
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
    nota.textContent = "Completaste el Test Psicométrico.";
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