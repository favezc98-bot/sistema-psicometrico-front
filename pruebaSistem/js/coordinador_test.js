document.addEventListener("DOMContentLoaded", function () {
  var indiceGlobal = 0;
  var listaPreguntasGlobal = [];
  var respuestasGlobales = {};

  // Elementos principales del DOM unificado
  var secVocabulario = document.getElementById("seccion-vocabulario");
  var secAbstraccion = document.getElementById("seccion-abstraccion");
  var secBloques = document.getElementById("seccion-bloques");

  var btnSiguiente = document.getElementById("btn-siguiente");
  var cierre = document.getElementById("cierre");
  var instrucciones = document.getElementById("instrucciones");
  var contadorGlobal = document.getElementById("aspirante-nombre");

  // Leer la combinación AB o BC (forzando mayúsculas para evitar errores)
  var combinacionActiva = (sessionStorage.getItem("shyplay_bateria_combinacion") || "BC").trim().toUpperCase();
  console.log("-> Combinación activa detectada en sessionStorage:", combinacionActiva);

  function inicializarBateria() {
    if (combinacionActiva === "AB") {
      Promise.all([
        fetch("https://sistema-psicometrico-back-7.onrender.com/api/preguntas_vocabulario").then(r => r.json()),
        fetch("https://sistema-psicometrico-back-7.onrender.com/api/respuestas_vocabulario").then(r => r.json()),
        fetch("https://sistema-psicometrico-back-7.onrender.com/api/preguntas_abstraccion").then(r => r.json()),
        fetch("https://sistema-psicometrico-back-7.onrender.com/api/respuestas_abstraccion").then(r => r.json())
      ]).then(([pregVoc, respVoc, pregAbs, respAbs]) => {
        formatarYArrancar([
          ...pregVoc.map(p => ({ ...p, modulo: 'VOCABULARIO', respuestasAsociadas: respVoc.filter(r => r.idPreguntaTest === p.idPreguntaTest) })),
          ...pregAbs.map(p => ({ ...p, modulo: 'ABSTRACCION' }))
        ]);
      }).catch(err => console.error("Error cargando batería A+B:", err));

    } else if (combinacionActiva === "BC") {
      Promise.all([
        fetch("https://sistema-psicometrico-back-7.onrender.com/api/preguntas_abstraccion").then(r => r.json()),
        fetch("https://sistema-psicometrico-back-7.onrender.com/api/preguntas_bloque").then(r => r.json()),
        fetch("https://sistema-psicometrico-back-7.onrender.com/api/respuestas_bloque").then(r => r.json())
      ]).then(([pregAbs, pregBloq, respBloq]) => {

        var bloquesProcesados = pregBloq.map(p => {
          var respuestas = respBloq.filter(r => r.idPreguntaTest === p.idPreguntaTest);
          return {
            ...p,
            modulo: 'BLOQUE',
            subitems: [p],
            respuestasAsociadas: respuestas
          };
        });

        formatarYArrancar([
          ...pregAbs.map(p => ({ ...p, modulo: 'ABSTRACCION' })),
          ...bloquesProcesados
        ]);
      }).catch(err => {
        console.error("DETALLE DEL FALLO EN B+C:", err);
      });
    }
  }

  function formatarYArrancar(preguntasUnificadas) {
    listaPreguntasGlobal = preguntasUnificadas;
    indiceGlobal = 0;
    pintarPreguntaActual();
  }

  function pintarPreguntaActual() {
    if (indiceGlobal >= listaPreguntasGlobal.length) {
      finalizarBateria();
      return;
    }

    sessionStorage.setItem("shyplay_bateria_indice", indiceGlobal);
    var itemActual = listaPreguntasGlobal[indiceGlobal];

    if (secVocabulario) secVocabulario.style.display = "none";
    if (secAbstraccion) secAbstraccion.style.display = "none";
    if (secBloques) secBloques.style.display = "none";

    if (itemActual.modulo === 'VOCABULARIO') {
      secVocabulario.style.display = "block";
      renderVocabulario(itemActual);
    } else if (itemActual.modulo === 'ABSTRACCION') {
      secAbstraccion.style.display = "block";
      renderAbstraccion(itemActual);
    } else if (itemActual.modulo === 'BLOQUE') {
      secBloques.style.display = "block";
      renderBloque(itemActual);
    }
  }

  // --- RENDERIZADORES ESPECÍFICOS PARA CADA MÓDULO ---

  function renderVocabulario(item) {
    var enunciado = document.getElementById("enunciado");
    var opciones = document.getElementById("opciones");

    if (enunciado) enunciado.textContent = (indiceGlobal + 1) + ". " + item.pregunta;
    if (opciones) {
      opciones.innerHTML = "";
      item.respuestasAsociadas.forEach(op => {
        var label = document.createElement("label");
        label.className = "opcion";
        label.innerHTML = `<input type="radio" name="resp_vocabulario" value="${op.respuesta}"> ${op.respuesta}`;
        opciones.appendChild(label);
      });
    }
  }

  function renderAbstraccion(item) {
    var enunciadoSerie = document.getElementById("enunciado-serie");
    var inputRespuesta = document.getElementById("input-respuesta");

    if (enunciadoSerie) enunciadoSerie.textContent = (indiceGlobal + 1) + ". " + item.pregunta;
    if (inputRespuesta) {
      inputRespuesta.value = "";
      inputRespuesta.focus();
    }
  }

  function renderBloque(item) {
    var contenedorPregunta = document.getElementById("contenedor-pregunta");
    var opcionesBloques = document.getElementById("opciones-bloques") || document.getElementById("opciones");

    var principalSubitem = item.subitems[0];
    if (contenedorPregunta) {
      contenedorPregunta.innerHTML = `
        <img class="imagen-patron-bloque"
             src="data:image/png;base64,${principalSubitem.pregunta}"
             alt="Patrón Reactivo ${item.numeroReactivo}">
      `;
    }

    if (opcionesBloques) {
      opcionesBloques.innerHTML = "";
      opcionesBloques.style.display = "flex";
      opcionesBloques.style.flexDirection = "column";
      opcionesBloques.style.alignItems = "center";
      opcionesBloques.style.gap = "20px";

      var todasLasOpc = item.respuestasAsociadas || [];
      var esDoble = item.numeroReactivo >= 70 || todasLasOpc.length >= 8;
      var letrasOpciones = { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E", "6": "F" };

      console.log(`Reactivo ${item.numeroReactivo} - ¿Es Doble?:`, esDoble, "Total opciones:", todasLasOpc.length);

      if (esDoble) {
        var mitad = Math.ceil(todasLasOpc.length / 2);
        var opcionesArriba = todasLasOpc.slice(0, mitad);
        var opcionesAbajo = todasLasOpc.slice(mitad);

        var bloquesDatos = [
          { titulo: "Primer cuadro gris (Izquierda)", opciones: opcionesArriba, parte: "izquierda" },
          { titulo: "Segundo cuadro gris (Derecha)", opciones: opcionesAbajo, parte: "derecha" }
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

          bloque.opciones.forEach(function (op, index) {
            var label = document.createElement("label");
            label.className = "tarjeta-opcion-bloque";

            var input = document.createElement("input");
            input.type = "radio";
            input.name = "reactivo_" + item.numeroReactivo + "_grupo_" + bloque.parte;
            input.id = "radio_" + item.numeroReactivo + "_" + bloque.parte + "_" + index;
            input.value = op.opcion;

            label.htmlFor = input.id;

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
          opcionesBloques.appendChild(tarjetaSub);
        });

      } else {
        var tarjetaNorm = document.createElement("div");
        tarjetaNorm.className = "bloque-subseccion";
        var contenedorFila = document.createElement("div");
        contenedorFila.className = "opciones-grid-bloques";

        todasLasOpc.forEach(function (op, index) {
          var label = document.createElement("label");
          label.className = "tarjeta-opcion-bloque";

          var input = document.createElement("input");
          input.type = "radio";
          input.name = "radio_simple_" + principalSubitem.idPreguntaTest;
          input.id = "radio_simple_" + principalSubitem.idPreguntaTest + "_" + index;
          input.value = op.opcion;

          label.htmlFor = input.id;

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

          contenedorFila.appendChild(label);
        });

        tarjetaNorm.appendChild(contenedorFila);
        opcionesBloques.appendChild(tarjetaNorm);
      }
    }
  }

  // --- BOTÓN SIGUIENTE (VALIDACIÓN Y AVANCE BLINDADO) ---
  if (btnSiguiente) {
    btnSiguiente.addEventListener("click", function () {
      if (!listaPreguntasGlobal || listaPreguntasGlobal.length === 0) {
        alert("Las preguntas aún no se han cargado correctamente desde el servidor.");
        return;
      }

      var itemActual = listaPreguntasGlobal[indiceGlobal];
      if (!itemActual) return;

      if (itemActual.modulo === 'VOCABULARIO') {
        var sel = secVocabulario.querySelector("input[name='resp_vocabulario']:checked");
        if (!sel) { alert("Selecciona una respuesta"); return; }
        respuestasGlobales[indiceGlobal] = sel.value;

      } else if (itemActual.modulo === 'ABSTRACCION') {
        var val = document.getElementById("input-respuesta").value.trim();
        if (val === "") { alert("Escribe tu respuesta"); return; }
        respuestasGlobales[indiceGlobal] = val;

      } else if (itemActual.modulo === 'BLOQUE') {
        var respuestasBloqueActual = {};
        var opcionesContenedor = document.getElementById("opciones-bloques") || document.getElementById("opciones");

        var esDoble = itemActual.numeroReactivo >= 70 || (itemActual.respuestasAsociadas && itemActual.respuestasAsociadas.length >= 8);

        if (esDoble) {
          var sel1 = opcionesContenedor.querySelector("input[name='reactivo_" + itemActual.numeroReactivo + "_grupo_izquierda']:checked");
          var sel2 = opcionesContenedor.querySelector("input[name='reactivo_" + itemActual.numeroReactivo + "_grupo_derecha']:checked");

          if (!sel1 || !sel2) {
            alert("Por favor, selecciona una respuesta para cada cuadro gris antes de continuar.");
            return;
          }

          respuestasBloqueActual["sub_0"] = sel1.value;
          respuestasBloqueActual["sub_1"] = sel2.value;
        } else {
          var subitem = itemActual.subitems[0];
          var seleccionada = opcionesContenedor.querySelector("input[name='radio_simple_" + subitem.idPreguntaTest + "']:checked");

          if (!seleccionada) {
            alert("Por favor, selecciona una respuesta antes de continuar.");
            return;
          }

          respuestasBloqueActual["sub_0"] = seleccionada.value;
        }

        respuestasGlobales[indiceGlobal] = respuestasBloqueActual;
      }

      indiceGlobal++;
      pintarPreguntaActual();
    });
  }

  function finalizarBateria() {
    if (instrucciones) instrucciones.hidden = true;
    if (secVocabulario) secVocabulario.style.display = "none";
    if (secAbstraccion) secAbstraccion.style.display = "none";
    if (secBloques) secBloques.style.display = "none";
    if (btnSiguiente) btnSiguiente.hidden = true;
    if (cierre) cierre.hidden = false;
    sessionStorage.setItem("shyplay_bateria_completada", "true");
  }

  // --- FUNCIÓN ASÍNCRONA PARA CARGAR DESDE LA BD ---
  async function cargarCombinacionYArrancar() {
    try {
      var sesion = JSON.parse(sessionStorage.getItem("shyplay_sesion") || "{}");
      var idCandidato = sesion.idCandidato || 1;

      const response = await fetch(`https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/combinacion-activa?id_candidato=${idCandidato}`);
      const data = await response.json();

      if (data.encontrado && data.combinacion) {
        combinacionActiva = data.combinacion.trim().toUpperCase();
        sessionStorage.setItem("shyplay_bateria_combinacion", combinacionActiva);
      }
    } catch (e) {
      console.error("Usando respaldo del navegador:", e);
      combinacionActiva = (sessionStorage.getItem("shyplay_bateria_combinacion") || "BC").trim().toUpperCase();
    }

    console.log("-> Combinación oficial obtenida desde la BD:", combinacionActiva);

    // Arrancamos la batería con la combinación obtenida
    inicializarBateria();
  }

  // Iniciar flujo consultando al servidor
  cargarCombinacionYArrancar();
});