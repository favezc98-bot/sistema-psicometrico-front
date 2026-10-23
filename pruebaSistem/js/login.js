(function () {
  var formulario = document.getElementById("form-login");
  var error = document.getElementById("login-error");

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();

    //Obtener valores de los campos del formulario
    var usuario = document.getElementById("usuario").value.trim();
    var contrasena = document.getElementById("contrasena").value;

    //Validar campos vacíos en el cliente
    if (!usuario || !contrasena) {
      error.hidden = false;
      error.textContent = "Ingresa usuario y contraseña.";
      return;
    }

    error.hidden = true;

    //Preparar los datos tal como los espera tu backend en Java (correo y password)
    var datosLogin = {
      correo: usuario,
      password: contrasena
    };

    //Consumir el endpoint backend con fetch
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
      //Evaluar la respuesta del backend {"status": "success", "mensaje": "Acceso concedido"}
      if (data.status === "success") {
              // Guardamos la sesión activa incluyendo el idUsuario y el idRol
              sessionStorage.setItem("shyplay_sesion", JSON.stringify({
                idUsuario: data.idUsuario,
                idRol: data.idRol,
                usuario: usuario,
                mensaje: data.mensaje
              }));

              // Redirigir según el rol
              if (data.idRol === 1) {
                // Es EVALUADOR -> Mandarlo al panel de control del evaluador
                window.location.href = "evaluador.html";
              } else {
                // Es CANDIDATO/USUARIO -> Mandarlo a la pantalla de inicio del test
                window.location.href = "inicio.html";
              }

            } else {
              // Si las credenciales fueron incorrectas
              error.hidden = false;
              error.textContent = data.mensaje || "Usuario o contraseña incorrectos.";
            }
    })
    .catch(function (err) {
      // 6. Manejo de error si el servidor está apagado o hay problema de red/CORS
      console.error("Error al conectar con el backend:", err);
      error.hidden = false;
      error.textContent = "No se pudo conectar con el servidor. Revisa que el backend esté ejecutándose.";
    });
  });
})();
