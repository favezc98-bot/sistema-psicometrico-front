document.addEventListener("DOMContentLoaded", function () {
  var indice = 0;
  var respuestas = [];
  var listaPreguntas = [];
  var listaRespuestas = [];
  var restante = 600;

  var contador = document.getElementById("contador");
  var enunciado = document.getElementById("enunciado");
  var opciones = document.getElementById("opciones");
  var instrucciones = document.getElementById("instrucciones");
  var cierre = document.getElementById("cierre");
  var tiempo = document.getElementById("tiempo");
  var cajaTiempo = document.querySelector(".banner-tiempo");
  var btnSiguiente = document.getElementById("btn-siguiente");

  // 1. Consumir el endpoint de preguntas al cargar la página
  function cargarPreguntas() {
    fetch("https://sistema-psicometrico-back-7.onrender.com/api/preguntas_vocabulario")
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
          if (enunciado) enunciado.textContent = "No hay preguntas registradas en el sistema.";
        }
      })
      .catch(function (error) {
        console.error("Error al conectar con el backend:", error);
        if (enunciado) enunciado.textContent = "Error al conectar con el servidor de preguntas.";
      });
  }

  function cargarRespuestas() {
    fetch("https://sistema-psicometrico-back-7.onrender.com/api/respuestas_vocabulario")
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
        if (enunciado) enunciado.textContent = "Error al conectar con el servidor de respuestas.";
      });
  }

  function iniciarPrueba() {
    // 5. Recuperar el tiempo y el índice si el usuario recargó la página
    var tiempoGuardado = sessionStorage.getItem("shyplay_tiempo_restante");
    if (tiempoGuardado !== null) {
      restante = parseInt(tiempoGuardado, 10);
    }

    var indiceGuardado = sessionStorage.getItem("shyplay_indice_actual");
    if (indiceGuardado !== null) {
      indice = parseInt(indiceGuardado, 10);
    }

    // Recuperar respuestas previas si existen
    var respuestasGuardadas = sessionStorage.getItem("shyplay_respuestas");
    if (respuestasGuardadas !== null) {
      try {
        respuestas = JSON.parse(respuestasGuardadas);
      } catch (e) {
        respuestas = [];
      }
    }

    pintar();
    avanzarTiempo();
  }

  // 2. Evento al dar clic en el botón Siguiente
  if (btnSiguiente) {
    btnSiguiente.addEventListener("click", function () {
      var seleccionada = opciones.querySelector("input[name=respuesta]:checked");

      if (!seleccionada) {
        alert("Por favor, selecciona una respuesta antes de continuar.");
        return;
      }

      var preguntaActual = listaPreguntas[indice];

      respuestas[indice] = {
        idPregunta: preguntaActual.idPreguntaTest,
        tipo: preguntaActual.tipoTest,
        reactivo: preguntaActual.numeroReactivo,
        enunciado: preguntaActual.pregunta,
        respuesta: seleccionada.value
      };

      // Guardar parciales en sessionStorage
      sessionStorage.setItem("shyplay_respuestas", JSON.stringify(respuestas));

      indice += 1;
      if (indice >= listaPreguntas.length) {
        finalizar();
        return;
      }

      pintar();
    });
  }

  // 3. Pintar la pregunta actual y sus opciones dinámicamente
  function pintar() {
    sessionStorage.setItem("shyplay_indice_actual", indice);

    var actual = listaPreguntas[indice];
    if (contador) contador.textContent = "Pregunta " + (indice + 1) + " de " + listaPreguntas.length;
    if (enunciado) enunciado.textContent = actual.numeroReactivo + ". " + actual.pregunta;

    var opcionesDeEstaPregunta = listaRespuestas.filter(function (resp) {
      return resp.idPreguntaTest === actual.idPreguntaTest;
    });

    if (opciones) {
      opciones.innerHTML = "";

      opcionesDeEstaPregunta.forEach(function (op) {
        var label = document.createElement("label");
        label.className = "opcion";

        var input = document.createElement("input");
        input.type = "radio";
        input.name = "respuesta";
        input.value = op.respuesta;

        if (respuestas[indice] && respuestas[indice].respuesta === op.respuesta) {
          input.checked = true;
        }

        label.appendChild(input);
        label.appendChild(document.createTextNode(" " + op.respuesta));
        opciones.appendChild(label);
      });
    }
  }

  function finalizar() {
    sessionStorage.setItem("shyplay_prueba", "completada");
    sessionStorage.setItem("shyplay_respuestas", JSON.stringify(respuestas));
    if (instrucciones) instrucciones.hidden = true;
    if (enunciado) enunciado.hidden = true;
    if (opciones) opciones.hidden = true;
    if (btnSiguiente) btnSiguiente.hidden = true;
    if (cierre) cierre.hidden = false;
    if (contador) contador.textContent = "Prueba completada";
  }

  function pintarTiempo() {
    var minutos = String(Math.floor(restante / 60)).padStart(2, "0");
    var segundos = String(restante % 60).padStart(2, "0");
    if (tiempo) tiempo.textContent = minutos + ":" + segundos;
  }

  function avanzarTiempo() {
    pintarTiempo();
    sessionStorage.setItem("shyplay_tiempo_restante", restante);

    if (restante <= 0) {
      if (cajaTiempo) cajaTiempo.classList.add("agotado");
      finalizar();
      return;
    }
    restante -= 1;
    window.setTimeout(avanzarTiempo, 1000);
  }

  // 4. Bloquear y advertir al intentar recargar con F5 o cerrar pestaña
  window.addEventListener("beforeunload", function (evento) {
    if (indice < listaPreguntas.length && sessionStorage.getItem("shyplay_prueba") !== "completada") {
      evento.preventDefault();
      evento.returnValue = "No se puede actualizar la página en ejecución del test, debe terminarlo por favor.";
      return evento.returnValue;
    }
  });

  // Arrancar el flujo
  cargarPreguntas();
});