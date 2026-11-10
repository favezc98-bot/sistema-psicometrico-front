// 1. Buscar candidato y mostrar su historial con sus resultados integrados
document.getElementById('btn-buscar-candidato').addEventListener('click', () => {
  const correo = document.getElementById('input-correo').value.trim();
  if (!correo) {
    alert("Por favor ingresa un correo electrónico.");
    return;
  }

  // 1. MOSTRAR EL SPINNER AQUÍ
  document.getElementById('modal-cargando-login').style.display = 'flex';

  fetch(`https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/buscar_candidato?correo=${encodeURIComponent(correo)}`)
    .then(res => res.json())
    .then(data => {
      if (!data.encontrado) {
        alert("No se encontró ningún candidato con ese correo.");
        document.getElementById('panel-historial').style.display = 'none';
        return;
      }

      const candidato = data.resultado;

      document.getElementById('candidato-titulo-info').textContent = `Historial de: ${candidato.nombre} ${candidato.apellido}`;
      document.getElementById('candidato-correo-info').textContent = `Correo: ${candidato.correo}`;

      const listaDiv = document.getElementById('lista-evaluaciones');
      listaDiv.innerHTML = '';

      if (!candidato.historial || candidato.historial.length === 0) {
        listaDiv.innerHTML = '<p style="color: #666;">Este candidato no tiene evaluaciones registradas.</p>';
      } else {
        candidato.historial.forEach(ev => {
          const item = document.createElement('div');
          item.className = 'item-historial';
          item.innerHTML = `
            <div>
              <strong>Evaluación #${ev.idEvaluacion}</strong> — Batería: <strong>${ev.combinacion}</strong>
              <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">Fecha: ${ev.fechaEvaluacion} | Estado: <span style="color: #0c74a0; font-weight: 650;">${ev.estado}</span></p>
            </div>
            <button class="btn-ver-reporte" onclick="cargarReporte(${ev.idEvaluacion})">Ver Reporte</button>
          `;
          listaDiv.appendChild(item);
        });
      }

      document.getElementById('panel-historial').style.display = 'block';
      document.getElementById('panel-reporte').style.display = 'none';
    })
    .catch(err => {
      console.error("Error:", err);
      alert("Error al conectar con el servidor.");
    })
    .finally(() => {
      // 2. OCULTAR EL SPINNER AL TERMINAR (ÉXITO O ERROR)
      document.getElementById('modal-cargando-login').style.display = 'none';
    });
});

// Cargar reporte detallado de una evaluación específica con su spinner
function cargarReporte(idEval) {
  //MOSTRAR EL SPINNER AL HACER CLIC EN "VER REPORTE"
  document.getElementById('modal-cargando-login').style.display = 'flex';

  fetch(`https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/consultar_puntuacion?id_evaluacion=${idEval}`)
    .then(res => res.json())
    .then(data => {
      if (!data.encontrado) {
        alert("No se pudo cargar el reporte.");
        return;
      }

      const resEval = data.resultado;

      document.getElementById('lbl-nombre-candidato').textContent = `${resEval.nombre || ''} ${resEval.apellido || ''}`.trim();
      document.getElementById('lbl-edad').textContent = resEval.edadEvaluado;
      document.getElementById('lbl-id-eval').textContent = resEval.idEvaluacion;
      document.getElementById('lbl-combinacion').textContent = `Batería: ${resEval.combinacion}`;

      const gridPruebas = document.getElementById('grid-pruebas-dinamico');
      gridPruebas.innerHTML = '';

      resEval.pruebas.forEach(prueba => {
        const card = document.createElement('div');
        card.className = 'card-prueba';
        card.innerHTML = `
          <h3>${prueba.nombre}</h3>
          <table class="tabla-metricas">
            <tr><th>Puntuación Natural:</th><td>${prueba.puntuacionNatural}</td></tr>
            <tr><th>Puntuación Estándar:</th><td>${prueba.puntuacionEstandar ?? '--'}</td></tr>
            <tr><th>Percentil:</th><td>${prueba.percentil ?? '--'}</td></tr>
            <tr><th>Puntuación T:</th><td>${prueba.puntuacionT ?? '--'}</td></tr>
          </table>
        `;
        gridPruebas.appendChild(card);
      });

      const comb = resEval.resultadoCombinado;
      document.getElementById('lbl-suma-estandar').textContent = comb.sumaPuntuacionesEstandar;
      document.getElementById('lbl-categoria-comb').textContent = comb.categoria;

      const estandCombTexto = comb.puntuacionEstandar !== null ? comb.puntuacionEstandar : '--';
      const percentilTexto = comb.percentil !== null ? comb.percentil : '--';
      document.getElementById('lbl-combinado-valores').textContent = `${estandCombTexto} / ${percentilTexto}`;

      document.getElementById('panel-reporte').style.display = 'block';
      document.getElementById('panel-historial').style.display = 'none';
    })
    .catch(err => {
      console.error("Error al cargar reporte:", err);
      alert("Error al obtener los detalles de la evaluación.");
    })
    .finally(() => {
      //OCULTAR EL SPINNER CUANDO TERMINE DE CARGAR (EXITO O ERROR)
      document.getElementById('modal-cargando-login').style.display = 'none';
    });
}

// Botón para regresar al listado del historial
document.getElementById('btn-volver-historial').addEventListener('click', () => {
  document.getElementById('panel-reporte').style.display = 'none';
  document.getElementById('panel-historial').style.display = 'block';
});