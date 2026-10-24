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
      .then(function (data) {
        mostrarLoading(false); // Oculta el spinner al recibir respuesta

        if (data.status === "success") {
          // Verificar si el candidato ya está bloqueado / finalizado
          if (data.bloqueado) {
            error.hidden = false;
            error.textContent = data.mensaje || "Autorización denegada. Un administrador se pondrá en contacto contigo.";
            return;
          }

          // Guardar sesión activa
          sessionStorage.setItem("shyplay_sesion", JSON.stringify({
            idUsuario: data.idUsuario,
            idCandidato: data.idCandidato || data.idUsuario,
            idRol: data.idRol,
            usuario: usuario,
            mensaje: data.mensaje,
            bloqueado: false
          }));

          // Redirección según rol
          if (data.idRol === 1) {
            window.location.href = "evaluador.html";
          } else {
            window.location.href = "inicio.html";
          }

        } else {
          error.hidden = false;
          error.textContent = data.mensaje || "Usuario o contraseña incorrectos.";
        }
      })
      .catch(function (err) {
        mostrarLoading(false); // Oculta el spinner en caso de error de red
        console.error("Error al conectar con el backend:", err);
        error.hidden = false;
        error.textContent = "No se pudo conectar con el servidor. Intenta nuevamente.";
      });
    });
  }
})();