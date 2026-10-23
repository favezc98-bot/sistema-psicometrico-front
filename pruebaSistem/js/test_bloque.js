document.addEventListener("DOMContentLoaded", function () {
  var indice = 0;
  var respuestas = [];
  var listaPreguntasAgrupadas = [];
  var listaRespuestas = [];

  var contador = document.getElementById("contador");
  var contenedorPregunta = document.getElementById("contenedor-pregunta");
  var opciones = document.getElementById("opciones");
  var instrucciones = document.getElementById("instrucciones");
  var cierre = document.getElementById("cierre");
  var btnSiguiente = document.getElementById("btn-siguiente");

  var letrasOpciones = { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E", "6": "F" };

  function cargarPreguntas() {
    var baseUrl = "http://localhost:8080";

    fetch(`${baseUrl}/api/preguntas_bloque`)
      .then(function (respuesta) {
        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar las preguntas del servidor.");
        }
        return respuesta.json();
      })
      .then(function (data) {
        var mapaAgrupado = {};
        data.forEach(function (item) {
          var key = item.numeroReactivo;
          if (!mapaAgrupado[key]) {
            mapaAgrupado[key] = {
              numeroReactivo: key,
              tipoTest: item.tipoTest,
              subitems: []
            };
          }
          mapaAgrupado[key].subitems.push(item);
        });

        listaPreguntasAgrupadas = Object.keys(mapaAgrupado).map(function (k) {
          return mapaAgrupado[k];
        });

        if (listaPreguntasAgrupadas.length > 0) {
          cargarRespuestas();
        } else {
          if (contenedorPregunta) contenedorPregunta.innerHTML = "<p>No hay preguntas de Bloques registradas.</p>";
        }
      })
      .catch(function (error) {
        console.error("Error al conectar con el backend:", error);
        if (contenedorPregunta) contenedorPregunta.innerHTML = "<p>Error al conectar con el servidor de preguntas.</p>";
      });
  }

  function cargarRespuestas() {
    var baseUrl = "http://localhost:8080";

    fetch(`${baseUrl}/api/respuestas_bloque`)
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
        if (contenedorPregunta) contenedorPregunta.innerHTML = "<p>Error al conectar con el servidor de respuestas.</p>";
      });
  }

  function iniciarPrueba() {
      var indiceGuardado = sessionStorage.getItem("shyplay_bloques_indice");
      if (indiceGuardado !== null) {
        indice = parseInt(indiceGuardado, 10);
      }

      var respuestasGuardadas = sessionStorage.getItem("shyplay_bloques_respuestas");
      if (respuestasGuardadas !== null) {
        try {
          respuestas = JSON.parse(respuestasGuardadas);
        } catch (e) {
          respuestas = [];
        }
      }

      pintar();
    }

  if (btnSiguiente) {
      btnSiguiente.addEventListener("click", function () {
        var grupoActual = listaPreguntasAgrupadas[indice];
        var respuestasDelGrupo = [];

        // Las primeras 4 preguntas (índices 0 al 3) son simples; a partir del índice 4 son dobles (5 a 7)
        var esDoble = indice >= 4;

        if (esDoble) {
          var sel1 = opciones.querySelector("input[name='bloque_doble_" + grupoActual.numeroReactivo + "_parte_0']:checked");
          var sel2 = opciones.querySelector("input[name='bloque_doble_" + grupoActual.numeroReactivo + "_parte_1']:checked");

          if (!sel1 || !sel2) {
            alert("Por favor, selecciona una respuesta para cada cuadro gris antes de continuar.");
            return;
          }

          respuestasDelGrupo.push({
            idPregunta: grupoActual.subitems[0].idPreguntaTest,
            tipo: grupoActual.subitems[0].tipoTest,
            reactivo: grupoActual.numeroReactivo,
            respuesta: sel1.value
          });
          respuestasDelGrupo.push({
            idPregunta: grupoActual.subitems[0].idPreguntaTest,
            tipo: grupoActual.subitems[0].tipoTest,
            reactivo: grupoActual.numeroReactivo,
            respuesta: sel2.value
          });
        } else {
          // Preguntas normales (1 a 4): Una sola selección
          var subitem = grupoActual.subitems[0];
          var seleccionada = opciones.querySelector("input[name='radio_simple_" + subitem.idPreguntaTest + "']:checked");

          if (!seleccionada) {
            alert("Por favor, selecciona una respuesta antes de continuar.");
            return;
          }

          respuestasDelGrupo.push({
            idPregunta: subitem.idPreguntaTest,
            tipo: subitem.tipoTest,
            reactivo: grupoActual.numeroReactivo,
            respuesta: seleccionada.value
          });
        }

        respuestas[indice] = respuestasDelGrupo;
        sessionStorage.setItem("shyplay_bloques_respuestas", JSON.stringify(respuestas));

        indice += 1;
        if (indice >= listaPreguntasAgrupadas.length) {
          finalizar();
          return;
        }

        pintar();
      });
    }

    function pintar() {
      sessionStorage.setItem("shyplay_bloques_indice", indice);

      var grupoActual = listaPreguntasAgrupadas[indice];
      if (contador) contador.textContent = "Pregunta " + (indice + 1) + " de " + listaPreguntasAgrupadas.length;

      var principalSubitem = grupoActual.subitems[0];
      if (contenedorPregunta) {
        contenedorPregunta.innerHTML = `
          <img class="imagen-patron-bloque"
               src="data:image/png;base64,${principalSubitem.pregunta}"
               alt="Patrón Reactivo ${grupoActual.numeroReactivo}">
        `;
      }

      if (opciones) {
        opciones.innerHTML = "";
        opciones.style.display = "flex";
        opciones.style.flexDirection = "column";
        opciones.style.alignItems = "center";
        opciones.style.gap = "20px";

        var esDoble = indice >= 4;

        var todasLasOpc = listaRespuestas.filter(function (resp) {
          return resp.idPreguntaTest === principalSubitem.idPreguntaTest;
        });

        if (esDoble) {
          // --- PREGUNTAS DOBLES (5 a 7): Dos cuadros separados ---
          var mitad = Math.ceil(todasLasOpc.length / 2);
          var opcionesArriba = todasLasOpc.slice(0, mitad);
          var opcionesAbajo = todasLasOpc.slice(mitad);

          var bloquesDatos = [
            { titulo: "Primer cuadro gris (Izquierda)", opciones: opcionesArriba, parte: 0 },
            { titulo: "Segundo cuadro gris (Derecha)", opciones: opcionesAbajo, parte: 1 }
          ];

          bloquesDatos.forEach(function (bloque) {
            var tarjetaSub = document.createElement("div");
            tarjetaSub.className = "bloque-subseccion";

            var tituloSub = document.createElement("div");
            tituloSub.className = "bloque-subseccion-titulo";
            tituloSub.textContent = bloque.titulo;
            tarjetaSub.appendChild(tituloSub);

            var filaOpciones = document.createElement("div");
            filaOpciones.className = "opciones-grid-bloques";

            bloque.opciones.forEach(function (op) {
              var label = document.createElement("label");
              label.className = "tarjeta-opcion-bloque";

              var input = document.createElement("input");
              input.type = "radio";
              input.name = "bloque_doble_" + grupoActual.numeroReactivo + "_parte_" + bloque.parte;
              input.value = op.opcion;

              if (respuestas[indice] && respuestas[indice][bloque.parte] && respuestas[indice][bloque.parte].respuesta === op.opcion) {
                input.checked = true;
              }

              var letraSpan = document.createElement("span");
              letraSpan.className = "letra-opcion";
              letraSpan.textContent = letrasOpciones[op.opcion] || op.opcion;

              label.appendChild(input);
              label.appendChild(letraSpan);

              if (op.respuesta && op.respuesta.length > 20) {
                var imgRespuesta = document.createElement("img");
                imgRespuesta.src = "data:image/png;base64," + op.respuesta;
                label.appendChild(imgRespuesta);
              }

              filaOpciones.appendChild(label);
            });

            tarjetaSub.appendChild(filaOpciones);
            opciones.appendChild(tarjetaSub);
          });

        } else {
          // --- PREGUNTAS NORMALES (1 a 4): Una sola tarjeta limpia con sus opciones completas ---
          var tarjetaNorm = document.createElement("div");
          tarjetaNorm.className = "bloque-subseccion";
          var filaNorm = document.createElement("div");
          filaNorm.className = "opciones-grid-bloques";

          todasLasOpc.forEach(function (op) {
            var label = document.createElement("label");
            label.className = "tarjeta-opcion-bloque";

            var input = document.createElement("input");
            input.type = "radio";
            input.name = "radio_simple_" + principalSubitem.idPreguntaTest;
            input.value = op.opcion;

            if (respuestas[indice] && respuestas[indice][0] && respuestas[indice][0].respuesta === op.opcion) {
              input.checked = true;
            }

            var letraSpan = document.createElement("span");
            letraSpan.className = "letra-opcion";
            letraSpan.textContent = letrasOpciones[op.opcion] || op.opcion;

            label.appendChild(input);
            label.appendChild(letraSpan);

            if (op.respuesta && op.respuesta.length > 20) {
              var imgRespuesta = document.createElement("img");
              imgRespuesta.src = "data:image/png;base64," + op.respuesta;
              label.appendChild(imgRespuesta);
            }

            filaNorm.appendChild(label);
          });

          tarjetaNorm.appendChild(filaNorm);
          opciones.appendChild(tarjetaNorm);
        }
      }
    }

  function finalizar() {
    sessionStorage.setItem("shyplay_bloques_prueba", "completada");
    sessionStorage.setItem("shyplay_bloques_respuestas", JSON.stringify(respuestas));
    if (instrucciones) instrucciones.hidden = true;
    if (contenedorPregunta) contenedorPregunta.hidden = true;
    if (opciones) opciones.hidden = true;
    if (btnSiguiente) btnSiguiente.hidden = true;
    if (cierre) cierre.hidden = false;
    if (contador) contador.textContent = "Prueba completada";
  }

  window.addEventListener("beforeunload", function (evento) {
    if (indice < listaPreguntasAgrupadas.length && sessionStorage.getItem("shyplay_bloques_prueba") !== "completada") {
      evento.preventDefault();
      evento.returnValue = "No se puede actualizar la página en ejecución del test, debe terminarlo por favor.";
      return evento.returnValue;
    }
  });

  cargarPreguntas();
});