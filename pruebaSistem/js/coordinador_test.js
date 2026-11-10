document.addEventListener("DOMContentLoaded", function () {
  //SEGURIDAD: Verificar secion activa
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

  var combinacionActiva = "AC"; // Valor por defecto temporal

  function mostrarCargando(mostrar) {
    if (modalCargando) {
      modalCargando.style.display = mostrar ? "flex" : "none";
    }
  }

  // CARGA DINAMICA DE CANDIDATO Y COMBINACION de test
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

      // Consultar la combinacion activa en la BD
            const response = await fetch(`https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/combinacion-activa?id_candidato=${idCandidatoReal}`);

            if (response.ok) {
              const data = await response.json();
              console.log("Datos de combinación activa recibidos:", data);

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

            // Configurar llaves unicas por EVALUACIÓN
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
          } finally {
            // APAGAR EL SPINNER SIEMPRE (Ocurra éxito o error)
            mostrarCargando(false);
          }

          if (combinacionActiva.includes("AB") || combinacionActiva.includes("A+B")) {
              combinacionActiva = "AB";
            } else {
              combinacionActiva = "AC";
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
              fetch("https://sistema-psicometrico-back-7.onrender.com/api/preguntas_vocabulario").then(r => r.json()),
              fetch("https://sistema-psicometrico-back-7.onrender.com/api/respuestas_vocabulario").then(r => r.json()),
              fetch("https://sistema-psicometrico-back-7.onrender.com/api/preguntas_bloque").then(r => r.json()),
              fetch("https://sistema-psicometrico-back-7.onrender.com/api/respuestas_bloque").then(r => r.json())
            ]).then(([pregVoc, respVoc, pregBloq, respBloq]) => {
              var bloquesProcesados = pregBloq.map(p => {
                var respuestas = respBloq.filter(r => r.idPreguntaTest === p.idPreguntaTest);
                return { ...p, modulo: 'BLOQUE', subitems: [p], respuestasAsociadas: respuestas };
              });

              formatarYArrancar([
                ...pregVoc.map(p => ({
                  ...p,
                  modulo: 'VOCABULARIO',
                  respuestasAsociadas: respVoc.filter(r => r.idPreguntaTest === p.idPreguntaTest)
                })),
                ...bloquesProcesados
              ]);
            }).catch(err => {
              console.error("Error cargando A+C:", err);
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
        var letrasOpciones = { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E", "6": "F" };

        // Cada cuadro gris tiene exactamente 6 opciones (A-F)
        var tamanoGrupo = 6;
        var cantidadCuadros = Math.max(1, Math.ceil(todasLasOpc.length / tamanoGrupo));

        // Generar en dinamico cada subseccion segun los cuadros que tenga la pregunta
        for (var i = 0; i < cantidadCuadros; i++) {
            var inicio = i * tamanoGrupo;
            var fin = inicio + tamanoGrupo;
            var opcionesCuadro = todasLasOpc.slice(inicio, fin);

            var subKey = "sub_" + i;
            var tituloTexto = "Cuadro gris " + (i + 1);
            if (cantidadCuadros === 2) {
                tituloTexto = i === 0 ? "Primer cuadro gris (Izquierda)" : "Segundo cuadro gris (Derecha)";
            }

            var tarjetaSub = document.createElement("div");
            tarjetaSub.className = "bloque-subseccion";

            var tituloSub = document.createElement("div");
            tituloSub.className = "bloque-subseccion-titulo";
            tituloSub.textContent = tituloTexto;
            tarjetaSub.appendChild(tituloSub);

            var filaOpciones = document.createElement("div");
            filaOpciones.className = "opciones-grid-bloques";

            opcionesCuadro.forEach(function (op, index) {
                var label = document.createElement("label");
                label.className = "tarjeta-opcion-bloque";

                var input = document.createElement("input");
                input.type = "radio";
                // Nombre único por cada cuadro/subparte de esta pregunta
                input.name = "reactivo_" + item.numeroReactivo + "_grupo_" + i;
                input.id = "radio_" + item.numeroReactivo + "_" + i + "_" + index;
                input.value = op.opcion;

                if (respuestaPrevia[subKey] === String(op.opcion)) {
                    input.checked = true;
                }

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

            }
        }
    }

  //BOTON SIGUIENTE
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
              var todasLasOpc = itemActual.respuestasAsociadas || [];

              var tamanoGrupo = 6;
              var cantidadCuadros = Math.max(1, Math.ceil(todasLasOpc.length / tamanoGrupo));
              var faltanSelecciones = false;

              // Recorrer dinámicamente cada cuadro gris esperado
              for (var i = 0; i < cantidadCuadros; i++) {
                var sel = opcionesContenedor.querySelector("input[name='reactivo_" + itemActual.numeroReactivo + "_grupo_" + i + "']:checked");
                if (!sel) {
                  faltanSelecciones = true;
                  break;
                }
                respuestasBloqueActual["sub_" + i] = sel.value;
              }

              if (faltanSelecciones) {
                alert("Por favor, selecciona una respuesta para cada uno de los " + cantidadCuadros + " cuadros grises.");
                return;
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