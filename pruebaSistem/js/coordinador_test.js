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

  // Identificador único del candidato para persistencia en localStorage
  var idCandidato = sesion.idCandidato || sesion.idUsuario || "1";
  var CLAVE_INDICE = "shyplay_bateria_indice_" + idCandidato;
  var CLAVE_RESPUESTAS = "shyplay_respuestas_parciales_" + idCandidato;

  // Pintar nombre del aspirante en la barra superior
  var contadorGlobal = document.getElementById("aspirante-nombre");
  if (contadorGlobal) {
    contadorGlobal.textContent = (sesion.usuario || "Aspirante") + " (ID: " + idCandidato + ")";
  }

  // Cargar progreso desde localStorage (Recupera pregunta exacta)
  var indiceGlobal = parseInt(localStorage.getItem(CLAVE_INDICE) || "0", 10);
  var listaPreguntasGlobal = [];
  var respuestasGlobales = JSON.parse(localStorage.getItem(CLAVE_RESPUESTAS) || "{}");
  var cronometroIniciado = false;

  // Elementos del DOM
  var secVocabulario = document.getElementById("seccion-vocabulario");
  var secAbstraccion = document.getElementById("seccion-abstraccion");
  var secBloques = document.getElementById("seccion-bloques");
  var btnSiguiente = document.getElementById("btn-siguiente");
  var cierre = document.getElementById("cierre");
  var instrucciones = document.getElementById("instrucciones");
  var modalCargando = document.getElementById("modal-cargando");

  var combinacionActiva = (sessionStorage.getItem("shyplay_bateria_combinacion") || "BC").trim().toUpperCase();

  function mostrarCargando(mostrar) {
    if (modalCargando) {
      modalCargando.style.display = mostrar ? "flex" : "none";
    }
  }

  function inicializarBateria() {
    mostrarCargando(true);

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
        console.error("Error cargando batería A+B:", err);
        mostrarCargando(false);
      });

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
        mostrarCargando(false);
      });
    }
  }

  function formatarYArrancar(preguntasUnificadas) {
    listaPreguntasGlobal = preguntasUnificadas;
    mostrarCargando(false);

    // Ajustar si el índice guardado excede la lista
    if (indiceGlobal >= listaPreguntasGlobal.length && listaPreguntasGlobal.length > 0) {
      indiceGlobal = listaPreguntasGlobal.length - 1;
    }

    pintarPreguntaActual();

    // Arrancar cronómetro sólo cuando los datos ya se cargaron
    if (!cronometroIniciado && typeof window.iniciarCronometroGlobal === "function") {
      cronometroIniciado = true;
      window.iniciarCronometroGlobal(1500);
    }
  }

  function pintarPreguntaActual() {
    if (indiceGlobal >= listaPreguntasGlobal.length && listaPreguntasGlobal.length > 0) {
      finalizarBateria();
      return;
    }

    // Guardar avance continuo en localStorage
    localStorage.setItem(CLAVE_INDICE, indiceGlobal);
    var itemActual = listaPreguntasGlobal[indiceGlobal];
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

    if (enunciado) enunciado.textContent = (indiceGlobal + 1) + ". " + item.pregunta;
    if (opciones) {
      opciones.innerHTML = "";
      var respuestaPrevia = respuestasGlobales[indiceGlobal];

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

    if (enunciadoSerie) enunciadoSerie.textContent = (indiceGlobal + 1) + ". " + item.pregunta;
    if (inputRespuesta) {
      inputRespuesta.value = respuestasGlobales[indiceGlobal] || "";
      inputRespuesta.focus();
    }
  }

  function renderBloque(item) {
    var contenedorPregunta = document.getElementById("contenedor-pregunta");
    var opcionesBloques = document.getElementById("opciones-bloques") || document.getElementById("opciones");

    var principalSubitem = item.subitems[0];
    var respuestaPrevia = respuestasGlobales[indiceGlobal] || {};

    if (contenedorPregunta) {
      contenedorPregunta.innerHTML = `
        <h3 style="margin-bottom: 15px; color: #0c74a0;">${(indiceGlobal + 1)}. Selecciona la opción correcta</h3>
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

      if (esDoble) {
        var mitad = Math.ceil(todasLasOpc.length / 2);
        var opcionesArriba = todasLasOpc.slice(0, mitad);
        var opcionesAbajo = todasLasOpc.slice(mitad);

        var bloquesDatos = [
          { titulo: "Primer cuadro gris (Izquierda)", opciones: opcionesArriba, parte: "izquierda", subKey: "sub_0" },
          { titulo: "Segundo cuadro gris (Derecha)", opciones: opcionesAbajo, parte: "derecha", subKey: "sub_1" }
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
            if (respuestaPrevia[bloque.subKey] === op.opcion) input.checked = true;

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
          if (respuestaPrevia["sub_0"] === op.opcion) input.checked = true;

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

  // BOTÓN SIGUIENTE (Captura y Almacenamiento continuo)
  if (btnSiguiente) {
    btnSiguiente.addEventListener("click", function () {
      if (!listaPreguntasGlobal || listaPreguntasGlobal.length === 0) return;

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
        respuestasGlobales[indiceGlobal] = respuestasBloqueActual;
      }

      // Guardar respuestas parciales en localStorage
      localStorage.setItem(CLAVE_RESPUESTAS, JSON.stringify(respuestasGlobales));

      indiceGlobal++;
      pintarPreguntaActual();
    });
  }

  window.finalizarBateria = function() {
    if (instrucciones) instrucciones.hidden = true;
    if (secVocabulario) secVocabulario.style.display = "none";
    if (secAbstraccion) secAbstraccion.style.display = "none";
    if (secBloques) secBloques.style.display = "none";
    if (btnSiguiente) btnSiguiente.hidden = true;
    if (cierre) cierre.hidden = false;

    // Bloquear al candidato para evitar reingreso
    sesion.bloqueado = true;
    sesion.mensaje = "Tu etapa ha terminado, un administrador se pondrá en contacto contigo hasta tu siguiente fase.";
    sessionStorage.setItem("shyplay_sesion", JSON.stringify(sesion));
    localStorage.setItem("shyplay_sesion", JSON.stringify(sesion));

    // Limpiar claves temporales de avance de la evaluación
    localStorage.removeItem(CLAVE_INDICE);
    localStorage.removeItem(CLAVE_RESPUESTAS);
    localStorage.removeItem("shyplay_bateria_tiempo_" + idCandidato);

    console.log("Enviando respuestas finales al servidor...", respuestasGlobales);
  };

  // --- FUNCIÓN ASÍNCRONA CORREGIDA PARA OBTENER LA COMBINACIÓN OFICIAL ---
    // --- FUNCIÓN DINÁMICA: OBTIENE EL ID_CANDIDATO REAL Y SU COMBINACIÓN ---
      async function cargarCombinacionYArrancar() {
        mostrarCargando(true);

        try {
          //Obtener el correo del candidato desde la sesión actual
          var correoCandidato = sesion.usuario || sesion.correo;

          if (!correoCandidato) {
            throw new Error("No se encontró el correo del candidato en la sesión.");
          }

          console.log("-> Buscando ID de candidato en la BD para el correo:", correoCandidato);

          //Consultar la API de búsqueda para obtener el id_candidato real (ej. ID 1)
          const resBusqueda = await fetch(`https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/buscar?correo=${encodeURIComponent(correoCandidato)}`);
          const dataBusqueda = await resBusqueda.json();

          if (!dataBusqueda.encontrado || !dataBusqueda.id_candidato) {
            throw new Error("El candidato no está registrado en la tabla de candidatos.");
          }

          var idCandidatoReal = dataBusqueda.id_candidato;
          console.log("-> ¡ID de candidato real obtenido de la BD:", idCandidatoReal);

          // Actualizamos las llaves locales con el ID correcto
          var CLAVE_INDICE = "shyplay_bateria_indice_" + idCandidatoReal;
          var CLAVE_RESPUESTAS = "shyplay_respuestas_parciales_" + idCandidatoReal;

          //Consultar la combinación activa usando el id_candidato real
          console.log("-> Consultando combinación activa para id_candidato:", idCandidatoReal);
          const response = await fetch(`https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/combinacion-activa?id_candidato=${idCandidatoReal}`);

          if (response.ok) {
            const data = await response.json();
            console.log("-> Respuesta de combinación:", data);

            if (data.encontrado && data.combinacion) {
              combinacionActiva = data.combinacion.trim().toUpperCase();
              sessionStorage.setItem("shyplay_bateria_combinacion", combinacionActiva);
            }
          }

        } catch (e) {
          console.error("-> Error en el proceso dinámico:", e);
          combinacionActiva = (sessionStorage.getItem("shyplay_bateria_combinacion") || "BC").trim().toUpperCase();
        }

        // Normalizar combinación por seguridad
        if (combinacionActiva.includes("AB") || combinacionActiva.includes("A")) {
          combinacionActiva = "AB";
        } else {
          combinacionActiva = "BC";
        }

        console.log("-> COMBINACIÓN DEFINITIVA A EJECUTAR:", combinacionActiva);

        // Arrancar la batería con los datos correctos
        inicializarBateria();
      }
});