document.addEventListener("DOMContentLoaded", function () {
  const modalRegistro = document.getElementById("modal-registro-candidato");
  const btnAbrir = document.getElementById("btn-abrir-modal-registro");
  const btnCerrar = document.getElementById("btn-cerrar-modal");
  const btnCancelar = document.getElementById("btn-cancelar-modal");
  const formRegistro = document.getElementById("form-registrar-candidato");

  // Validaciones de seguridad para detectar si falta algún ID en el HTML
  if (!modalRegistro) console.warn("Advertencia: No se encontró el elemento #modal-registro-candidato");
  if (!btnAbrir) console.warn("Advertencia: No se encontró el botón #btn-abrir-modal-registro");

  // Abrir modal
  if (btnAbrir && modalRegistro) {
    btnAbrir.addEventListener("click", function () {
      modalRegistro.style.display = "flex";
    });
  }

  // Cerrar modal (con la X o Cancelar)
  function cerrarModal() {
    if (modalRegistro) modalRegistro.style.display = "none";
    if (formRegistro) formRegistro.reset();
  }

  if (btnCerrar) btnCerrar.addEventListener("click", cerrarModal);
  if (btnCancelar) btnCancelar.addEventListener("click", cerrarModal);

  // Cerrar haciendo clic fuera del contenido del modal
  window.addEventListener("click", function (event) {
    if (modalRegistro && event.target === modalRegistro) {
      cerrarModal();
    }
  });

  // Capturar el envío del formulario y enviarlo al Backend vía Fetch POST
  if (formRegistro) {
    formRegistro.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Construir el objeto JSON con todos los campos requeridos por el backend
      const nuevoCandidato = {
        nombre: document.getElementById("reg-nombre").value,
        apellido: document.getElementById("reg-apellido").value,
        correo: document.getElementById("reg-correo").value,
        telefono: document.getElementById("reg-telefono").value,
        password: document.getElementById("reg-password").value,
        domicilio: document.getElementById("reg-domicilio").value,
        fecha_nacimiento: document.getElementById("reg-fecha-nacimiento").value
      };

      try {
        const response = await fetch("https://sistema-psicometrico-back-7.onrender.com/api/evaluacion/registro_candidato", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(nuevoCandidato)
        });

        const resultado = await response.json();

        if (response.ok && resultado.exito) {
          alert(resultado.mensaje || "Candidato registrado correctamente en el sistema");
          cerrarModal();
        } else {
          alert("Error al registrar: " + (resultado.mensaje || resultado.error || "No se pudo completar la operación"));
        }

      } catch (error) {
        console.error("Error de red o conexión con el servidor:", error);
        alert("Ocurrió un error al conectar con el servidor backend.");
      }
    });
  }
});