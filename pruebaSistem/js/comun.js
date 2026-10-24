(function () {
  var CLAVE_ABSTRACCION = "shyplay_abstraccion_progreso";
  var TEXTO_PRUEBA_REALIZADA = "PRUEBA REALIZADA, DEBES ESPERAR SE TE AUTORIZACION DE PARTE DEL ADMINISTRADOR, PARA UNA NUEVA PRUEBA.";

  function claveUsuario(usuario) {
    return String(usuario || "").trim().toLowerCase();
  }

  function leerProgresos() {
    try {
      var datos = JSON.parse(localStorage.getItem(CLAVE_ABSTRACCION) || "{}");
      if (!datos || typeof datos !== "object" || Array.isArray(datos)) return {};
      return datos;
    } catch (error) {
      return {};
    }
  }

  function leerProgresoUsuario(usuario) {
    var progreso = leerProgresos()[claveUsuario(usuario)];
    return progreso && typeof progreso === "object" ? progreso : null;
  }

  function guardarProgresoUsuario(usuario, progreso) {
    var clave = claveUsuario(usuario);
    if (!clave) return;
    var mapa = leerProgresos();
    mapa[clave] = progreso;
    localStorage.setItem(CLAVE_ABSTRACCION, JSON.stringify(mapa));
  }

  function textoAspirante(sesion) {
    if (!sesion) return "";
    var nombre = String(sesion.nombre || sesion.usuario || "").trim();
    if (!nombre) return "";
    if (sesion.id !== undefined && sesion.id !== null && String(sesion.id).trim() !== "") {
      return nombre + " (ID: " + sesion.id + ")";
    }
    return nombre;
  }

  function mostrarAvisoPruebaRealizada() {
    var aviso = document.getElementById("aviso-prueba-realizada");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.id = "aviso-prueba-realizada";
      aviso.className = "aviso-flotante";
      aviso.innerHTML = ""
        + '<div class="aviso-flotante-caja" role="alertdialog" aria-modal="true" aria-labelledby="aviso-prueba-texto">'
        + '<p id="aviso-prueba-texto"></p>'
        + '<button type="button" class="boton" id="aviso-prueba-cerrar">Cerrar</button>'
        + "</div>";
      document.body.appendChild(aviso);
      document.getElementById("aviso-prueba-texto").textContent = TEXTO_PRUEBA_REALIZADA;
      document.getElementById("aviso-prueba-cerrar").addEventListener("click", function () {
        aviso.hidden = true;
      });
    }
    aviso.hidden = false;
    var boton = document.getElementById("aviso-prueba-cerrar");
    if (boton) boton.focus();
  }

  window.Shyplay = {
    claveUsuario: claveUsuario,
    leerProgresoUsuario: leerProgresoUsuario,
    guardarProgresoUsuario: guardarProgresoUsuario,
    textoAspirante: textoAspirante,
    mostrarAvisoPruebaRealizada: mostrarAvisoPruebaRealizada
  };

  var sesion = null;
  try {
    sesion = JSON.parse(sessionStorage.getItem("shyplay_sesion") || "null");
  } catch (error) {
    sesion = null;
  }

  var texto = textoAspirante(sesion);
  if (texto) {
    var nombre = document.getElementById("aspirante-nombre");
    var banner = document.getElementById("aspirante-banner");
    if (nombre) nombre.textContent = texto;
    if (banner) banner.textContent = texto;
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

  var progresoAbstraccion = sesion && sesion.usuario ? leerProgresoUsuario(sesion.usuario) : null;
  var estadoAbstraccion = document.getElementById("estado-abstraccion");
  var enlaceAbstraccion = document.getElementById("enlace-abstraccion");
  if (progresoAbstraccion && progresoAbstraccion.completada) {
    if (estadoAbstraccion) {
      estadoAbstraccion.textContent = "Completada";
      estadoAbstraccion.classList.add("estado-ok");
    }
    if (enlaceAbstraccion) {
      enlaceAbstraccion.textContent = "Realizada";
      enlaceAbstraccion.addEventListener("click", function (evento) {
        evento.preventDefault();
        mostrarAvisoPruebaRealizada();
      });
    }
  } else if (progresoAbstraccion && progresoAbstraccion.iniciado && estadoAbstraccion) {
    estadoAbstraccion.textContent = "En curso";
  }
})();
