(function () {
  var entradas = performance.getEntriesByType ? performance.getEntriesByType("navigation") : [];
  var recarga = entradas.length ? entradas[0].type === "reload" : (performance.navigation && performance.navigation.type === 1);
  if (recarga) {
    sessionStorage.removeItem("shyplay_sesion");
    window.location.replace("login.html");
    return;
  }
  if (!sessionStorage.getItem("shyplay_sesion")) {
    window.location.replace("login.html");
    return;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var indice = 0;
    var respuestas = [];
    var listaPreguntas = [];
    var listaRespuestas = [];
    var restante = 600;
    var temporizador = null;
    var cerrada = false;
    var tiempoIniciado = false;

    var contador = document.getElementById("contador");
    var enunciadoSerie = document.getElementById("enunciado-serie");
    var inputRespuesta = document.getElementById("input-respuesta");
    var contenedorReactivo = document.querySelector(".contenedor-reactivo-inline");
    var instrucciones = document.getElementById("instrucciones");
    var cierre = document.getElementById("cierre");
    var tiempo = document.getElementById("tiempo");
    var cajaTiempo = document.querySelector(".banner-tiempo");
    var btnSiguiente = document.getElementById("btn-siguiente");
    if (btnSiguiente) btnSiguiente.disabled = true;

    function sesionActual() {
      try {
        return JSON.parse(sessionStorage.getItem("shyplay_sesion") || "null");
      } catch (error) {
        return null;
      }
    }

    function guardarEstado() {
      if (cerrada || !window.Shyplay) return;
      var sesion = sesionActual();
      if (!sesion || !sesion.usuario || listaPreguntas.length === 0) return;
      var previo = window.Shyplay.leerProgresoUsuario(sesion.usuario);
      if (previo && previo.completada) return;
      window.Shyplay.guardarProgresoUsuario(sesion.usuario, {
        usuario: sesion.usuario,
        indice: indice,
        restante: restante,
        respuestas: respuestas,
        completada: false,
        iniciado: true
      });
    }

    function mostrarCierre(mensaje) {
      if (instrucciones) instrucciones.hidden = true;
      if (contenedorReactivo) contenedorReactivo.hidden = true;
      if (btnSiguiente) btnSiguiente.hidden = true;
      if (inputRespuesta) inputRespuesta.disabled = true;
      if (cierre) {
        cierre.hidden = false;
        var detalle = cierre.querySelector("p");
        if (detalle && mensaje) detalle.textContent = mensaje;
      }
      if (contador) contador.textContent = "Prueba finalizada";
    }

    function finalizar(motivo) {
      if (cerrada) return;
      cerrada = true;
      if (temporizador) {
        window.clearTimeout(temporizador);
        temporizador = null;
      }
      if (motivo === "tiempo") restante = 0;
      pintarTiempo();
      if (restante <= 0 && cajaTiempo) cajaTiempo.classList.add("agotado");

      var sesion = sesionActual();
      if (sesion && sesion.usuario && window.Shyplay) {
        window.Shyplay.guardarProgresoUsuario(sesion.usuario, {
          usuario: sesion.usuario,
          indice: indice,
          restante: restante,
          respuestas: respuestas,
          completada: true,
          iniciado: true
        });
      }

      var total = listaPreguntas.length || indice;
      var mensaje = motivo === "tiempo"
        ? "Se agotó el tiempo. La prueba ha finalizado."
        : "Respondiste las " + total + " preguntas de Abstraccion.";
      mostrarCierre(mensaje);
    }

    function cargarPreguntas() {
      fetch("http://localhost:8080/api/preguntas_abstraccion")
        .then(function (respuesta) {
          if (!respuesta.ok) {
            throw new Error("No se pudieron cargar las preguntas del servidor.");
          }
          return respuesta.json();
        })
        .then(function (data) {
          listaPreguntas = Array.isArray(data) ? data : [];
          if (listaPreguntas.length > 0) {
            cargarRespuestas();
          } else if (enunciadoSerie) {
            enunciadoSerie.textContent = "No hay preguntas de abstracción registradas.";
          }
        })
        .catch(function (error) {
          console.error("Error al conectar con el backend de preguntas:", error);
          if (enunciadoSerie) enunciadoSerie.textContent = "Error al conectar con el servidor de preguntas.";
          if (tiempo) tiempo.textContent = "--:--";
        });
    }

    function cargarRespuestas() {
      fetch("http://localhost:8080/api/respuestas_abstraccion")
        .then(function (respuesta) {
          if (!respuesta.ok) {
            throw new Error("No se pudieron cargar las respuestas del servidor.");
          }
          return respuesta.json();
        })
        .then(function (data) {
          listaRespuestas = Array.isArray(data) ? data : [];
          iniciarPrueba();
        })
        .catch(function (error) {
          console.error("Error al conectar con el backend de respuestas:", error);
          if (enunciadoSerie) enunciadoSerie.textContent = "Error al conectar con el servidor de respuestas.";
          if (tiempo) tiempo.textContent = "--:--";
        });
    }

    function recuperarProgreso() {
      var sesion = sesionActual();
      if (!sesion || !sesion.usuario || !window.Shyplay) return null;
      var progreso = window.Shyplay.leerProgresoUsuario(sesion.usuario);
      if (progreso) return progreso;

      var indiceGuardado = sessionStorage.getItem("shyplay_abstraccion_indice_actual");
      var tiempoGuardado = sessionStorage.getItem("shyplay_abstraccion_tiempo_restante");
      if (indiceGuardado === null && tiempoGuardado === null) return null;

      var respuestasGuardadas = [];
      try {
        respuestasGuardadas = JSON.parse(sessionStorage.getItem("shyplay_abstraccion_respuestas") || "[]");
      } catch (error) {
        respuestasGuardadas = [];
      }

      return {
        indice: indiceGuardado === null ? 0 : parseInt(indiceGuardado, 10),
        restante: tiempoGuardado === null ? 600 : parseInt(tiempoGuardado, 10),
        respuestas: respuestasGuardadas,
        completada: sessionStorage.getItem("shyplay_abstraccion_prueba") === "completada",
        iniciado: true
      };
    }

    function iniciarPrueba() {
      if (cerrada || tiempoIniciado) return;

      var progreso = recuperarProgreso();
      if (progreso) {
        if (typeof progreso.indice === "number" && !isNaN(progreso.indice)) indice = progreso.indice;
        if (typeof progreso.restante === "number" && !isNaN(progreso.restante)) restante = progreso.restante;
        if (Array.isArray(progreso.respuestas)) respuestas = progreso.respuestas;
        if (progreso.completada || indice >= listaPreguntas.length) {
          finalizar(restante <= 0 ? "tiempo" : "preguntas");
          return;
        }
        if (restante <= 0) {
          finalizar("tiempo");
          return;
        }
      }

      pintar();
      tiempoIniciado = true;
      avanzarTiempo();
    }

    if (btnSiguiente) {
      btnSiguiente.addEventListener("click", function () {
        if (cerrada || !tiempoIniciado) return;

        var textoIngresado = inputRespuesta ? inputRespuesta.value.trim() : "";
        if (textoIngresado === "") {
          alert("Por favor, escribe tu respuesta antes de continuar.");
          if (inputRespuesta) inputRespuesta.focus();
          return;
        }

        var preguntaActual = listaPreguntas[indice];
        respuestas[indice] = {
          idPregunta: preguntaActual.idPreguntaTest,
          tipo: preguntaActual.tipoTest,
          reactivo: preguntaActual.numeroReactivo,
          enunciado: preguntaActual.pregunta,
          respuestaAspirante: textoIngresado
        };

        indice += 1;
        if (indice >= listaPreguntas.length) {
          finalizar("preguntas");
          return;
        }

        pintar();
        guardarEstado();
      });
    }

    if (inputRespuesta) {
      inputRespuesta.addEventListener("keypress", function (evento) {
        if (evento.key === "Enter") {
          evento.preventDefault();
          if (btnSiguiente) btnSiguiente.click();
        }
      });
    }

    function pintar() {
      var actual = listaPreguntas[indice];
      if (!actual) return;
      if (contador) contador.textContent = "Pregunta " + (indice + 1) + " de " + listaPreguntas.length;
      if (enunciadoSerie) enunciadoSerie.textContent = actual.numeroReactivo + ". " + actual.pregunta;
      if (btnSiguiente) {
        btnSiguiente.hidden = false;
        btnSiguiente.disabled = false;
        btnSiguiente.textContent = indice === listaPreguntas.length - 1 ? "Finalizar" : "Siguiente";
      }
      if (inputRespuesta) {
        inputRespuesta.disabled = false;
        if (respuestas[indice] && respuestas[indice].respuestaAspirante) {
          inputRespuesta.value = respuestas[indice].respuestaAspirante;
        } else {
          inputRespuesta.value = "";
        }
        inputRespuesta.focus();
      }
    }

    function pintarTiempo() {
      var seguro = restante > 0 ? restante : 0;
      var minutos = String(Math.floor(seguro / 60)).padStart(2, "0");
      var segundos = String(seguro % 60).padStart(2, "0");
      if (tiempo) tiempo.textContent = minutos + ":" + segundos;
    }

    function avanzarTiempo() {
      if (cerrada || !tiempoIniciado) return;
      pintarTiempo();
      guardarEstado();
      if (restante <= 0) {
        finalizar("tiempo");
        return;
      }
      temporizador = window.setTimeout(function () {
        if (cerrada) return;
        restante -= 1;
        avanzarTiempo();
      }, 1000);
    }

    window.addEventListener("pagehide", guardarEstado);
    window.addEventListener("offline", guardarEstado);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") guardarEstado();
    });

    var sesion = sesionActual();
    var progresoPrevio = sesion && window.Shyplay ? window.Shyplay.leerProgresoUsuario(sesion.usuario) : null;
    if (progresoPrevio && progresoPrevio.completada) {
      if (typeof progresoPrevio.restante === "number") restante = progresoPrevio.restante;
      pintarTiempo();
      if (restante <= 0 && cajaTiempo) cajaTiempo.classList.add("agotado");
      mostrarCierre("Esta prueba ya fue realizada.");
      cerrada = true;
      window.Shyplay.mostrarAvisoPruebaRealizada();
      return;
    }

    cargarPreguntas();
  });
})();
