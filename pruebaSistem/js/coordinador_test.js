document.addEventListener("DOMContentLoaded", function () {
  // 1. SEGURIDAD: Verificar sesión activa
  var sesionStr = sessionStorage.getItem("shyplay_sesion") || localStorage.getItem("shyplay_sesion");
  if (!sesionStr) {
    alert("Acceso denegado. Debes iniciar sesión primero.");
    window.location.href = "login.html";
    return;
  }

  var sesion = JSON.parse(sesionStr);
  if (sesion.bloqueado) {
    alert(sesion.mensaje || "Tu etapa ha terminado, un administrador se pondrá en contacto contigo hasta tu siguiente fase.");
    sessionStorage.clear();
    localStorage.removeItem("shyplay_sesion");
    window.location.href = "login.html";
    return;
  }

  // Identificador dinámico de sesión
  var idCandidatoReal = null;
  var idEvaluacionActiva = null;
  var CLAVE_INDICE = "";
  var CLAVE_RESPUESTAS = "";

  var listaPreguntasGlobal = [];
  var respuestasGlobales = {};
  var cronometroIniciado = false;

  // Elementos del DOM
  var secVocabulario = document.getElementById("seccion-vocabulario");
  var secAbstraccion = document.getElementById("seccion-abstraccion");
  var secBloques = document.getElementById("seccion-bloques");
  var btnSiguiente = document.getElementById("btn-siguiente");
  var cierre = document.getElementById("cierre");
  var instrucciones = document.getElementById("instrucciones");
  var modalCargando = document.getElementById("modal-cargando");

  var combinacionActiva = "BC"; // Valor por defecto temporal

  function mostrarCargando(mostrar) {
    if (modalCargando) {
      modalCargando.style.display = mostrar ? "flex" : "none";
    }
  }

  // --- CARGA DINÁMICA DE CANDIDATO Y COMBINACIÓN ---
  async function cargarCombinacionYArrancar() {
    mostrarCargando(true);

    try {
      var correoCandidato = sesion.usuario || sesion.correo;
      if (!correoCandidato) throw new Error("Correo de sesión no encontrado.");

      // Obtener el ID de candidato real asociado a este correo
      const resBusqueda = await fetch(`https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/buscar?correo=${encodeURIComponent(correoCandidato)}`);
      const dataBusqueda = await resBusqueda.json();

      if (dataBusqueda.encontrado && dataBusqueda.id_candidato) {
        idCandidatoReal = dataBusqueda.id_candidato;
      } else {
        idCandidatoReal = sesion.idCandidato || sesion.idUsuario || 1;
      }

      // Pintar nombre e ID real en la barra superior
      var contadorGlobal = document.getElementById("aspirante-nombre");
      if (contadorGlobal) {
        contadorGlobal.textContent = (dataBusqueda.nombre ? (dataBusqueda.nombre + " " + dataBusqueda.apellido) : (sesion.usuario || "Aspirante")) + " (ID: " + idCandidatoReal + ")";
      }

      // Consultar la combinación activa en la BD
      const response = await fetch(`https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/combinacion-activa?id_candidato=${idCandidatoReal}`);

      if (response.ok) {
        const data = await response.json();
        console.log("Datos de combinación activa recibidos:", data); // <-- Útil para depurar en F12

        if (data.encontrado && data.combinacion) {
          combinacionActiva = data.combinacion.trim().toUpperCase();

          // Capturar el ID de evaluación exacto devuelto por el backend
          if (data.id_evaluacion) {
            idEvaluacionActiva = data.id_evaluacion;
          } else if (data.idEvaluacion) {
            idEvaluacionActiva = data.idEvaluacion;
          }
        }
      }

      // Fallback de seguridad estricto
      if (!idEvaluacionActiva) {
        console.warn("No se encontró id_evaluacion en la respuesta, usando idCandidatoReal como respaldo.");
        idEvaluacionActiva = idCandidatoReal;
      }

      // Configurar llaves ÚNICAS por EVALUACIÓN
      CLAVE_INDICE = "shyplay_bateria_indice_eval_" + idEvaluacionActiva;
      CLAVE_RESPUESTAS = "shyplay_respuestas_parciales_eval_" + idEvaluacionActiva;
      window.CLAVE_TIEMPO_EVAL = "shyplay_bateria_tiempo_eval_" + idEvaluacionActiva;

      // Cargar progreso previo de esta evaluación específica
      window.indiceGlobal = parseInt(localStorage.getItem(CLAVE_INDICE) || "0", 10);
      respuestasGlobales = JSON.parse(localStorage.getItem(CLAVE_RESPUESTAS) || "{}");

    } catch (e) {
      console.error("Error al sincronizar con el servidor:", e);
      idCandidatoReal = sesion.idCandidato || 1;
      idEvaluacionActiva = idCandidatoReal;

      CLAVE_INDICE = "shyplay_bateria_indice_eval_" + idCandidatoReal;
      CLAVE_RESPUESTAS = "shyplay_respuestas_parciales_eval_" + idCandidatoReal;
      window.CLAVE_TIEMPO_EVAL = "shyplay_bateria_tiempo_eval_" + idCandidatoReal;

      window.indiceGlobal = parseInt(localStorage.getItem(CLAVE_INDICE) || "0", 10);
      respuestasGlobales = JSON.parse(localStorage.getItem(CLAVE_RESPUESTAS) || "{}");
    }

    if (combinacionActiva.includes("AB") || combinacionActiva.includes("A")) {
      combinacionActiva = "AB";
    } else {
      combinacionActiva = "BC";
    }

    console.log("-> ID Candidato Real:", idCandidatoReal, "| ID Evaluacion Activa:", idEvaluacionActiva, "| Combinación Definitiva:", combinacionActiva);
    inicializarBateria();
  }

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
      }).catch(err => {
        console.error("Error cargando A+B:", err);
        mostrarCargando(false);
        alert("Error al cargar las preguntas del test. Intenta de nuevo.");
      });
    } else {
      Promise.all([
        fetch("https://sistema-psicometrico-back-7.onrender.com/api/preguntas_abstraccion").then(r => r.json()),
        fetch("https://sistema-psicometrico-back-7.onrender.com/api/preguntas_bloque").then(r => r.json()),
        fetch("https://sistema-psicometrico-back-7.onrender.com/api/respuestas_bloque").then(r => r.json())
      ]).then(([pregAbs, pregBloq, respBloq]) => {
        var bloquesProcesados = pregBloq.map(p => {
          var respuestas = respBloq.filter(r => r.idPreguntaTest === p.idPreguntaTest);
          return { ...p, modulo: 'BLOQUE', subitems: [p], respuestasAsociadas: respuestas };
        });

        formatarYArrancar([
          ...pregAbs.map(p => ({ ...p, modulo: 'ABSTRACCION' })),
          ...bloquesProcesados
        ]);
      }).catch(err => {
        console.error("Error cargando B+C:", err);
        mostrarCargando(false);
        alert("Error al cargar las preguntas del test. Intenta de nuevo.");
      });
    }
  }

  function formatarYArrancar(preguntasUnificadas) {
    listaPreguntasGlobal = preguntasUnificadas;
    mostrarCargando(false); // Oculta el spinner garantizado

    if (window.indiceGlobal >= listaPreguntasGlobal.length && listaPreguntasGlobal.length > 0) {
      window.indiceGlobal = listaPreguntasGlobal.length - 1;
    }

    pintarPreguntaActual();

    if (!cronometroIniciado && typeof window.iniciarCronometroGlobal === "function") {
      cronometroIniciado = true;
      window.iniciarCronometroGlobal(1500);
    }
  }

  function pintarPreguntaActual() {
    if (window.indiceGlobal >= listaPreguntasGlobal.length && listaPreguntasGlobal.length > 0) {
      window.finalizarBateria();
      return;
    }

    localStorage.setItem(CLAVE_INDICE, window.indiceGlobal);
    var itemActual = listaPreguntasGlobal[window.indiceGlobal];
    if (!itemActual) return;

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

  function renderVocabulario(item) {
    var enunciado = document.getElementById("enunciado");
    var opciones = document.getElementById("opciones");

    if (enunciado) enunciado.textContent = (window.indiceGlobal + 1) + ". " + item.pregunta;
    if (opciones) {
      opciones.innerHTML = "";
      var respuestaPrevia = respuestasGlobales[window.indiceGlobal];

      item.respuestasAsociadas.forEach(op => {
        var label = document.createElement("label");
        label.className = "opcion";
        var checked = (respuestaPrevia === op.respuesta) ? "checked" : "";
        label.innerHTML = `<input type="radio" name="resp_vocabulario" value="${op.respuesta}" ${checked}> ${op.respuesta}`;
        opciones.appendChild(label);
      });
    }
  }

  function renderAbstraccion(item) {
    var enunciadoSerie = document.getElementById("enunciado-serie");
    var inputRespuesta = document.getElementById("input-respuesta");

    if (enunciadoSerie) enunciadoSerie.textContent = (window.indiceGlobal + 1) + ". " + item.pregunta;
    if (inputRespuesta) {
      inputRespuesta.value = respuestasGlobales[window.indiceGlobal] || "";
      inputRespuesta.focus();
    }
  }

  function renderBloque(item) {
    var contenedorPregunta = document.getElementById("contenedor-pregunta");
    var opcionesBloques = document.getElementById("opciones-bloques") || document.getElementById("opciones");

    var principalSubitem = item.subitems[0];
    var respuestaPrevia = respuestasGlobales[window.indiceGlobal] || {};

    if (contenedorPregunta) {
      contenedorPregunta.innerHTML = `
        <h3 style="margin-bottom: 15px; color: #0c74a0;">${(window.indiceGlobal + 1)}. Selecciona la opción correcta</h3>
        <img class="imagen-patron-bloque" src="data:image/png;base64,${principalSubitem.pregunta}" alt="Reactivo ${item.numeroReactivo}">
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

      if (esDoble) {
        var mitad = Math.ceil(todasLasOpc.length / 2);
        var bloquesDatos = [
          { titulo: "Primer cuadro gris (Izquierda)", opciones: todasLasOpc.slice(0, mitad), parte: "izquierda", subKey: "sub_0" },
          { titulo: "Segundo cuadro gris (Derecha)", opciones: todasLasOpc.slice(mitad), parte: "derecha", subKey: "sub_1" }
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
            if (respuestaPrevia[bloque.subKey] === String(op.opcion)) input.checked = true;

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
          if (respuestaPrevia["sub_0"] === String(op.opcion)) input.checked = true;

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

  // BOTÓN SIGUIENTE
  if (btnSiguiente) {
    btnSiguiente.addEventListener("click", function () {
      if (!listaPreguntasGlobal || listaPreguntasGlobal.length === 0) return;

      var itemActual = listaPreguntasGlobal[window.indiceGlobal];
      if (!itemActual) return;

      if (itemActual.modulo === 'VOCABULARIO') {
        var sel = secVocabulario.querySelector("input[name='resp_vocabulario']:checked");
        if (!sel) { alert("Selecciona una respuesta"); return; }
        respuestasGlobales[window.indiceGlobal] = sel.value;

      } else if (itemActual.modulo === 'ABSTRACCION') {
        var val = document.getElementById("input-respuesta").value.trim();
        if (val === "") { alert("Escribe tu respuesta"); return; }
        respuestasGlobales[window.indiceGlobal] = val;

      } else if (itemActual.modulo === 'BLOQUE') {
        var respuestasBloqueActual = {};
        var opcionesContenedor = document.getElementById("opciones-bloques") || document.getElementById("opciones");
        var esDoble = itemActual.numeroReactivo >= 70 || (itemActual.respuestasAsociadas && itemActual.respuestasAsociadas.length >= 8);

        if (esDoble) {
          var sel1 = opcionesContenedor.querySelector("input[name='reactivo_" + itemActual.numeroReactivo + "_grupo_izquierda']:checked");
          var sel2 = opcionesContenedor.querySelector("input[name='reactivo_" + itemActual.numeroReactivo + "_grupo_derecha']:checked");

          if (!sel1 || !sel2) {
            alert("Selecciona una respuesta para cada cuadro gris.");
            return;
          }
          respuestasBloqueActual["sub_0"] = sel1.value;
          respuestasBloqueActual["sub_1"] = sel2.value;
        } else {
          var subitem = itemActual.subitems[0];
          var seleccionada = opcionesContenedor.querySelector("input[name='radio_simple_" + subitem.idPreguntaTest + "']:checked");

          if (!seleccionada) {
            alert("Selecciona una respuesta.");
            return;
          }
          respuestasBloqueActual["sub_0"] = seleccionada.value;
        }
        respuestasGlobales[window.indiceGlobal] = respuestasBloqueActual;
      }

      localStorage.setItem(CLAVE_RESPUESTAS, JSON.stringify(respuestasGlobales));
      window.indiceGlobal++;
      pintarPreguntaActual();
    });
  }

  // --- FINALIZAR Y BLOQUEAR ---
  window.finalizarBateria = async function() {
      if (instrucciones) instrucciones.hidden = true;
      if (secVocabulario) secVocabulario.style.display = "none";
      if (secAbstraccion) secAbstraccion.style.display = "none";
      if (secBloques) secBloques.style.display = "none";
      if (btnSiguiente) btnSiguiente.hidden = true;
      if (cierre) cierre.hidden = false;

      var respuestasPlanas = [];
      listaPreguntasGlobal.forEach((item, index) => {
        var resp = respuestasGlobales[index];
        if (resp !== undefined && resp !== null && resp !== "") {
          if (typeof resp === 'object') {
            Object.keys(resp).forEach(subKey => {
              respuestasPlanas.push({
                idPreguntaTest: parseInt(item.idPreguntaTest),
                subParte: subKey,
                respuestaSeleccionada: String(resp[subKey])
              });
            });
          } else {
            respuestasPlanas.push({
              idPreguntaTest: parseInt(item.idPreguntaTest),
              subParte: "",
              respuestaSeleccionada: String(resp)
            });
          }
        }
      });

      try {
        console.log("Enviando respuestas con idEvaluacion:", idEvaluacionActiva);

        const res = await fetch("https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/guardar-respuestas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idEvaluacion: parseInt(idEvaluacionActiva),
            respuestas: respuestasPlanas
          })
        });

        const dataRes = await res.json();
        console.log("Respuesta del servidor al guardar:", dataRes);
      } catch (err) {
        console.error("Error al enviar respuestas:", err);
      }

      // Bloquear sesión permanentemente
      sesion.bloqueado = true;
      sesion.mensaje = "Tu etapa ha terminado, un administrador se pondrá en contacto contigo hasta tu siguiente fase.";
      sessionStorage.setItem("shyplay_sesion", JSON.stringify(sesion));
      localStorage.setItem("shyplay_sesion", JSON.stringify(sesion));

      // Limpiar avance temporal de esta evaluación específica
      localStorage.removeItem(CLAVE_INDICE);
      localStorage.removeItem(CLAVE_RESPUESTAS);
      localStorage.removeItem(window.CLAVE_TIEMPO_EVAL);

      alert("¡Prueba finalizada con éxito! Tus respuestas han sido guardadas.");
      window.location.href = "login.html";
    };

  cargarCombinacionYArrancar();
});