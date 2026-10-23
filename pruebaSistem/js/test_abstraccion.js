document.addEventListener("DOMContentLoaded", function () {
  var indice = 0;
  var respuestas = [];
  var listaPreguntas = [];
  var listaRespuestas = [];

  var contador = document.getElementById("contador");
  var enunciadoSerie = document.getElementById("enunciado-serie"); // Texto de la serie
  var inputRespuesta = document.getElementById("input-respuesta"); // Input inline
  var contenedorReactivo = document.querySelector(".contenedor-reactivo-inline"); // Contenedor general
  var instrucciones = document.getElementById("instrucciones");
  var cierre = document.getElementById("cierre");
  var btnSiguiente = document.getElementById("btn-siguiente");

  // 1. Consumir endpoint de preguntas de abstracción
  function cargarPreguntas() {
    fetch("https://sistema-psicometrico-back-7.onrender.com/api/preguntas_abstraccion")
      .then(function (respuesta) {
        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar las preguntas del servidor.");
        }
        return respuesta.json();
      })
      .then(function (data) {
        listaPreguntas = data;
        if (listaPreguntas.length > 0) {
          cargarRespuestas();
        } else {
          if (enunciadoSerie) enunciadoSerie.textContent = "No hay preguntas de abstracción registradas.";
        }
      })
      .catch(function (error) {
        console.error("Error al conectar con el backend de preguntas:", error);
        if (enunciadoSerie) enunciadoSerie.textContent = "Error al conectar con el servidor de preguntas.";
      });
  }

  // 2. Consumir endpoint de respuestas de abstracción
  function cargarRespuestas() {
    fetch("https://sistema-psicometrico-back-7.onrender.com/api/respuestas_abstraccion")
      .then(function (respuesta) {
        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar las respuestas del servidor.");
        }
        return respuesta.json();
      })
      .then(function (data) {
        listaRespuestas = data;
        iniciarPrueba();
      })
      .catch(function (error) {
        console.error("Error al conectar con el backend de respuestas:", error);
        if (enunciadoSerie) enunciadoSerie.textContent = "Error al conectar con el servidor de respuestas.";
      });
  }

  function iniciarPrueba() {
    // Recuperar índice y respuestas de sessionStorage (Ya sin tiempo local)
    var indiceGuardado = sessionStorage.getItem("shyplay_abstraccion_indice_actual");
    if (indiceGuardado !== null) {
      indice = parseInt(indiceGuardado, 10);
    }

    var respuestasGuardadas = sessionStorage.getItem("shyplay_abstraccion_respuestas");
    if (respuestasGuardadas !== null) {
      try {
        respuestas = JSON.parse(respuestasGuardadas);
      } catch (e) {
        respuestas = [];
      }
    }

    pintar();
    // (Se eliminó avanzarTiempo de aquí)
  }

  // 3. Avance mediante el botón Siguiente
  if (btnSiguiente) {
    btnSiguiente.addEventListener("click", function () {
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

      // Guardar avance en sessionStorage
      sessionStorage.setItem("shyplay_abstraccion_respuestas", JSON.stringify(respuestas));

      indice += 1;
      if (indice >= listaPreguntas.length) {
        finalizar();
        return;
      }

      pintar();
    });
  }

  // Permitir avanzar presionando "Enter"
  if (inputRespuesta) {
    inputRespuesta.addEventListener("keypress", function (evento) {
      if (evento.key === "Enter") {
        evento.preventDefault();
        if (btnSiguiente) btnSiguiente.click();
      }
    });
  }

  // 4. Inyectar la serie y gestionar la caja de entrada inline
  function pintar() {
    sessionStorage.setItem("shyplay_abstraccion_indice_actual", indice);

    var actual = listaPreguntas[indice];
    if (contador) contador.textContent = "Pregunta " + (indice + 1) + " de " + listaPreguntas.length;

    // Inyectamos limpiamente la serie (ej: "1. grande pequeño alto bajo frio")
    if (enunciadoSerie) enunciadoSerie.textContent = actual.numeroReactivo + ". " + actual.pregunta;

    // Restaurar o limpiar la caja de respuesta
    if (inputRespuesta) {
      if (respuestas[indice] && respuestas[indice].respuestaAspirante) {
        inputRespuesta.value = respuestas[indice].respuestaAspirante;
      } else {
        inputRespuesta.value = "";
      }
      inputRespuesta.focus(); // Dar foco automático al campo de texto
    }
  }

  function finalizar() {
    sessionStorage.setItem("shyplay_abstraccion_prueba", "completada");
    sessionStorage.setItem("shyplay_abstraccion_respuestas", JSON.stringify(respuestas));

    if (instrucciones) instrucciones.hidden = true;
    if (contenedorReactivo) contenedorReactivo.hidden = true; // Ocultar bloque serie + input
    if (btnSiguiente) btnSiguiente.hidden = true;
    if (cierre) cierre.hidden = false;
    if (contador) contador.textContent = "Prueba completada";
  }

  // (Funciones pintarTiempo y avanzarTiempo eliminadas por completo)

  // 5. Protección ante refrescos o recargas accidentales
  window.addEventListener("beforeunload", function (evento) {
    if (indice < listaPreguntas.length && sessionStorage.getItem("shyplay_abstraccion_prueba") !== "completada") {
      evento.preventDefault();
      evento.returnValue = "No se puede actualizar la página en ejecución del test, debe terminarlo por favor.";
      return evento.returnValue;
    }
  });

  // Arrancar carga inicial
  cargarPreguntas();
});