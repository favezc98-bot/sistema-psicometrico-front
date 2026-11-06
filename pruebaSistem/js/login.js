(function () {
  var formulario = document.getElementById("form-login");
  var error = document.getElementById("login-error");
  var modalCargando = document.getElementById("modal-cargando-login");

  function mostrarLoading(mostrar) {
    if (modalCargando) {
      modalCargando.style.display = mostrar ? "flex" : "none";
    }
  }

  if (formulario) {
    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault();

      // LIMPIEZA OBLIGATORIA: Borrar datos de sesiones previas
      sessionStorage.clear();
      localStorage.removeItem("shyplay_sesion");

      var usuario = document.getElementById("usuario").value.trim();
      var contrasena = document.getElementById("contrasena").value;

      if (!usuario || !contrasena) {
        error.hidden = false;
        error.textContent = "Ingresa usuario y contraseña.";
        return;
      }

      error.hidden = true;
      mostrarLoading(true); // Activa el spinner "Un momento"

      var datosLogin = {
        correo: usuario,
        password: contrasena
      };

      fetch("https://sistema-psicometrico-back-7.onrender.com/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(datosLogin)
      })
      .then(function (respuesta) {
        if (!respuesta.ok) {
          throw new Error("Error en la respuesta del servidor");
        }
        return respuesta.json();
      })
      .then(async function (data) {

        if (data.status === "success") {

          // Si es ROL EVALUADOR / ADMIN (idRol === 1), entra directo
          if (data.idRol === 1) {
            mostrarLoading(false);
            sessionStorage.setItem("shyplay_sesion", JSON.stringify({
              idUsuario: data.idUsuario,
              idRol: data.idRol,
              usuario: usuario
            }));
            window.location.href = "evaluador.html";
            return;
          }

          // --- SI ES CANDIDATO / ASPIRANTE ---
          try {
            // 1. Obtener el id_candidato real asociado a su correo
            const resBusqueda = await fetch(`https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/buscar?correo=${encodeURIComponent(usuario)}`);
            const dataBusqueda = await resBusqueda.json();

            var idCandidatoReal = (dataBusqueda.encontrado && dataBusqueda.id_candidato) ? dataBusqueda.id_candidato : (data.idCandidato || data.idUsuario);

            // 2. Consultar si tiene una combinación/prueba activa programada
            const resComb = await fetch(`https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/combinacion-activa?id_candidato=${idCandidatoReal}`);
            const dataComb = await resComb.json();

            mostrarLoading(false);

            // 3. Validar si tiene una prueba programada o si no se le ha asignado ninguna
            if (!dataComb.encontrado || !dataComb.combinacion) {
              error.hidden = false;
              error.textContent = "Tu etapa ha terminado o aún no tienes una evaluación asignada. Un administrador se pondrá en contacto contigo.";
              return; // Detiene el login
            }

            // Si pasa la validación y SÍ tiene prueba activa, se guarda la sesión y avanza
            sessionStorage.setItem("shyplay_sesion", JSON.stringify({
              idUsuario: data.idUsuario,
              idCandidato: idCandidatoReal,
              idRol: data.idRol,
              usuario: usuario,
              mensaje: data.mensaje,
              bloqueado: false
            }));

            window.location.href = "inicio.html";

          } catch (errValidacion) {
            mostrarLoading(false);
            console.error("Error validando combinación activa del candidato:", errValidacion);
            error.hidden = false;
            error.textContent = "Error al verificar tus evaluaciones. Intenta nuevamente.";
          }

        } else {
          mostrarLoading(false);
          error.hidden = false;
          error.textContent = data.mensaje || "Usuario o contraseña incorrectos.";
        }
      })
      .catch(function (err) {
        mostrarLoading(false);
        console.error("Error al conectar con el backend:", err);
        error.hidden = false;
        error.textContent = "No se pudo conectar con el servidor. Intenta nuevamente.";
      });
    });
  }
})();